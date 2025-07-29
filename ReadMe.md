# Hans Gross Kriminalmuseum Archive Extractor

A Python tool for extracting and organizing digital objects from the Hans Gross Kriminalmuseum archive hosted on GAMS (Geisteswissenschaftliches Asset Management System) at the University of Graz.

## Project Background

This extractor was developed as part of an AI experiment for the "KI im Museum" (AI in Museums) training series. The project builds upon research from a 2017 master's thesis analyzing index cards of poaching records in the Criminal Museum. 

### AI Development Process
Instead of manually coding the extraction script, the tool was generated using AI agents:

- **Prompt Engineering**: Detailed prompt created with Claude Opus 4
- **Code Generation**: ChatGPT Agents automatically developed the Python script
- **Expert-in-the-Loop**: Success achieved through precise prompting and domain knowledge

## km_archive

The extractor creates the following organized directory structure:

```
km_archive/
├── metadata/
│   ├── all_objects.json          # Complete metadata in JSON format
│   ├── all_objects.csv           # Complete metadata in CSV format
│   └── download_summary.txt      # Extraction statistics
├── karteikarten/                 # TEI-based index cards
│   ├── rdf/                      # RDF metadata files
│   ├── tei/                      # TEI source documents
│   └── images/                   # Associated images
├── objekte/                      # LIDO-based museum objects
│   ├── lido/                     # LIDO source documents
│   └── images/                   # Associated images
└── logs/
    └── extraction.log            # Detailed extraction log
```

## Usage

### Basic Usage
```bash
python km_extractor.py
```

### Advanced Options
```bash
# Custom output directory with 10 workers, limit to 50 objects
python km_extractor.py --output my_archive --workers 10 --limit 50

# Test run with minimal objects
python km_extractor.py --limit 5
```

### Command Line Arguments
- `--output`: Output directory (default: `km_archive`)
- `--workers`: Number of concurrent threads (default: 5, range: 1-20 recommended)
- `--limit`: Maximum objects to process (default: unlimited, useful for testing)

### Data Sources
- **Base URL**: `https://gams.uni-graz.at`
- **Contexts**: `context:km.karteikarten`, `context:km.objekte`
- **Object Pattern**: `o:km.[number]` (extracted via regex: `r"o:km\.\d+"`)

### Object Types and Processing

#### 1. Karteikarten (Index Cards)
- **Model**: `info:fedora/cm:TEI`
- **Downloads**: RDF metadata, TEI source, images
- **Metadata Source**: TEI_SOURCE datastream
- **Storage**: `karteikarten/` subdirectories

#### 2. Objekte (Museum Objects)  
- **Model**: `info:fedora/cm:LIDO`
- **Downloads**: LIDO source, images (no RDF available)
- **Metadata Source**: LIDO_SOURCE datastream
- **Storage**: `objekte/` subdirectories

#### 3. Unknown Objects
- **Model**: Any other or unrecognized model
- **Downloads**: RDF (if available), images
- **Storage**: `unknown/` subdirectories

### Download Process

1. **Context Discovery**: 
   - Fetches METADATA datastream from each context
   - Extracts object IDs using regex pattern
   - Sorts by numeric ID for consistent ordering

2. **Model Detection**: 
   - Queries RELS-EXT datastream for each object
   - Parses XML to find `hasModel` relationships
   - Handles multiple namespace variations

3. **Metadata Extraction**: 
   - Fetches TEI_SOURCE or LIDO_SOURCE based on model
   - Parses XML to extract:
     - **TEI**: `tei:title`, `tei:abstract` or `tei:p`, `tei:date`
     - **LIDO**: `lido:title`, `lido:descriptiveNoteValue`, `lido:displayCreationDate`

4. **File Downloads**: 
   - **RDF**: Only for TEI objects (`/{identifier}/RDF`)
   - **TEI/LIDO**: Source documents (`/{identifier}/TEI_SOURCE` or `/{identifier}/LIDO_SOURCE`)
   - **Images**: Primary images (`/{identifier}/IMAGE.1[extension]`)

5. **Image Fallback Logic**:
   - Tries extensions in order: `["", ".jpg", ".png", ".tiff", ".jpeg"]`
   - Validates Content-Type header starts with `image`
   - Saves with detected or provided extension

### Rate Limiting and Timeouts
- **Download Delay**: 0.5 seconds between each file download
- **Timeouts**: 
  - Metadata requests: 30 seconds
  - File downloads: 60 seconds
- **Concurrent Limit**: Configurable worker threads with thread-safe statistics

### URL Patterns Used
```
Context metadata: /archive/objects/context:km.{context}/datastreams/METADATA/content
Object RELS-EXT:  /archive/objects/{identifier}/datastreams/RELS-EXT/content
RDF files:        /{identifier}/RDF
TEI sources:      /{identifier}/TEI_SOURCE
LIDO sources:     /{identifier}/LIDO_SOURCE
Images:           /{identifier}/IMAGE.1{extension}
```

## Output Metadata

Each object record contains:

### Core Fields
- `container`: Source context (`karteikarten` or `objekte`)
- `pid`: Fedora persistent identifier (`info:fedora/{identifier}`)
- `model`: Full model URI (e.g., `info:fedora/cm:TEI`)
- `identifier`: Object ID (e.g., `o:km.9`)

### Extracted Content
- `title`: Title extracted from TEI/LIDO source
- `description`: Description/abstract text
- `createdDate`: Creation or dating information

### Download Status Flags
- `rdf_downloaded`: Boolean (only attempted for TEI objects)
- `tei_downloaded`: Boolean (for TEI objects)
- `lido_downloaded`: Boolean (for LIDO objects)  
- `image_downloaded`: Boolean (for all objects)