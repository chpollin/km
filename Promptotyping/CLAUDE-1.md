# CLAUDE-1.md
## Hans Gross Kriminalmuseum Archive Research Tool

### Project Overview
Digital research interface for the Hans Gross Criminal Museum archive (University of Graz). Built as SPA for GitHub Pages hosting with museum-inspired design.

### Technical Stack
- **Frontend**: Vanilla JS (ES6+), CSS Grid/Flexbox, HTML5
- **Search**: Fuse.js for client-side fuzzy search
- **Data**: Static JSON from Python extractor (`km_extractor.py`)
- **Hosting**: GitHub Pages (static files only)
- **Dependencies**: Minimal (Fuse.js CDN only)

### Architecture
```
km_extractor.py → all_objects.json → SPA Interface
                ↓
    metadata/all_objects.json (3,892 objects)
                ↓
    ArchiveApp class → UI Components
```

### Data Structure
- **Total Objects**: 3,892 (1,657 Karteikarten + 2,235 Objekte)
- **Completeness**: 99.7% with images, 100% with source files
- **Source**: GAMS repository (gams.uni-graz.at)
- **Types**: TEI (index cards) + LIDO (museum objects)

### Design System
- **Colors**: Museum orange (#e65100), professional grays
- **Typography**: System fonts, academic hierarchy
- **Layout**: Responsive grid (280px min cards)
- **Accessibility**: WCAG 2.1 AA compliant

### Features Implemented
✅ **Data loading** from JSON with validation  
✅ **Statistics dashboard** with live counts  
✅ **Basic search** (text matching, debounced)  
✅ **Responsive layout** (mobile-first)  
✅ **Error handling** with user feedback  
✅ **Console analytics** for data insights  

### Features Planned
🔲 Advanced search with Fuse.js fuzzy matching  
🔲 Object cards with images and metadata  
🔲 Modal detail viewer with GAMS links  
🔲 Faceted filtering (type, availability, date)  
🔲 Sort options (ID, title, date, relevance)  
🔲 Pagination for large result sets  

### File Structure
```
├── index.html              # Main SPA interface
├── styles.css              # Museum-inspired design system
├── app.js                  # Core application logic
├── metadata/
│   └── all_objects.json    # Archive data (3,892 objects)
├── REQUIREMENTS.md         # Feature specifications
├── DESIGN.md              # Visual design system
└── README.md              # Project documentation
```

### Performance Metrics
- **Load time**: <2s on 3G connection
- **Search**: <300ms for 3,892 objects
- **Bundle size**: <100KB (excluding data)
- **Memory**: Efficient data structures

### Browser Support
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Progressive enhancement for older browsers
- Full keyboard navigation and screen reader support

### Development Status
**MVP Phase**: Data foundation complete, UI implementation in progress  
**Next**: Object cards, search enhancement, modal viewer  
**Timeline**: 2-week development sprint for full functionality  

### Deployment
GitHub Pages ready with automated builds. All assets static, no server-side dependencies.

# GitHub Commits

### Features Implemented
✅ **Data loading** from JSON with validation  
✅ **Statistics dashboard** with live counts  
✅ **Search functionality** (text matching, debounced, clear button)  
✅ **Object cards** with images, titles, descriptions, availability indicators  
✅ **Pagination** (24 items/page, 163 pages total)  
✅ **Interactive elements** (click handlers, keyboard navigation)  
✅ **Toast notifications** for user feedback  
✅ **Image handling** (GAMS URLs, fallbacks)  
✅ **Responsive layout** (mobile-first)  
✅ **Error/empty states** with user feedback  

### Features Planned
🔲 Modal detail viewer with GAMS links  
🔲 Advanced search with Fuse.js fuzzy matching  
🔲 Faceted filtering (type, availability, date)  
🔲 Sort options (ID, title, date, relevance)

fix: correct GAMS image URL format

- Fix getImageUrl() to strip 'info:fedora/' prefix from pid
- Change from: gams.uni-graz.at/info:fedora/o:km.5/IMAGE.1  
- Change to: gams.uni-graz.at/o:km.5/IMAGE.1
- Images now load correctly in object cards

URLs now use proper GAMS format: {domain}/{object_id}/IMAGE.1

- Add complete modal dialog with object metadata display
- Implement image viewing with GAMS URL integration
- Add dynamic download links generation (Image, TEI, LIDO, RDF)
- Include keyboard navigation (ESC close, arrow keys for object navigation)
- Add modal event handlers and focus management
- Implement previous/next object navigation within filtered results
- Add proper accessibility attributes and ARIA support
- Include error handling for missing images and data


---
*Generated via Claude AI assistance for KI im Museum training series*