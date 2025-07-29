import os
import re
import json
import csv
import time
import logging
import threading
from pathlib import Path
from typing import List, Dict, Optional, Tuple

import requests
from xml.etree import ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed

# Constants for datastream URLs
BASE_URL = "https://gams.uni-graz.at"

# Delay between file downloads (seconds)
DOWNLOAD_DELAY = 0.5

class EnhancedKMExtractor:
    """
    Enhanced extractor for the Hans Gross Kriminalmuseum archive.
    Features improved TEI/LIDO parsing with full-text extraction and multiple fallback strategies.
    """

    def __init__(self, output_dir: str, max_workers: int = 5, max_objects: Optional[int] = None, debug_xml: bool = False):
        """Initialize the enhanced extractor.

        Args:
            output_dir (str): Top-level directory for the archive.
            max_workers (int): Number of threads for concurrent downloads.
            max_objects (Optional[int]): Optional limit on number of objects to process.
            debug_xml (bool): If True, save sample XML files for analysis.
        """
        self.output_dir = Path(output_dir)
        self.max_workers = max_workers
        self.max_objects = max_objects
        self.debug_xml = debug_xml
        
        # Prepare directories
        self._prepare_directories()
        # Setup logging
        self._setup_logging()
        
        self.logger.info(f"Enhanced KMExtractor initialized with output_dir={self.output_dir}, max_workers={self.max_workers}, max_objects={self.max_objects}, debug_xml={self.debug_xml}")
        
        # Statistics counters
        self.stats = {
            'total_objects': 0,
            'karteikarten': 0,
            'objekte': 0,
            'rdf_success': 0,
            'tei_success': 0,
            'lido_success': 0,
            'image_success': 0,
            'titles_extracted': 0,
            'descriptions_extracted': 0,
            'dates_extracted': 0,
            'fulltext_extracted': 0,
            'parsing_failures': 0
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
            "debug/xml_samples" if self.debug_xml else "debug"
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
        self.logger = logging.getLogger('EnhancedKMExtractor')

    def _save_debug_xml(self, identifier: str, xml_content: str, xml_type: str):
        """Save XML content for debugging purposes."""
        if not self.debug_xml:
            return
            
        debug_dir = self.output_dir / "debug" / "xml_samples"
        filename = f"{identifier.replace(':', '_')}_{xml_type}.xml"
        debug_path = debug_dir / filename
        
        try:
            with open(debug_path, 'w', encoding='utf-8') as f:
                f.write(xml_content)
            self.logger.debug(f"Saved debug XML: {debug_path}")
        except Exception as e:
            self.logger.warning(f"Failed to save debug XML for {identifier}: {e}")

    def _parse_tei_metadata_enhanced(self, xml_content: str, identifier: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
        """Enhanced TEI metadata parsing for Hans Gross Karteikarten with full-text extraction.
        
        Args:
            xml_content (str): Raw TEI XML content
            identifier (str): Object identifier for logging
            
        Returns:
            Tuple[title, description, created_date, fulltext]
        """
        title = None
        description = None
        created_date = None
        fulltext = None
        
        if self.debug_xml:
            self._save_debug_xml(identifier, xml_content, "tei")
        
        try:
            tree = ET.fromstring(xml_content.encode('utf-8'))
            
            # Define namespace
            namespaces = {'tei': 'http://www.tei-c.org/ns/1.0'}
            
            # ===== TITLE EXTRACTION =====
            # Primary title from titleStmt
            title_element = tree.find('.//tei:titleStmt/tei:title', namespaces)
            if title_element is not None and title_element.text:
                title = title_element.text.strip()
                self.logger.debug(f"Found TEI title for {identifier}: {title}")
            
            # ===== DATE EXTRACTION =====
            # Look for publication date first
            pub_date = tree.find('.//tei:publicationStmt/tei:date', namespaces)
            if pub_date is not None and pub_date.text:
                created_date = pub_date.text.strip()
            
            # ===== STRUCTURED DESCRIPTION EXTRACTION =====
            description_sources = []
            
            # Extract key information from body structure
            body = tree.find('.//tei:body', namespaces)
            if body is not None:
                
                # Object/Subject information
                subject_div = body.find('.//tei:div[@type="subject"]', namespaces)
                if subject_div is not None:
                    subject_text = ''.join(subject_div.itertext()).strip()
                    # Clean up the text
                    subject_clean = ' '.join(subject_text.split())
                    if subject_clean:
                        description_sources.append(f"Object: {subject_clean}")
                
                # Crime/Delikt information  
                offence_div = body.find('.//tei:div[@type="offence"]', namespaces)
                if offence_div is not None:
                    offence_text = ''.join(offence_div.itertext()).strip()
                    offence_clean = ' '.join(offence_text.split())
                    if offence_clean:
                        description_sources.append(f"Crime: {offence_clean}")
                
                # Court information
                court_div = body.find('.//tei:div[@type="courtDiv"]', namespaces)
                if court_div is not None:
                    court_text = ''.join(court_div.itertext()).strip()
                    court_clean = ' '.join(court_text.split())
                    if court_clean:
                        description_sources.append(f"Court: {court_clean}")
                
                # Suspect information
                suspect_div = body.find('.//tei:div[@type="suspectDiv"]', namespaces)
                if suspect_div is not None:
                    # Extract person name
                    person_name = suspect_div.find('.//tei:persName', namespaces)
                    if person_name is not None:
                        name_parts = []
                        forename = person_name.find('tei:forename', namespaces)
                        surname = person_name.find('tei:surname', namespaces) 
                        if forename is not None and forename.text:
                            name_parts.append(forename.text.strip())
                        if surname is not None and surname.text:
                            name_parts.append(surname.text.strip())
                        if name_parts:
                            description_sources.append(f"Suspect: {' '.join(name_parts)}")
                    
                    # Extract age and profession
                    age_term = suspect_div.find('.//tei:term[@type="age"]', namespaces)
                    if age_term is not None and age_term.text:
                        description_sources.append(f"Age: {age_term.text.strip()}")
                    
                    profession_term = suspect_div.find('.//tei:term[@type="profession"]', namespaces)
                    if profession_term is not None and profession_term.text:
                        description_sources.append(f"Profession: {profession_term.text.strip()}")
            
            # Physical description from msDesc
            ms_desc = tree.find('.//tei:msDesc', namespaces)
            if ms_desc is not None:
                # Museum ID
                idno = ms_desc.find('.//tei:idno', namespaces)
                if idno is not None and idno.text:
                    description_sources.append(f"Museum ID: {idno.text.strip()}")
                
                # Dimensions
                dimensions = ms_desc.find('.//tei:dimensions', namespaces)
                if dimensions is not None:
                    width = dimensions.find('tei:width', namespaces)
                    height = dimensions.find('tei:height', namespaces)
                    if width is not None and height is not None and width.text and height.text:
                        unit = dimensions.get('unit', 'cm')
                        description_sources.append(f"Dimensions: {width.text} × {height.text} {unit}")
                
                # Material
                support = ms_desc.find('.//tei:support', namespaces)
                if support is not None and support.text:
                    description_sources.append(f"Material: {support.text.strip()}")
            
            # Combine description sources
            if description_sources:
                description = ' | '.join(description_sources)
            
            # ===== FULL-TEXT EXTRACTION =====
            # Extract complete text from body for full-text search
            body = tree.find('.//tei:body', namespaces)
            if body is not None:
                # Get all text content, preserving structure
                raw_text = ''.join(body.itertext())
                
                # Clean up the text
                # Remove excessive whitespace
                cleaned_text = ' '.join(raw_text.split())
                
                # Remove common markup artifacts
                cleaned_text = cleaned_text.replace('Z.', 'Z. ').replace('Kasten:', 'Kasten: ').replace('Fach:', 'Fach: ')
                
                if cleaned_text and len(cleaned_text) > 20:  # Minimum meaningful length
                    fulltext = cleaned_text
                    self.logger.debug(f"Extracted fulltext for {identifier}: {len(fulltext)} characters")
            
        except ET.ParseError as e:
            self.logger.warning(f"Failed to parse TEI XML for {identifier}: {e}")
            with self._stats_lock:
                self.stats['parsing_failures'] += 1
        except Exception as e:
            self.logger.exception(f"Unexpected error parsing TEI for {identifier}: {e}")
            with self._stats_lock:
                self.stats['parsing_failures'] += 1
        
        # Update extraction statistics
        with self._stats_lock:
            if title:
                self.stats['titles_extracted'] += 1
            if description:
                self.stats['descriptions_extracted'] += 1
            if created_date:
                self.stats['dates_extracted'] += 1
            if fulltext:
                self.stats['fulltext_extracted'] += 1
        
        return title, description, created_date, fulltext

    def _parse_lido_metadata_enhanced(self, xml_content: str, identifier: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
        """Enhanced LIDO metadata parsing based on actual Hans Gross Museum structure.
        
        Args:
            xml_content (str): Raw LIDO XML content
            identifier (str): Object identifier for logging
            
        Returns:
            Tuple[title, description, created_date, fulltext]
        """
        title = None
        description = None
        created_date = None
        fulltext = None  # LIDO objects don't have extensive full text like TEI
        
        if self.debug_xml:
            self._save_debug_xml(identifier, xml_content, "lido")
        
        try:
            tree = ET.fromstring(xml_content.encode('utf-8'))
            
            # Define namespace
            namespaces = {
                'lido': 'http://www.lido-schema.org',
                't': 'http://www.tei-c.org/ns/1.0'
            }
            
            # ===== TITLE EXTRACTION =====
            title_element = tree.find('.//lido:titleWrap/lido:titleSet/lido:appellationValue', namespaces)
            if title_element is not None and title_element.text:
                title = title_element.text.strip()
                self.logger.debug(f"Found LIDO title for {identifier}: {title}")
            
            # ===== DESCRIPTION EXTRACTION =====
            description_sources = []
            
            # 1. Object type/category (e.g., "Dietrich")
            object_work_types = tree.findall('.//lido:objectWorkTypeWrap/lido:objectWorkType/lido:term', namespaces)
            for term_elem in object_work_types:
                if term_elem.text and term_elem.text.strip():
                    term_text = term_elem.text.strip()
                    if term_text not in ['Objekte', 'Objects']:
                        description_sources.append(f"Type: {term_text}")
            
            # 2. Subject description
            subject_elem = tree.find('.//lido:displaySubject[@lido:label="description"]', namespaces)
            if subject_elem is not None and subject_elem.text:
                description_sources.append(f"Description: {subject_elem.text.strip()}")
            
            # 3. Material information
            materials = tree.findall('.//lido:termMaterialsTech[@lido:type="material"]/lido:term', namespaces)
            material_list = []
            for mat_elem in materials:
                if mat_elem.text and mat_elem.text.strip():
                    material_list.append(mat_elem.text.strip())
            if material_list:
                description_sources.append(f"Material: {', '.join(material_list)}")
            
            # 4. Measurements
            measurements = []
            measurement_sets = tree.findall('.//lido:measurementsSet', namespaces)
            for measurement_set in measurement_sets:
                measure_type = measurement_set.find('lido:measurementType', namespaces)
                measure_value = measurement_set.find('lido:measurementValue', namespaces)
                measure_unit = measurement_set.find('lido:measurementUnit', namespaces)
                
                if all(elem is not None and elem.text for elem in [measure_type, measure_value, measure_unit]):
                    measurements.append(f"{measure_type.text}: {measure_value.text} {measure_unit.text}")
            
            if measurements:
                description_sources.append(f"Dimensions: {', '.join(measurements)}")
            
            # 5. Condition
            condition_elem = tree.find('.//lido:objectDescriptionSet[@lido:type="condition"]/lido:descriptiveNoteValue', namespaces)
            if condition_elem is not None and condition_elem.text:
                description_sources.append(f"Condition: {condition_elem.text.strip()}")
            
            # 6. Museum ID
            work_id_elem = tree.find('.//lido:workID[@lido:type="idno"]', namespaces)
            if work_id_elem is not None and work_id_elem.text:
                description_sources.append(f"Museum ID: {work_id_elem.text.strip()}")
            
            # Combine description sources
            if description_sources:
                description = ' | '.join(description_sources)
            
            # ===== DATE EXTRACTION =====
            date_candidates = []
            
            # Look for dates with a simpler approach - find all events first
            all_events = tree.findall('.//lido:event', namespaces)
            for event in all_events:
                # Check event type
                event_type_elem = event.find('lido:eventType/lido:term', namespaces)
                if event_type_elem is not None and event_type_elem.text:
                    event_type = event_type_elem.text.strip()
                    
                    # Look for digitization date
                    if event_type == "Digitalisierung":
                        date_elem = event.find('lido:eventDate/lido:displayDate', namespaces)
                        if date_elem is not None and date_elem.text:
                            date_candidates.append(('Digitization', date_elem.text.strip()))
                    
                    # Look for restoration date
                    elif event_type == "Restaurierung":
                        date_elem = event.find('lido:eventDate/lido:displayDate', namespaces)
                        if date_elem is not None and date_elem.text:
                            date_candidates.append(('Restoration', date_elem.text.strip()))
                    
                    # Look for creation date
                    elif event_type == "Herstellung":
                        date_elem = event.find('lido:eventDate/lido:displayDate', namespaces)
                        if date_elem is not None and date_elem.text:
                            date_candidates.append(('Creation', date_elem.text.strip()))
            
            # Use first available date (prioritize digitization)
            if date_candidates:
                # Sort to prioritize digitization dates
                date_candidates.sort(key=lambda x: {'Digitization': 0, 'Restoration': 1, 'Creation': 2}.get(x[0], 3))
                created_date = date_candidates[0][1]
                self.logger.debug(f"Found LIDO date for {identifier}: {created_date}")
            
            # ===== BASIC FULLTEXT FOR LIDO =====
            # For LIDO objects, create a basic fulltext from title + description
            if title or description:
                fulltext_parts = []
                if title:
                    fulltext_parts.append(title)
                if description:
                    fulltext_parts.append(description)
                fulltext = ' '.join(fulltext_parts)
            
        except ET.ParseError as e:
            self.logger.warning(f"Failed to parse LIDO XML for {identifier}: {e}")
            with self._stats_lock:
                self.stats['parsing_failures'] += 1
        except Exception as e:
            self.logger.exception(f"Unexpected error parsing LIDO for {identifier}: {e}")
            with self._stats_lock:
                self.stats['parsing_failures'] += 1
        
        # Update extraction statistics
        with self._stats_lock:
            if title:
                self.stats['titles_extracted'] += 1
            if description:
                self.stats['descriptions_extracted'] += 1
            if created_date:
                self.stats['dates_extracted'] += 1
            if fulltext:
                self.stats['fulltext_extracted'] += 1
        
        return title, description, created_date, fulltext

    def parse_sparql_xml(self, xml_file: str) -> List[Dict]:
        """Parse a SPARQL XML results file to extract object metadata."""
        objects = []
        tree = ET.parse(xml_file)
        root = tree.getroot()
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
        """Fetch the METADATA datastream for a given context."""
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
        """Extract all object identifiers (o:km.X) from metadata text."""
        pattern = re.compile(r"o:km\.\d+")
        ids = pattern.findall(metadata_text)
        return sorted(set(ids), key=lambda x: int(x.split('.')[-1]))

    def _get_object_model(self, identifier: str) -> Optional[str]:
        """Retrieve the model (e.g., TEI or LIDO) for an object via its RELS-EXT datastream."""
        url = f"{BASE_URL}/archive/objects/{identifier}/datastreams/RELS-EXT/content"
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code != 200:
                self.logger.warning(f"RELS-EXT not found for {identifier}: {resp.status_code}")
                return None
            try:
                tree = ET.fromstring(resp.content)
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

    def _get_title_and_description_enhanced(self, identifier: str, model: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
        """Enhanced metadata extraction with full-text support.

        Args:
            identifier (str): Object identifier.
            model (str): Model URI string.

        Returns:
            Tuple[title, description, created_date, fulltext]
        """
        if not model:
            return None, None, None, None
        
        # Determine source datastream based on model
        source_stream = None
        if 'cm:TEI' in model:
            source_stream = 'TEI_SOURCE'
        elif 'cm:LIDO' in model:
            source_stream = 'LIDO_SOURCE'
        
        if not source_stream:
            return None, None, None, None
        
        url = f"{BASE_URL}/{identifier}/{source_stream}"
        try:
            resp = requests.get(url, timeout=60)
            if resp.status_code != 200:
                self.logger.warning(f"Failed to fetch {source_stream} for {identifier}: {resp.status_code}")
                return None, None, None, None
            
            xml_content = resp.text
            
            # Use appropriate parser based on model
            if 'cm:TEI' in model:
                return self._parse_tei_metadata_enhanced(xml_content, identifier)
            elif 'cm:LIDO' in model:
                return self._parse_lido_metadata_enhanced(xml_content, identifier)
                    
        except Exception as e:
            self.logger.exception(f"Exception fetching {source_stream} for {identifier}: {e}")
        
        return None, None, None, None

    def _download_file(self, url: str, dest: Path) -> bool:
        """Download a file from URL to the destination path."""
        try:
            resp = requests.get(url, timeout=60)
            if resp.status_code == 200:
                dest.parent.mkdir(parents=True, exist_ok=True)
                with open(dest, 'wb') as f:
                    f.write(resp.content)
                return True
            else:
                self.logger.warning(f"Failed to download {url}: status {resp.status_code}")
        except Exception as e:
            self.logger.exception(f"Exception downloading {url}: {e}")
        return False

    def _download_image(self, identifier: str, dest_dir: Path) -> bool:
        """Attempt to download the primary image for an object."""
        extensions = ["", ".jpg", ".png", ".tiff", ".jpeg"]
        for ext in extensions:
            url = f"{BASE_URL}/{identifier}/IMAGE.1{ext}"
            try:
                resp = requests.get(url, timeout=60)
                if resp.status_code == 200 and resp.headers.get('Content-Type', '').startswith('image'):
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
        """Enhanced object processing with full-text extraction."""
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
            'fulltext': None,  # NEW: Full-text content for search
            'rdf_downloaded': False,
            'tei_downloaded': False,
            'lido_downloaded': False,
            'image_downloaded': False
        }
        
        # Determine model
        model_uri = self._get_object_model(identifier)
        metadata['model'] = model_uri
        
        # Get enhanced metadata including full-text
        title, description, created_date, fulltext = self._get_title_and_description_enhanced(identifier, model_uri or '')
        metadata['title'] = title
        metadata['description'] = description
        metadata['createdDate'] = created_date
        metadata['fulltext'] = fulltext  # NEW: Store full-text for search
        
        # Determine destination directories and object type
        is_tei_object = model_uri and 'cm:TEI' in model_uri
        is_lido_object = model_uri and 'cm:LIDO' in model_uri
        
        if is_tei_object:
            rdf_dir = self.output_dir / 'karteikarten' / 'rdf'
            tei_dir = self.output_dir / 'karteikarten' / 'tei'
            img_dir = self.output_dir / 'karteikarten' / 'images'
            with self._stats_lock:
                self.stats['karteikarten'] += 1
        elif is_lido_object:
            lido_dir = self.output_dir / 'objekte' / 'lido'
            img_dir = self.output_dir / 'objekte' / 'images'
            with self._stats_lock:
                self.stats['objekte'] += 1
        else:
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
        """Run the full extraction process with enhanced parsing."""
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
        # Generate enhanced summary
        self.generate_enhanced_summary()

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

    def generate_enhanced_summary(self):
        """Generate an enhanced summary report with parsing statistics."""
        summary_lines = []
        summary_lines.append("=" * 60)
        summary_lines.append("ENHANCED HANS GROSS KRIMINALMUSEUM EXTRACTION REPORT")
        summary_lines.append("=" * 60)
        summary_lines.append("")
        
        # Basic counts
        summary_lines.append("OBJECT COUNTS:")
        summary_lines.append(f"  Total objects processed: {self.stats['total_objects']}")
        summary_lines.append(f"  Karteikarten (TEI): {self.stats['karteikarten']}")
        summary_lines.append(f"  Objekte (LIDO): {self.stats['objekte']}")
        summary_lines.append("")
        
        # Download success rates
        if self.stats['total_objects'] > 0:
            rdf_rate = (self.stats['rdf_success'] / self.stats['karteikarten'] * 100) if self.stats['karteikarten'] > 0 else 0
            tei_rate = (self.stats['tei_success'] / self.stats['karteikarten'] * 100) if self.stats['karteikarten'] > 0 else 0
            lido_rate = (self.stats['lido_success'] / self.stats['objekte'] * 100) if self.stats['objekte'] > 0 else 0
            img_rate = self.stats['image_success'] / self.stats['total_objects'] * 100
        else:
            rdf_rate = tei_rate = lido_rate = img_rate = 0.0
        
        summary_lines.append("DOWNLOAD SUCCESS RATES:")
        summary_lines.append(f"  RDF files: {self.stats['rdf_success']}/{self.stats['karteikarten']} ({rdf_rate:.1f}%)")
        summary_lines.append(f"  TEI files: {self.stats['tei_success']}/{self.stats['karteikarten']} ({tei_rate:.1f}%)")
        summary_lines.append(f"  LIDO files: {self.stats['lido_success']}/{self.stats['objekte']} ({lido_rate:.1f}%)")
        summary_lines.append(f"  Images: {self.stats['image_success']}/{self.stats['total_objects']} ({img_rate:.1f}%)")
        summary_lines.append("")
        
        # Enhanced parsing statistics
        if self.stats['total_objects'] > 0:
            title_rate = self.stats['titles_extracted'] / self.stats['total_objects'] * 100
            desc_rate = self.stats['descriptions_extracted'] / self.stats['total_objects'] * 100
            date_rate = self.stats['dates_extracted'] / self.stats['total_objects'] * 100
            fulltext_rate = self.stats['fulltext_extracted'] / self.stats['total_objects'] * 100
        else:
            title_rate = desc_rate = date_rate = fulltext_rate = 0.0
        
        summary_lines.append("METADATA EXTRACTION SUCCESS RATES:")
        summary_lines.append(f"  Titles extracted: {self.stats['titles_extracted']}/{self.stats['total_objects']} ({title_rate:.1f}%)")
        summary_lines.append(f"  Descriptions extracted: {self.stats['descriptions_extracted']}/{self.stats['total_objects']} ({desc_rate:.1f}%)")
        summary_lines.append(f"  Dates extracted: {self.stats['dates_extracted']}/{self.stats['total_objects']} ({date_rate:.1f}%)")
        summary_lines.append(f"  Full-text extracted: {self.stats['fulltext_extracted']}/{self.stats['total_objects']} ({fulltext_rate:.1f}%)")
        summary_lines.append("")
        
        # Error statistics
        if self.stats['parsing_failures'] > 0:
            failure_rate = self.stats['parsing_failures'] / self.stats['total_objects'] * 100
            summary_lines.append("PARSING ISSUES:")
            summary_lines.append(f"  XML parsing failures: {self.stats['parsing_failures']} ({failure_rate:.1f}%)")
            summary_lines.append("")
        
        # Data quality assessment
        summary_lines.append("DATA QUALITY ASSESSMENT:")
        if title_rate >= 90:
            summary_lines.append("  ✅ Title extraction: EXCELLENT")
        elif title_rate >= 70:
            summary_lines.append("  ⚠️  Title extraction: GOOD")
        else:
            summary_lines.append("  ❌ Title extraction: NEEDS IMPROVEMENT")
        
        if desc_rate >= 90:
            summary_lines.append("  ✅ Description extraction: EXCELLENT")
        elif desc_rate >= 70:
            summary_lines.append("  ⚠️  Description extraction: GOOD")
        else:
            summary_lines.append("  ❌ Description extraction: NEEDS IMPROVEMENT")
        
        if fulltext_rate >= 80:
            summary_lines.append("  ✅ Full-text extraction: EXCELLENT")
        elif fulltext_rate >= 50:
            summary_lines.append("  ⚠️  Full-text extraction: GOOD")
        else:
            summary_lines.append("  ❌ Full-text extraction: NEEDS IMPROVEMENT")
        
        summary_lines.append("")
        
        # Recommendations
        summary_lines.append("RECOMMENDATIONS:")
        if self.stats['parsing_failures'] > 0:
            summary_lines.append("  • Review XML parsing failures in debug logs")
        if title_rate < 90:
            summary_lines.append("  • Consider additional title extraction strategies")
        if desc_rate < 90:
            summary_lines.append("  • Review description parsing logic for missed content")
        if img_rate < 95:
            summary_lines.append("  • Some images may be missing or inaccessible")
        
        summary_lines.append("")
        summary_lines.append("FILES GENERATED:")
        summary_lines.append(f"  • JSON metadata: km_archive/metadata/all_objects.json")
        summary_lines.append(f"  • CSV metadata: km_archive/metadata/all_objects.csv")
        if self.debug_xml:
            summary_lines.append(f"  • Debug XML samples: km_archive/debug/xml_samples/")
        summary_lines.append(f"  • Extraction log: km_archive/logs/extraction.log")
        summary_lines.append("")
        summary_lines.append("=" * 60)
        
        summary_text = "\n".join(summary_lines)
        
        # Save summary to file
        summary_path = self.output_dir / 'metadata' / 'extraction_summary.txt'
        with open(summary_path, 'w', encoding='utf-8') as sf:
            sf.write(summary_text)
        
        # Also log to console
        self.logger.info("EXTRACTION COMPLETE!")
        self.logger.info(f"Summary saved to: {summary_path}")
        print("\n" + summary_text)

    def analyze_sample_objects(self, sample_size: int = 5) -> Dict:
        """Analyze a sample of objects for quality assessment."""
        # This method can be used for debugging and quality assessment
        sample_results = {
            'sample_size': sample_size,
            'objects_analyzed': [],
            'common_issues': [],
            'parsing_patterns': {}
        }
        
        # Get a sample of each type
        contexts = ['karteikarten', 'objekte']
        for ctx in contexts:
            meta_text = self._fetch_context_metadata(ctx)
            ids = self._extract_ids_from_metadata(meta_text)
            
            # Take first few objects as sample
            sample_ids = ids[:sample_size] if len(ids) >= sample_size else ids
            
            for obj_id in sample_ids:
                entry = {'identifier': obj_id, 'context': ctx}
                try:
                    result = self._process_object(entry)
                    sample_results['objects_analyzed'].append({
                        'id': obj_id,
                        'context': ctx,
                        'has_title': bool(result.get('title')),
                        'has_description': bool(result.get('description')),
                        'has_fulltext': bool(result.get('fulltext')),
                        'title_length': len(result.get('title', '') or ''),
                        'description_length': len(result.get('description', '') or ''),
                        'fulltext_length': len(result.get('fulltext', '') or ''),
                    })
                except Exception as e:
                    sample_results['common_issues'].append(f"{obj_id}: {str(e)}")
        
        return sample_results


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Enhanced Hans Gross Kriminalmuseum Extractor with improved TEI/LIDO parsing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Extract all objects with 5 workers
  python enhanced_km_extractor.py --output km_archive --workers 5
  
  # Test run with first 50 objects and debug XML output
  python enhanced_km_extractor.py --output km_archive --limit 50 --debug-xml
  
  # Quick sample analysis
  python enhanced_km_extractor.py --output km_archive --limit 10 --workers 2
        """
    )
    
    parser.add_argument('--output', type=str, default='km_archive', 
                       help='Output directory for extracted data (default: km_archive)')
    parser.add_argument('--workers', type=int, default=5, 
                       help='Number of concurrent worker threads (default: 5)')
    parser.add_argument('--limit', type=int, default=None, 
                       help='Optional limit on number of objects to process (for testing)')
    parser.add_argument('--debug-xml', action='store_true', 
                       help='Save sample XML files for debugging and analysis')
    parser.add_argument('--analyze-only', action='store_true',
                       help='Only analyze sample objects without full extraction')
    
    args = parser.parse_args()

    print("🏛️  Enhanced Hans Gross Kriminalmuseum Extractor")
    print("=" * 60)
    print(f"Output directory: {args.output}")
    print(f"Worker threads: {args.workers}")
    print(f"Object limit: {args.limit or 'No limit (all objects)'}")
    print(f"Debug XML: {'Enabled' if args.debug_xml else 'Disabled'}")
    print("=" * 60)

    extractor = EnhancedKMExtractor(
        output_dir=args.output, 
        max_workers=args.workers, 
        max_objects=args.limit,
        debug_xml=args.debug_xml
    )
    
    if args.analyze_only:
        print("🔍 Running sample analysis only...")
        sample_results = extractor.analyze_sample_objects(sample_size=5)
        print(f"\nSample Analysis Results:")
        print(f"Objects analyzed: {len(sample_results['objects_analyzed'])}")
        for obj in sample_results['objects_analyzed']:
            print(f"  {obj['id']} ({obj['context']}): title={obj['has_title']}, desc={obj['has_description']}, fulltext={obj['fulltext_length']} chars")
        if sample_results['common_issues']:
            print(f"Issues found: {len(sample_results['common_issues'])}")
            for issue in sample_results['common_issues'][:3]:  # Show first 3 issues
                print(f"  • {issue}")
    else:
        print("🚀 Starting full extraction...")
        extractor.run_extraction()
        print("✅ Extraction completed!")