# Hans Gross Kriminalmuseum Archive - Data Documentation

## Overview

The Hans Gross Kriminalmuseum Archive contains **3,892 digitized objects** from the criminal museum collection at the University of Graz. This digital archive represents a complete dataset of historical criminological materials, including both index cards documenting criminal cases and physical museum objects.

## Data Sources

**Primary Repository**: GAMS (Geisteswissenschaftliches Asset Management System) at University of Graz  
**Base URL**: https://gams.uni-graz.at  
**Extraction Date**: July 2025  
**Data Formats**: TEI XML (index cards), LIDO XML (museum objects), RDF metadata, high-resolution JPEG images

## Collection Structure

### Object Types

**Karteikarten (Index Cards)**: 1,657 objects (42.6%)
- Historical criminal case records
- TEI-encoded XML documents
- Complete textual content including court records, suspect information, and case details
- Physical dimensions and material descriptions
- Associated RDF metadata

**Museum Objects**: 2,235 objects (57.4%)
- Physical criminological artifacts
- LIDO-encoded XML metadata
- Detailed object descriptions including materials, measurements, and conditions
- Conservation and digitization history
- High-resolution photographs

## Metadata Fields

### Core Identification
Every object includes a unique persistent identifier, container type classification, and fedora repository reference. Objects are categorized by their source context and assigned model types based on their encoding standard.

### Descriptive Metadata
**Titles**: Complete extraction achieved for all 3,892 objects. Index cards display standardized titles with museum catalog numbers. Museum objects show descriptive titles including object type and catalog identifiers.

**Descriptions**: Comprehensive descriptions generated from multiple metadata sources. Index cards feature structured criminal case information including crimes, suspects, courts, and legal outcomes. Museum objects include technical specifications, materials, physical conditions, and historical context.

**Dates**: Temporal information extracted from digitization records, restoration activities, and original creation dates where available. All objects include at least one temporal reference point.

### Textual Content
**Full-text extraction** achieved for 2,305 objects, primarily index cards containing complete criminal case records. This includes court documents, suspect testimonies, legal proceedings, and investigative details suitable for comprehensive text searching.

### Technical Metadata
**Digital Assets**: 99.7% of objects include high-resolution images. All index cards include TEI source files and RDF metadata. All museum objects include LIDO metadata files.

**File Downloads**: Complete success rates achieved for all metadata downloads. RDF files available for all index cards. TEI and LIDO source files successfully extracted for their respective object types.

## Data Quality

### Extraction Success Rates
- **Titles**: 100% extraction success
- **Descriptions**: 100% extraction success  
- **Dates**: 100% extraction success
- **Images**: 99.7% availability
- **Full-text**: 59.2% coverage (concentrated in index cards)

### Content Assessment
The archive demonstrates excellent metadata completeness with comprehensive coverage of descriptive fields. Title extraction benefits from structured XML encoding. Description generation utilizes multiple metadata sources for rich contextual information.

Full-text extraction focuses on index cards containing extensive criminal case documentation, providing detailed historical records suitable for research applications.

## Research Applications

### Criminal History Research
Index cards provide detailed criminal case records including suspect demographics, crime types, court proceedings, and legal outcomes. Geographic information includes court jurisdictions and case locations throughout Austria.

### Material Culture Studies
Museum objects document criminological tools, weapons, and investigative equipment with detailed physical descriptions, materials analysis, and conservation history.

### Digital Humanities
Complete metadata structure supports advanced searching, filtering, and analysis. Full-text content enables comprehensive text mining and historical research methodologies.

## Technical Structure

### File Organization
The archive maintains separate directories for each object type with organized subdirectories for different file formats. Metadata aggregation enables unified access while preserving original XML encoding standards.

### Access Methods
Objects accessible through persistent identifiers linking to original GAMS repository. Local archive provides enhanced search capabilities and aggregated metadata views.

### Data Formats
Metadata available in both JSON and CSV formats for different research applications. Original XML files preserved for detailed scholarly analysis. High-resolution images maintain museum-quality documentation standards.

## Archive Statistics

**Total Objects**: 3,892  
**Index Cards**: 1,657 with complete criminal case records  
**Museum Objects**: 2,235 with detailed physical descriptions  
**Images Available**: 3,881 high-resolution photographs  
**Full-text Records**: 2,305 searchable documents  
**Metadata Completeness**: 100% for core descriptive fields

## Usage Notes

### Research Context
This archive represents historical criminological materials primarily from the early-to-mid 20th century. Content includes sensitive historical information related to criminal cases and law enforcement practices of the era.

### Search Capabilities
Enhanced metadata structure supports filtering by object type, temporal ranges, and content availability. Full-text search enables comprehensive exploration of criminal case documentation.

### Data Integrity
All extraction processes logged with comprehensive quality assessment. Metadata validation ensures consistency across object types and encoding standards.