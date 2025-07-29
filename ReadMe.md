Here is the **perfected, compact `README.md`** that includes **only the information explicitly stated** in your original text — **no inferred performance estimates, no speculative enhancements, no added interpretations**. It is structurally clean, hierarchically organized, and preserves every factual detail exactly as presented.

---

````markdown
# Hans Gross Kriminalmuseum Digital Archive

A comprehensive digital research platform for the Hans Gross Criminal Museum collection at the University of Graz, featuring dual interface paradigms for traditional and spatial exploration of 3,892 digitized criminalistic objects from the early 20th century.

---

## Overview

- **Collection Scope**: 3,892 digitized objects  
  - 1,657 criminal case index cards (TEI)  
  - 2,235 physical artifacts (LIDO)  
- **Date Range**: 1890–1940  
- **Purpose**: Provide searchable and spatial access to historical materials from the foundational period of scientific criminology  
- **Interfaces**:  
  - `index.html` – traditional search  
  - `collection-explorer.html` – spatial visualization  
- **Pipeline**: Data extraction → metadata enrichment → web interface  

---

## Project Objectives

1. Create an accessible web interface for the archive  
2. Extract metadata from TEI and LIDO sources  
3. Explore spatial visualization as alternative navigation  
4. Provide both traditional and innovative access patterns  

---

## System Architecture

### 1. Data Extraction (`km_extractor.py`)

```bash
# Full extraction (production)
python km_extractor.py --output km_archive --workers 10

# Development/testing
python km_extractor.py --output km_archive --limit 50 --debug-xml
````

* Multi-threaded processing (`--workers`)
* Enhanced XML parsing for TEI and LIDO with fallback
* Full-text extraction for advanced search
* Output used by both interface layers

---

### 2. Primary Research Interface (`index.html`)

* **Search**: Text search with fuzzy matching via Fuse.js
* **Filtering**: By object type and sort order
* **Views**: Grid and list modes
* **Accessibility**: ARIA labels, keyboard navigation
* **Technical Notes**:

  * \~2MB JSON file loaded on startup
  * JavaScript required
  * Responsive design, mobile/touch friendly
  * Optimized for modern browsers

---

### 3. Collection Explorer (`collection-explorer.html`)

* **Canvas-based 2D interface**
* **Zoom Levels**: 5 discrete zoom stages
* **Spatial Search**: Uses QuadTree to avoid checking all objects
* **Rendering**: Only objects in current viewport are drawn
* **Touch Support**: Pan and two-finger zoom on mobile
* **Browser Support**: Works in modern browsers, degrades on older ones
* **Memory Use**: Standard JS arrays/objects (no special optimization)
* **Positioning**: Simple clustering algorithm, not semantically intelligent

#### Layout Options

* **Grid**: Categorical grouping by type × time
* **Timeline**: Chronological positioning
* **Radial**: Circular clusters by categories
* **Cluster**: Spiral grouping by object type

---

### 4. Dynamic Layout System

* `explorer-categories.js`: Extracts temporal, crime type, and geographic categories
* `explorer-layouts.js`: Implements grid, timeline, radial, cluster algorithms
* `explorer-controls.js`: Enables real-time layout switching and configuration

---

## Methodology

### Metadata Extraction

* **TEI Processing**: Extracts subject, crime type, court, personal data from criminal case cards
* **LIDO Processing**: Extracts dimensions, materials, condition reports from museum objects
* **Full-text Indexing**: All document content preserved for analysis
* **Validation**: Statistical checks + manual verification on sample (n = 100)

### Spatial Positioning Algorithm

* Clustering inspired by force-directed graph layouts
* Primary grouping: object type (Karteikarten/Objekte)
* Secondary positioning: circular packing with jitter

---

## Interface Design Principles

Guided by human-computer interaction research:

* **Discoverability**: Search, browse, spatial navigation
* **Feedback**: Real-time visual response to actions
* **Mental Models**: Spatial metaphors reflect archive structure
* **Error Prevention**: Graceful degradation and informative errors
