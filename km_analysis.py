"""
KM Analysis Script for Hans Gross Kriminalmuseum
================================================

This module defines a ``KMAnalyzer`` class that performs basic analysis on
the output of the extractor implemented in ``km_extractor.py``.  It reads
metadata stored in JSON/CSV files, computes simple statistics about the
downloaded objects and files, and optionally generates rudimentary charts.

Key features
------------

* **File statistics**: counts of downloaded objects by type (Karteikarten vs
  Objekte), success rates for each file category (RDF, TEI, LIDO, images) and
  distribution of file sizes across the different datastreams.  These
  statistics are saved both as a plain–text report and as a CSV table.

* **Metadata analysis**: summarises the date range of the objects (based on
  the ``createdDate`` field), lists the most common containers/collections,
  and counts how many objects have descriptions.  This information gives
  archivists a quick overview of the collection without requiring deep
  domain expertise.

* **Visualisations**: when the optional ``--charts`` flag is supplied, the
  script produces a few simple bar charts using ``matplotlib``.  These
  charts illustrate the distribution of successful downloads per file type
  and the count of objects per category.  The images are saved into the
  ``metadata`` directory so that they can easily be included in reports.

Usage
-----

Running the analyser from the command line is straightforward.  Assuming
the extractor has populated the ``km_archive`` directory, the following
command will perform the analysis and generate both textual and visual
summaries::

    python3 km_analysis.py --data-dir km_archive --charts

If you only want textual output without charts, omit the ``--charts`` flag.

Note
----

This script assumes that it is executed in an environment where direct
filesystem access to the downloaded data is available.  It does **not**
attempt to download any remote resources; all network access should be
handled by the extractor script.  The analyser is intentionally
light‑weight: it refrains from performing any heavy computations or
statistical modelling and instead focuses on summarising the collection in
a human–readable format.
"""

import json
import csv
import argparse
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import matplotlib

# Use a non‑interactive backend in case this script runs on a headless system
matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402  # isort:skip


