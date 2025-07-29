import os
import re
import json
import csv
import time
import logging
import threading
from pathlib import Path
from typing import List, Dict, Optional

import requests
from xml.etree import ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed

# Constants for datastream URLs
BASE_URL = "https://gams.uni-graz.at"

# Delay between file downloads (seconds)
DOWNLOAD_DELAY = 0.5

class KMExtractor:
    """
    Extractor for the Hans Gross Kriminalmuseum archive.
    Parses SPARQL XML files (if provided) and/or uses GAMS context metadata to
    discover objects, downloads associated files, and saves organized metadata.
    """

    def __init__(self, output_dir: str, max_workers: int = 5, max_objects: Optional[int] = None):
        """Initialize the extractor.

        Args:
            output_dir (str): Top-level directory for the archive.
            max_workers (int): Number of threads for concurrent downloads.
            max_objects (Optional[int]): Optional limit on number of objects to process
                (useful for testing). If None, process all discovered objects.
        """
        self.output_dir = Path(output_dir)
        self.max_workers = max_workers
        self.max_objects = max_objects
        # Prepare directories
        self._prepare_directories()
        # Setup logging
        self._setup_logging()
        self.logger.info(f"KMExtractor initialized with output_dir={self.output_dir}, max_workers={self.max_workers}, max_objects={self.max_objects}")
        # Statistics counters
        self.stats = {
            'total_objects': 0,
            'karteikarten': 0,
            'objekte': 0,
            'rdf_success': 0,
            'tei_success': 0,
            'lido_success': 0,
            'image_success': 0,
        }
        # A lock for stats updates
        self._stats_lock = threading.Lock()

    def _prepare_directories(self):
        """Create the required folder structure."""
        # Create base directories
        for sub in [
            "metadata",
            "karteikarten/rdf",
            "karteikarten/tei",
            "karteikarten/images",
            "objekte/lido",
            "objekte/images",
            "logs",
        ]:
            (self.output_dir / sub).mkdir(parents=True, exist_ok=True)

    def _setup_logging(self):
        """Set up logging to a file in the logs directory."""
        log_file = self.output_dir / "logs" / "extraction.log"
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(message)s",
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger('KMExtractor')

    def parse_sparql_xml(self, xml_file: str) -> List[Dict]:
        """Parse a SPARQL XML results file to extract object metadata.

        The SPARQL result XML is expected to have <result> elements containing
        fields such as container, pid, model, title, identifier, createdDate, description.

        Args:
            xml_file (str): Path to the SPARQL XML file.

        Returns:
            List[Dict]: A list of object metadata dictionaries.
        """
        objects = []
        tree = ET.parse(xml_file)
        root = tree.getroot()
        # Namespace may be present; we'll ignore it by using tag endings
        for result in root.iter():
            if result.tag.endswith('result'):
                entry = {
                    'container': None,
                    'pid': None,
                    'model': None,
                    'title': None,
                    'identifier': None,
                    'createdDate': None,
                    'description': None
                }
                for child in result:
                    tag = child.tag.split('}')[-1]
                    text = child.text.strip() if child.text else None
                    if tag == 'container':
                        entry['container'] = text
                    elif tag == 'pid':
                        # pid may be stored in 'uri' attribute
                        entry['pid'] = child.attrib.get('uri', text)
                    elif tag == 'model':
                        entry['model'] = child.attrib.get('uri', text)
                    elif tag == 'title':
                        entry['title'] = text
                    elif tag == 'identifier':
                        entry['identifier'] = text
                    elif tag == 'createdDate':
                        entry['createdDate'] = text
                    elif tag == 'description':
                        entry['description'] = text
                objects.append(entry)
        return objects

    def _fetch_context_metadata(self, context: str) -> str:
        """Fetch the METADATA datastream for a given context.

        Args:
            context (str): Context name (e.g., 'karteikarten', 'objekte').

        Returns:
            str: Raw metadata content as string, or empty string on failure.
        """
        url = f"{BASE_URL}/archive/objects/context:km.{context}/datastreams/METADATA/content"
        try:
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                return response.text
            else:
                self.logger.error(f"Failed to fetch METADATA for context {context}: {response.status_code}")
        except Exception as e:
            self.logger.exception(f"Exception fetching METADATA for context {context}: {e}")
        return ""

    def _extract_ids_from_metadata(self, metadata_text: str) -> List[str]:
        """Extract all object identifiers (o:km.X) from metadata text.

        Args:
            metadata_text (str): Raw metadata string.

        Returns:
            List[str]: List of unique object identifiers.
        """
        pattern = re.compile(r"o:km\.\d+")
        ids = pattern.findall(metadata_text)
        return sorted(set(ids), key=lambda x: int(x.split('.')[-1]))

    def _get_object_model(self, identifier: str) -> Optional[str]:
        """Retrieve the model (e.g., TEI or LIDO) for an object via its RELS-EXT datastream.

        Args:
            identifier (str): Object identifier like 'o:km.9'.

        Returns:
            Optional[str]: Model URI (e.g., 'info:fedora/cm:TEI' or 'info:fedora/cm:LIDO'),
                or None if not found.
        """
        url = f"{BASE_URL}/archive/objects/{identifier}/datastreams/RELS-EXT/content"
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code != 200:
                self.logger.warning(f"RELS-EXT not found for {identifier}: {resp.status_code}")
                return None
            # Parse XML to find hasModel
            try:
                tree = ET.fromstring(resp.content)
                ns = {'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'}
                # Find all elements named 'hasModel'
                for has_model in tree.iter():
                    if has_model.tag.endswith('hasModel'):
                        model_uri = has_model.attrib.get('{info:fedora/fedora-system:def/model#}resource')
                        if not model_uri:
                            model_uri = has_model.attrib.get('rdf:resource') or has_model.attrib.get('{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource')
                        return model_uri
            except ET.ParseError:
                self.logger.warning(f"Failed to parse RELS-EXT XML for {identifier}")
        except Exception as e:
            self.logger.exception(f"Exception retrieving RELS-EXT for {identifier}: {e}")
        return None

    def _download_file(self, url: str, dest: Path) -> bool:
        """Download a file from URL to the destination path.

        Args:
            url (str): The URL to download.
            dest (Path): Destination file path.

        Returns:
            bool: True if downloaded successfully, False otherwise.
        """
        try:
            resp = requests.get(url, timeout=60)
            if resp.status_code == 200:
                # Ensure parent directory exists
                dest.parent.mkdir(parents=True, exist_ok=True)
                with open(dest, 'wb') as f:
                    f.write(resp.content)
                return True
            else:
                self.logger.warning(f"Failed to download {url}: status {resp.status_code}")
        except Exception as e:
            self.logger.exception(f"Exception downloading {url}: {e}")
        return False

    def _get_title_and_description(self, identifier: str, model: str) -> (Optional[str], Optional[str], Optional[str]):
        """Retrieve title, description and created date from TEI or LIDO source.

        Args:
            identifier (str): Object identifier.
            model (str): Model URI string.

        Returns:
            (title, description, created_date)
        """
        title = None
        description = None
        created_date = None
        if model is None:
            return title, description, created_date
        # Determine source datastream based on model
        source_stream = None
        if 'cm:TEI' in model:
            source_stream = 'TEI_SOURCE'
        elif 'cm:LIDO' in model:
            source_stream = 'LIDO_SOURCE'
        if not source_stream:
            return title, description, created_date
        url = f"{BASE_URL}/{identifier}/{source_stream}"
        try:
            resp = requests.get(url, timeout=60)
            if resp.status_code != 200:
                return title, description, created_date
            # parse xml
            try:
                tree = ET.fromstring(resp.content)
                # Generic parsing: find first title element
                # TEI namespace
                ns_tei = {'tei': 'http://www.tei-c.org/ns/1.0'}
                ns_lido = {'lido': 'http://www.lido-schema.org'}
                if 'cm:TEI' in model:
                    # Title
                    title_el = tree.find('.//tei:title', ns_tei)
                    if title_el is not None and title_el.text:
                        title = title_el.text.strip()
                    # Description: look for body paragraphs or notes
                    desc_el = tree.find('.//tei:abstract', ns_tei) or tree.find('.//tei:p', ns_tei)
                    if desc_el is not None and (desc_el.text or ''.join(desc_el.itertext())):
                        description = (desc_el.text or ''.join(desc_el.itertext())).strip()
                    # Date: look for date in msDesc or TEI header
                    date_el = tree.find('.//tei:date', ns_tei)
                    if date_el is not None and date_el.text:
                        created_date = date_el.text.strip()
                elif 'cm:LIDO' in model:
                    # Title
                    title_el = tree.find('.//lido:title', ns_lido)
                    if title_el is not None and title_el.text:
                        title = title_el.text.strip()
                    # Description
                    desc_el = tree.find('.//lido:descriptiveNoteValue', ns_lido)
                    if desc_el is not None and desc_el.text:
                        description = desc_el.text.strip()
                    # Date
                    date_el = tree.find('.//lido:displayCreationDate', ns_lido)
                    if date_el is not None and date_el.text:
                        created_date = date_el.text.strip()
            except ET.ParseError:
                self.logger.warning(f"Failed to parse TEI/LIDO source for {identifier}")
        except Exception as e:
            self.logger.exception(f"Exception fetching TEI/LIDO for {identifier}: {e}")
        return title, description, created_date

    def _download_image(self, identifier: str, dest_dir: Path) -> bool:
        """Attempt to download the primary image for an object.

        It tries without extension first, then with .jpg, .png, .tiff.

        Args:
            identifier (str): Object identifier.
            dest_dir (Path): Directory where the image should be saved.

        Returns:
            bool: True if an image was downloaded successfully, False otherwise.
        """
        extensions = ["", ".jpg", ".png", ".tiff", ".jpeg"]
        for ext in extensions:
            url = f"{BASE_URL}/{identifier}/IMAGE.1{ext}"
            try:
                resp = requests.get(url, timeout=60)
                if resp.status_code == 200 and resp.headers.get('Content-Type', '').startswith('image'):
                    # Determine file extension from content type if no ext
                    ct = resp.headers.get('Content-Type', '').split('/')[-1]
                    file_ext = ext.replace('.', '') or ct.split(';')[0]
                    file_name = f"{identifier.replace(':', '_')}.1.{file_ext}"
                    dest_path = dest_dir / file_name
                    dest_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(dest_path, 'wb') as f:
                        f.write(resp.content)
                    return True
            except Exception as e:
                self.logger.exception(f"Exception downloading image for {identifier}: {e}")
        return False

    def _process_object(self, entry: Dict) -> Dict:
        """Process a single object: determine its model, download files, extract metadata.

        Args:
            entry (Dict): Dictionary with at least 'identifier' and 'context'.

        Returns:
            Dict: Updated metadata dictionary with additional fields like title,
                description, createdDate, model, and flags indicating download success.
        """
        identifier = entry['identifier']
        context = entry['context']
        metadata = {
            'container': context,
            'pid': f"info:fedora/{identifier}",
            'model': None,
            'title': None,
            'identifier': identifier,
            'createdDate': None,
            'description': None,
            'rdf_downloaded': False,
            'tei_downloaded': False,
            'lido_downloaded': False,
            'image_downloaded': False
        }
        # Determine model
        model_uri = self._get_object_model(identifier)
        metadata['model'] = model_uri
        # Get title, description, date
        title, description, created_date = self._get_title_and_description(identifier, model_uri or '')
        metadata['title'] = title
        metadata['description'] = description
        metadata['createdDate'] = created_date
        
        # Determine destination directories and object type
        is_tei_object = model_uri and 'cm:TEI' in model_uri
        is_lido_object = model_uri and 'cm:LIDO' in model_uri
        
        if is_tei_object:
            # Karteikarte (TEI objects have RDF)
            rdf_dir = self.output_dir / 'karteikarten' / 'rdf'
            tei_dir = self.output_dir / 'karteikarten' / 'tei'
            img_dir = self.output_dir / 'karteikarten' / 'images'
            with self._stats_lock:
                self.stats['karteikarten'] += 1
        elif is_lido_object:
            # Objekte (LIDO objects do NOT have RDF)
            lido_dir = self.output_dir / 'objekte' / 'lido'
            img_dir = self.output_dir / 'objekte' / 'images'
            with self._stats_lock:
                self.stats['objekte'] += 1
        else:
            # Unknown model
            rdf_dir = self.output_dir / 'unknown' / 'rdf'
            img_dir = self.output_dir / 'unknown' / 'images'
            (self.output_dir / 'unknown' / 'rdf').mkdir(parents=True, exist_ok=True)
            (self.output_dir / 'unknown' / 'images').mkdir(parents=True, exist_ok=True)

        # Download RDF only for TEI objects (karteikarten)
        if is_tei_object:
            rdf_path = rdf_dir / f"{identifier.replace(':', '_')}.rdf"
            success_rdf = self._download_file(f"{BASE_URL}/{identifier}/RDF", rdf_path)
            metadata['rdf_downloaded'] = success_rdf
            if success_rdf:
                with self._stats_lock:
                    self.stats['rdf_success'] += 1
            time.sleep(DOWNLOAD_DELAY)
        # Note: No RDF download for LIDO objects, leave rdf_downloaded as False
        
        # Download TEI or LIDO source
        if is_tei_object:
            tei_path = tei_dir / f"{identifier.replace(':', '_')}.tei.xml"
            success_source = self._download_file(f"{BASE_URL}/{identifier}/TEI_SOURCE", tei_path)
            metadata['tei_downloaded'] = success_source
            if success_source:
                with self._stats_lock:
                    self.stats['tei_success'] += 1
        elif is_lido_object:
            lido_path = lido_dir / f"{identifier.replace(':', '_')}.lido.xml"
            success_source = self._download_file(f"{BASE_URL}/{identifier}/LIDO_SOURCE", lido_path)
            metadata['lido_downloaded'] = success_source
            if success_source:
                with self._stats_lock:
                    self.stats['lido_success'] += 1
        else:
            success_source = False
        time.sleep(DOWNLOAD_DELAY)
        
        # Download image
        success_img = self._download_image(identifier, img_dir)
        metadata['image_downloaded'] = success_img
        if success_img:
            with self._stats_lock:
                self.stats['image_success'] += 1
        time.sleep(DOWNLOAD_DELAY)
        
        return metadata

    def run_extraction(self):
        """Run the full extraction process: discover objects, download files, save metadata."""
        # Discover object IDs from contexts
        objects_list: List[Dict] = []
        for ctx in ['karteikarten', 'objekte']:
            meta_text = self._fetch_context_metadata(ctx)
            ids = self._extract_ids_from_metadata(meta_text)
            for obj_id in ids:
                objects_list.append({'identifier': obj_id, 'context': ctx})
        # Optionally limit number of objects
        if self.max_objects is not None:
            objects_list = objects_list[:self.max_objects]
        # Update total count
        self.stats['total_objects'] = len(objects_list)
        self.logger.info(f"Total objects to process: {len(objects_list)}")
        # Process objects concurrently
        processed_metadata = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_obj = {executor.submit(self._process_object, entry): entry for entry in objects_list}
            for future in as_completed(future_to_obj):
                entry = future_to_obj[future]
                try:
                    result = future.result()
                    processed_metadata.append(result)
                except Exception as exc:
                    self.logger.exception(f"Error processing {entry['identifier']}: {exc}")
        # Save metadata to JSON and CSV
        self.save_metadata(processed_metadata)
        # Generate summary
        self.generate_summary()

    def save_metadata(self, objects_list: List[Dict]):
        """Save object metadata to JSON and CSV files."""
        meta_dir = self.output_dir / 'metadata'
        json_path = meta_dir / 'all_objects.json'
        csv_path = meta_dir / 'all_objects.csv'
        # Write JSON
        with open(json_path, 'w', encoding='utf-8') as jf:
            json.dump(objects_list, jf, ensure_ascii=False, indent=2)
        # Write CSV
        if objects_list:
            fieldnames = list(objects_list[0].keys())
            with open(csv_path, 'w', newline='', encoding='utf-8') as cf:
                writer = csv.DictWriter(cf, fieldnames=fieldnames)
                writer.writeheader()
                for obj in objects_list:
                    writer.writerow(obj)
        self.logger.info(f"Metadata saved: JSON at {json_path}, CSV at {csv_path}")

    def generate_summary(self):
        """Generate a summary report of the extraction process."""
        summary_lines = []
        summary_lines.append(f"Total objects processed: {self.stats['total_objects']}")
        summary_lines.append(f"Karteikarten objects: {self.stats['karteikarten']}")
        summary_lines.append(f"Objekte objects: {self.stats['objekte']}")
        if self.stats['total_objects'] > 0:
            rdf_rate = self.stats['rdf_success'] / self.stats['total_objects'] * 100
            img_rate = self.stats['image_success'] / self.stats['total_objects'] * 100
        else:
            rdf_rate = img_rate = 0.0
        summary_lines.append(f"RDF files downloaded: {self.stats['rdf_success']} (success rate: {rdf_rate:.2f}%)")
        summary_lines.append(f"TEI files downloaded: {self.stats['tei_success']}")
        summary_lines.append(f"LIDO files downloaded: {self.stats['lido_success']}")
        summary_lines.append(f"Images downloaded: {self.stats['image_success']} (success rate: {img_rate:.2f}%)")
        summary_text = "\n".join(summary_lines)
        summary_path = self.output_dir / 'metadata' / 'download_summary.txt'
        with open(summary_path, 'w', encoding='utf-8') as sf:
            sf.write(summary_text)
        self.logger.info("Summary generated:")
        self.logger.info(summary_text)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Hans Gross Kriminalmuseum Extractor')
    parser.add_argument('--output', type=str, default='km_archive', help='Output directory for extracted data')
    parser.add_argument('--workers', type=int, default=5, help='Number of concurrent worker threads')
    parser.add_argument('--limit', type=int, default=None, help='Optional limit on number of objects to process')
    args = parser.parse_args()

    extractor = KMExtractor(args.output, max_workers=args.workers, max_objects=args.limit)
    extractor.run_extraction()