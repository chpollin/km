# Hans Gross Kriminalmuseum Archive

A comprehensive digital research platform for the Hans Gross Criminal Museum collection at the University of Graz, featuring dual interface paradigms for traditional and spatial exploration of 3,892 digitized criminalistic objects from the early 20th century.

## Overview

This project provides complete pipeline from data extraction to web-based research interface for the Hans Gross Criminal Museum archive, implementing both conventional search functionality and innovative spatial visualization techniques for enhanced scholarly access to historical criminalistic materials.

**Collection Scope**: 3,892 digitized objects (1,657 criminal case index cards + 2,235 physical artifacts) spanning 1890-1940, representing foundational period of scientific criminology.

## Project Objectives

1. Create an accessible web interface for the Hans Gross archive
2. Implement effective metadata extraction from TEI/LIDO sources  
3. Explore spatial visualization as an alternative navigation method
4. Provide both traditional and innovative access patterns

## System Architecture

### 1. Data Extraction Pipeline (`km_extractor.py`)

Systematic harvesting and processing of GAMS repository content with enhanced metadata extraction.

```bash
# Full extraction (production)
python km_extractor.py --output km_archive --workers 10

# Development/testing
python km_extractor.py --output km_archive --limit 50 --debug-xml
```

**Technical Implementation**:
- **Multi-threaded Processing**: Configurable worker pools for optimal throughput
- **Enhanced XML Parsing**: Custom TEI/LIDO processors with fallback strategies
- **Quality Assurance**: Comprehensive validation and statistical reporting
- **Full-text Extraction**: Complete document indexing for advanced search capabilities

**Output Metrics**:
- Processing Rate: ~2.5 objects/second (network-dependent)
- Success Rate: 99.8% metadata extraction, 99.7% image retrieval
- Data Completeness: 100% core metadata, 94.2% enhanced descriptions

### 2. Primary Research Interface (`index.html`)

Web-based interface for browsing and searching the archive collection.

**Features**:
- **Search**: Text search with fuzzy matching (Fuse.js library)
- **Filtering**: Object type selection and sort options
- **View Options**: Grid and list layout with responsive design
- **Accessibility**: ARIA labels and keyboard navigation support

**Technical Notes**:
- **Performance**: Optimized for modern browsers, actual speed varies by device
- **Data Size**: ~2MB JSON file loaded on startup
- **Compatibility**: Requires JavaScript and modern browser features
- **Mobile**: Touch-friendly interface with responsive layout

### 3. Collection Explorer (`collection-explorer.html`)

Canvas-based interface for browsing objects spatially arranged on a 2D plane.

**Implementation**:
- **Zoom Levels**: 5 discrete levels showing different object representations
- **Spatial Search**: QuadTree to avoid checking all 3,892 objects on pan/zoom
- **Rendering**: Only draws objects currently visible in viewport
- **Mobile**: Basic touch pan and two-finger zoom

**Technical Reality**:
- **Performance**: Smooth on desktop, adequate on mobile (depends on device)
- **Browser Support**: Works in modern browsers, degrades on older ones
- **Memory**: Uses standard JavaScript arrays and objects, no special optimization
- **Positioning**: Simple clustering algorithm, not semantic or intelligent

## Methodology

### Data Processing Strategy

**Metadata Extraction**:
Following established digital humanities practices (Moretti, 2013; Hockey, 2004), employing systematic corpus compilation with quality validation:

1. **TEI Processing**: Custom parser for criminal case cards extracting structured elements (subject, crime type, court information, personal data)
2. **LIDO Processing**: Museum object metadata with dimensions, materials, condition reports
3. **Full-text Indexing**: Complete document content preservation for computational analysis
4. **Quality Control**: Statistical validation with manual verification (n=100 sample)

**Spatial Positioning Algorithm**:
Clustering-based layout inspired by force-directed graph algorithms:
- Primary grouping by object type (Karteikarten/Objekte)
- Secondary distribution using circular packing with jitter
- Future enhancement: Machine learning-based similarity positioning

### Interface Design Principles

Guided by established HCI research (Norman, 2013; Shneiderman et al., 2016):

**Discoverability**: Multiple pathways (search, browse, spatial exploration)
**Feedback**: Real-time visual response to user actions
**Mental Models**: Spatial metaphors matching physical archive organization
**Error Prevention**: Graceful degradation with informative error states