class KMAnalyzer:
    """Analyse the downloaded Hans Gross Kriminalmuseum data.

    The analyser reads metadata and the downloaded files from a specified
    directory.  It computes basic statistics about the collection and
    optionally generates simple bar charts.  All results are written to
    ``metadata`` directory of the data folder.
    """

    def __init__(self, data_dir: str, generate_charts: bool = False) -> None:
        """Initialise the analyser.

        Args:
            data_dir (str): Path to the base directory containing ``metadata``
                and object subfolders produced by the extractor.
            generate_charts (bool): Whether to produce bar charts.
        """
        self.base_path = Path(data_dir)
        self.metadata_path = self.base_path / "metadata"
        self.generate_charts = generate_charts
        # Load object metadata on initialisation
        self.objects: List[Dict] = self._load_metadata()

    def _load_metadata(self) -> List[Dict]:
        """Load metadata from the JSON file.

        Returns:
            List[Dict]: A list of metadata dictionaries.  If the file is
                missing or malformed, an empty list is returned.
        """
        json_file = self.metadata_path / "all_objects.json"
        if not json_file.exists():
            print(f"Warning: metadata file {json_file} not found.")
            return []
        try:
            with open(json_file, "r", encoding="utf-8") as jf:
                return json.load(jf)
        except Exception as e:
            print(f"Error reading metadata JSON: {e}")
            return []

    # ---------------------------------------------------------------------
    # File Statistics
    # ---------------------------------------------------------------------

    def _file_statistics(self) -> Dict[str, Dict[str, int]]:
        """Gather statistics about downloaded files.

        Counts how many RDF, TEI, LIDO and image files were successfully
        downloaded by inspecting the metadata fields.  The function returns
        a dictionary keyed by file type mapping to counts of success and
        failure.

        Returns:
            Dict[str, Dict[str, int]]: Example::

                {
                    "rdf": {"success": 42, "failure": 8},
                    "tei": {"success": 35, "failure": 5},
                    "lido": {"success": 10, "failure": 2},
                    "image": {"success": 30, "failure": 14},
                }
        """
        stats = {
            "rdf": {"success": 0, "failure": 0},
            "tei": {"success": 0, "failure": 0},
            "lido": {"success": 0, "failure": 0},
            "image": {"success": 0, "failure": 0},
        }
        for obj in self.objects:
            # RDF
            if obj.get("rdf_downloaded"):
                stats["rdf"]["success"] += 1
            else:
                stats["rdf"]["failure"] += 1
            # TEI / LIDO
            if obj.get("model") and "cm:TEI" in obj["model"]:
                if obj.get("tei_downloaded"):
                    stats["tei"]["success"] += 1
                else:
                    stats["tei"]["failure"] += 1
            elif obj.get("model") and "cm:LIDO" in obj["model"]:
                if obj.get("lido_downloaded"):
                    stats["lido"]["success"] += 1
                else:
                    stats["lido"]["failure"] += 1
            # Images
            if obj.get("image_downloaded"):
                stats["image"]["success"] += 1
            else:
                stats["image"]["failure"] += 1
        return stats

    def _file_size_distribution(self) -> Dict[str, List[int]]:
        """Compute size distribution of downloaded files.

        For each object type and file category, this method examines the
        corresponding directory and records the file sizes in bytes.  Only
        existing files are considered.  The resulting dictionary maps a
        category label to a list of sizes.  Categories include ``karteikarten_rdf``,
        ``karteikarten_tei``, ``karteikarten_images``, ``objekte_rdf``,
        ``objekte_lido``, and ``objekte_images``.

        Returns:
            Dict[str, List[int]]: Mapping of category names to lists of file sizes.
        """
        distributions: Dict[str, List[int]] = defaultdict(list)
        # Helper to iterate over files and accumulate sizes
        def collect_sizes(directory: Path, key: str) -> None:
            if not directory.exists():
                return
            for file in directory.iterdir():
                if file.is_file():
                    try:
                        distributions[key].append(file.stat().st_size)
                    except Exception:
                        pass

        # Karteikarten
        collect_sizes(self.base_path / "karteikarten" / "rdf", "karteikarten_rdf")
        collect_sizes(self.base_path / "karteikarten" / "tei", "karteikarten_tei")
        collect_sizes(self.base_path / "karteikarten" / "images", "karteikarten_images")
        # Objekte
        collect_sizes(self.base_path / "objekte" / "rdf", "objekte_rdf")
        collect_sizes(self.base_path / "objekte" / "lido", "objekte_lido")
        collect_sizes(self.base_path / "objekte" / "images", "objekte_images")
        return distributions

    def _objects_by_type(self) -> Dict[str, int]:
        """Count objects by their model/content type.

        Returns:
            Dict[str, int]: Counts keyed by 'TEI', 'LIDO', or 'Unknown'.
        """
        counts = {"TEI": 0, "LIDO": 0, "Unknown": 0}
        for obj in self.objects:
            model = obj.get("model") or ""
            if "cm:TEI" in model:
                counts["TEI"] += 1
            elif "cm:LIDO" in model:
                counts["LIDO"] += 1
            else:
                counts["Unknown"] += 1
        return counts

    # ---------------------------------------------------------------------
    # Metadata Analysis
    # ---------------------------------------------------------------------

    def _date_range(self) -> Optional[Tuple[str, str]]:
        """Determine the earliest and latest creation dates in the collection.

        Parses ISO‐formatted dates in the ``createdDate`` field and computes
        the minimum and maximum.  If no valid dates are found, returns ``None``.

        Returns:
            Optional[Tuple[str, str]]: A tuple of (earliest, latest) ISO dates.
        """
        dates = []
        for obj in self.objects:
            cdate = obj.get("createdDate")
            if cdate:
                try:
                    # Strip potential timezone suffix (e.g., 'Z')
                    ts = cdate.rstrip('Z')
                    dt = datetime.fromisoformat(ts)
                    dates.append(dt)
                except Exception:
                    continue
        if not dates:
            return None
        earliest = min(dates).isoformat()
        latest = max(dates).isoformat()
        return earliest, latest

    def _container_counts(self) -> Counter:
        """Count how many objects belong to each container/collection.

        The ``container`` field typically contains a human‑readable name of
        the collection (e.g., ``Wildererobjekte``).  Containers with no
        entries are ignored.

        Returns:
            Counter: Mapping from container name to frequency.
        """
        counter = Counter()
        for obj in self.objects:
            container = obj.get("container")
            if container:
                counter[container] += 1
        return counter

    def _description_stats(self) -> Tuple[int, int]:
        """Compute counts of objects with and without descriptions.

        Returns:
            Tuple[int, int]: (with_description, without_description)
        """
        with_desc = 0
        without_desc = 0
        for obj in self.objects:
            desc = obj.get("description")
            if desc:
                with_desc += 1
            else:
                without_desc += 1
        return with_desc, without_desc

    # ---------------------------------------------------------------------
    # Reporting
    # ---------------------------------------------------------------------

    def generate_report(self) -> None:
        """Generate summary report, CSV and optional charts.

        This is the main entry point that orchestrates all analyses and
        produces the outputs.  It writes a text summary to
        ``download_analysis.txt`` and a CSV file called
        ``download_statistics.csv``.  If ``generate_charts`` was set to
        ``True`` when initialising the analyser, bar charts will also be
        produced in PNG format.
        """
        # Ensure metadata directory exists
        self.metadata_path.mkdir(parents=True, exist_ok=True)

        # File statistics
        file_stats = self._file_statistics()
        file_sizes = self._file_size_distribution()

        # Metadata analysis
        obj_counts = self._objects_by_type()
        date_range = self._date_range()
        container_counts = self._container_counts()
        with_desc, without_desc = self._description_stats()

        # Write text summary
        lines: List[str] = []
        total = len(self.objects)
        lines.append(f"Total objects analysed: {total}")
        lines.append("")
        # Type counts
        lines.append("Objects by type:")
        for k, v in obj_counts.items():
            lines.append(f"  {k}: {v}")
        lines.append("")
        # File stats
        lines.append("File download success rates:")
        for ftype, res in file_stats.items():
            success = res["success"]
            failure = res["failure"]
            rate = (success / total * 100) if total > 0 else 0.0
            lines.append(f"  {ftype.upper()}: {success} success, {failure} failure (success rate {rate:.2f}% )")
        lines.append("")
        # Date range
        if date_range:
            lines.append(f"Creation date range: {date_range[0]} – {date_range[1]}")
        else:
            lines.append("No valid creation dates found.")
        lines.append("")
        # Container counts
        if container_counts:
            lines.append("Top containers/collections:")
            for container, count in container_counts.most_common(10):
                lines.append(f"  {container}: {count}")
        lines.append("")
        # Description stats
        lines.append(f"Objects with descriptions: {with_desc}")
        lines.append(f"Objects without descriptions: {without_desc}")
        lines.append("")
        # File size stats
        lines.append("File size distribution (bytes):")
        for key, sizes in file_sizes.items():
            if sizes:
                lines.append(f"  {key}: min={min(sizes)}, max={max(sizes)}, avg={sum(sizes)//len(sizes)}")
            else:
                lines.append(f"  {key}: no files")
        # Save report
        report_path = self.metadata_path / "download_analysis.txt"
        with open(report_path, "w", encoding="utf-8") as rf:
            rf.write("\n".join(lines))
        print(f"Analysis report written to {report_path}")

        # Write CSV summarising file statistics
        csv_path = self.metadata_path / "download_statistics.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as cf:
            writer = csv.writer(cf)
            writer.writerow(["FileType", "Success", "Failure"])
            for ftype, res in file_stats.items():
                writer.writerow([ftype, res["success"], res["failure"]])
        print(f"CSV statistics written to {csv_path}")

        # Generate charts if requested
        if self.generate_charts:
            self._generate_charts(file_stats, obj_counts)

    def _generate_charts(self, file_stats: Dict[str, Dict[str, int]], obj_counts: Dict[str, int]) -> None:
        """Create simple bar charts to visualise the statistics.

        Two charts are produced:

        1. Successful downloads per file type (RDF, TEI, LIDO, Image)
        2. Object counts per type (TEI, LIDO, Unknown)

        The resulting PNG files are saved in the ``metadata`` directory.

        Args:
            file_stats (Dict[str, Dict[str, int]]): Success and failure counts.
            obj_counts (Dict[str, int]): Counts of objects by type.
        """
        # Chart 1: file download successes
        labels = [ftype.upper() for ftype in file_stats.keys()]
        successes = [file_stats[ftype]["success"] for ftype in file_stats]
        plt.figure(figsize=(6, 4))
        plt.bar(labels, successes, color="#4C72B0")
        plt.title("Successful downloads per file type")
        plt.xlabel("File type")
        plt.ylabel("Number of successes")
        for i, val in enumerate(successes):
            plt.text(i, val + max(successes) * 0.01, str(val), ha="center", va="bottom", fontsize=8)
        chart1_path = self.metadata_path / "download_successes.png"
        plt.tight_layout()
        plt.savefig(chart1_path)
        plt.close()
        # Chart 2: object counts by model type
        obj_labels = list(obj_counts.keys())
        obj_values = [obj_counts[label] for label in obj_labels]
        plt.figure(figsize=(6, 4))
        plt.bar(obj_labels, obj_values, color="#55A868")
        plt.title("Objects by content type")
        plt.xlabel("Content model")
        plt.ylabel("Number of objects")
        for i, val in enumerate(obj_values):
            plt.text(i, val + max(obj_values) * 0.01 if obj_values else 0, str(val), ha="center", va="bottom", fontsize=8)
        chart2_path = self.metadata_path / "objects_by_type.png"
        plt.tight_layout()
        plt.savefig(chart2_path)
        plt.close()
        print(f"Charts saved to {chart1_path} and {chart2_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyse Hans Gross Kriminalmuseum downloads")
    parser.add_argument("--data-dir", type=str, default="km_archive", help="Path to the downloaded data directory")
    parser.add_argument("--charts", action="store_true", help="Generate bar charts")
    args = parser.parse_args()
    analyzer = KMAnalyzer(args.data_dir, generate_charts=args.charts)
    analyzer.generate_report()


if __name__ == "__main__":
    main()