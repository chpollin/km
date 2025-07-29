You are a data extraction assistant team specializing in downloading and organizing digital archive collections. Your task is to extract metadata from SPARQL XML files and systematically download digital objects from the Hans Gross Kriminalmuseum archive. 

## Data Overview

The Hans Gross Kriminalmuseum contains two types of digital objects:

### Karteikarten (Index Cards)
- **Model**: `info:fedora/cm:TEI`
- **Content**: Criminal case index cards from 1930s Austria
- **Available files**: RDF metadata, TEI source, images

### Objekte (Physical Objects)  
- **Model**: `info:fedora/cm:LIDO`
- **Content**: Museum artifacts (weapons, tools, evidence)
- **Available files**: RDF metadata, LIDO source, images

## URL Structure

For each object identifier `o:km.X`:
- **RDF**: `https://gams.uni-graz.at/o:km.X/RDF`
- **TEI Source**: `https://gams.uni-graz.at/o:km.X/TEI_SOURCE` (for Karteikarten)
- **LIDO Source**: `https://gams.uni-graz.at/o:km.X/LIDO_SOURCE` (for Objekte)
- **Images**: `https://gams.uni-graz.at/o:km.X/IMAGE.1` (try .jpg, .png, .tiff)

## SPARQL XML Structure

Each object in the XML contains:
```xml
<result>
  <container>Wildererobjekte</container>
  <pid uri="info:fedora/o:km.X"/>
  <model uri="info:fedora/cm:TEI|LIDO"/>
  <title>Object Title</title>
  <identifier>o:km.X</identifier>
  <createdDate>2017-01-19T19:15:24.353Z</createdDate>
  <description>Optional description</description>
</result>
```

## Required Folder Structure

```
km_archive/
├── metadata/
│   ├── all_objects.json
│   ├── all_objects.csv
│   └── download_summary.txt
├── karteikarten/
│   ├── rdf/
│   ├── tei/
│   └── images/
├── objekte/
│   ├── rdf/
│   ├── lido/
│   └── images/
└── logs/
    └── extraction.log
```

## Python Script Requirements

### Core Libraries
- `xml.etree.ElementTree` - Parse SPARQL XML
- `requests` - Download files
- `pathlib` - File management
- `json`, `csv` - Data export
- `logging` - Activity tracking

### Key Functions

1. **parse_sparql_xml()**: Extract object metadata from XML
2. **create_folder_structure()**: Set up organized directories
3. **download_object_files()**: Download RDF, TEI/LIDO, and images for each object
4. **save_metadata()**: Export data as JSON and CSV
5. **generate_summary()**: Create simple statistics report

### Error Handling
- Log failed downloads but continue processing
- Try multiple image formats (.jpg, .png, .tiff)
- Add 0.5 second delay between downloads
- Handle network timeouts gracefully

### Download Strategy
- Parse XML to get all object identifiers
- Determine object type (TEI vs LIDO) from model field
- Download appropriate source format (TEI_SOURCE or LIDO_SOURCE)
- Always download RDF metadata
- Try to download IMAGE.1 in common formats
- Save files using clean identifier as filename

## Basic Analysis Script

Create a separate analysis script that provides:

### File Statistics
- Total objects downloaded
- Success rate for each file type (RDF, TEI, LIDO, images)
- File size distribution
- Objects by type (Karteikarten vs Objekte)

### Simple Metadata Analysis
- Date range of objects (creation dates)
- Most common containers/collections
- Objects with/without descriptions
- Basic counts and percentages

### Output Format
- Text summary report
- Simple CSV with statistics
- Basic bar charts showing file type distributions

## Code Structure

### Main Extractor Script
```python
class KMExtractor:
    def __init__(self, output_dir)
    def parse_sparql_xml(xml_file)
    def download_object_data(object_metadata)
    def save_metadata(objects_list)
    def run_extraction(xml_file)
```

### Simple Analysis Script
```python
class KMAnalyzer:
    def __init__(self, data_dir)
    def analyze_downloads()
    def analyze_metadata()
    def generate_report()
```

## Expected Output

After running the extraction:
1. All available files downloaded and organized
2. Complete metadata in JSON/CSV format  
3. Summary report showing what was successful
4. Clear logs for troubleshooting

The analysis should provide a simple overview of the collection without complex visualizations or advanced processing - just basic statistics and file inventories that help understand what was downloaded.