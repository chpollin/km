# DESIGN.md
## Hans Gross Kriminalmuseum Archive Research Tool - Final Design Specification

### Design Philosophy
**Museum-inspired professionalism**: Clean, modern interface that honors the institutional heritage of the Hans Gross Criminal Museum while providing contemporary research functionality. The design balances academic authority with accessible usability.

### Visual Identity

#### Color System
```css
/* Primary - Museum Orange Theme */
--color-primary: #e65100        /* Museum orange - headers, CTAs */
--color-accent: #ff5722         /* Bright orange - highlights, focus */
--color-secondary: #616161      /* Museum gray - navigation, secondary */

/* Text & Backgrounds */
--color-text: #212121           /* High contrast primary text */
--color-text-muted: #757575     /* Secondary information */
--color-bg: #fafafa            /* Clean light background */
--color-surface: #ffffff        /* Card backgrounds */

/* Status Colors */
--color-success: #10b981        /* Karteikarten indicators */
--color-warning: #f59e0b        /* Availability warnings */
--color-error: #ef4444          /* Missing content, errors */
```

#### Typography
```css
/* Font Stack */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Scale */
--text-4xl: 2.25rem     /* Page headers */
--text-2xl: 1.5rem      /* Section headers */
--text-xl: 1.25rem      /* Card titles */
--text-base: 1rem       /* Body text */
--text-sm: 0.875rem     /* Meta information */
--text-xs: 0.75rem      /* Labels, badges */

/* Weights */
--font-bold: 700        /* Headers, emphasis */
--font-semibold: 600    /* Subheaders, buttons */
--font-medium: 500      /* Labels, nav */
--font-normal: 400      /* Body text */
```

### Layout Architecture

#### Grid System
```
Desktop (1024px+)                Mobile (< 768px)
┌─────────────────────────┐      ┌─────────────────┐
│ Header (70px)           │      │ Header (64px)   │
├─────────────────────────┤      ├─────────────────┤
│ Search (120px)          │      │ Search (100px)  │
├─────┬───────────────────┤      ├─────────────────┤
│ 280 │ Flexible          │      │ Filter Toggle   │
│ px  │ Results Area      │      ├─────────────────┤
│     │                   │      │ Single Column   │
│ F   │ Object Grid       │      │ Results         │
│ i   │                   │      │                 │
│ l   │ Pagination        │      │                 │
│ t   │                   │      │                 │
│ e   │                   │      │                 │
│ r   │                   │      │                 │
│ s   │                   │      │                 │
└─────┴───────────────────┘      └─────────────────┘
```

### Component Specifications

#### Header Component
```html
<header class="app-header">
  <h1>🏛️ Hans Gross Kriminalmuseum Archive</h1>
  <div class="header-stats">Loading archive...</div>
</header>
```
- **Background**: Orange gradient (#e65100 → #bf360c)
- **Height**: 70px desktop, 64px mobile
- **Features**: Sticky positioning, orange accent border
- **Typography**: Bold title with museum icon

#### Search Interface
```html
<section class="search-section">
  <input placeholder="Search objects, titles, descriptions..." />
  <div class="search-results-info">Ready to search archive</div>
</section>
```
- **Background**: Light gradient with orange accent line
- **Input**: Large (24px font), rounded, orange focus ring
- **Clear button**: Orange circular button with white X
- **Padding**: Generous 120px vertical on desktop

#### Filter Sidebar
```html
<aside class="filters-sidebar">
  <div class="filter-section">
    <h3 class="filter-title">Collection Overview</h3>
    <div class="stats-grid">...</div>
  </div>
  <!-- Object Type, Availability, Sort sections -->
</aside>
```
- **Background**: White with subtle border
- **Statistics**: Large orange numbers, gradient backgrounds
- **Checkboxes**: Orange when checked, smooth animations
- **Titles**: Orange underline accent
- **Sticky**: Stays in viewport on scroll

#### Object Cards
```html
<article class="object-card">
  <div class="card-image">
    <img src="..." alt="..." />
  </div>
  <div class="card-content">
    <div class="card-header">
      <span class="object-id">o:km.123</span>
      <span class="object-type karteikarte">Karteikarte</span>
    </div>
    <h3 class="card-title">Object Title</h3>
    <p class="card-description">Description...</p>
    <div class="availability-indicators">...</div>
  </div>
</article>
```
- **Hover**: Lift 6px, orange-tinted shadow
- **Images**: 4:3 aspect ratio, fallback placeholders
- **Types**: Color-coded badges (Karteikarten: green, Objekte: orange)
- **Grid**: Auto-fill columns, 280px minimum width

#### Modal Dialog
```html
<div class="modal-overlay">
  <div class="modal-container">
    <header class="modal-header">...</header>
    <div class="modal-content">
      <div class="modal-image-section">...</div>
      <div class="modal-info-section">...</div>
    </div>
    <footer class="modal-navigation">...</footer>
  </div>
</div>
```
- **Layout**: Two-column desktop, single-column mobile
- **Image**: Zoom controls, fullscreen option
- **Metadata**: Structured grid layout
- **Downloads**: Direct GAMS links with icons
- **Navigation**: Previous/next object browsing

### Interaction Design

#### Animation System
```css
/* Hover Effects */
.object-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 25px 50px rgba(230, 81, 0, 0.15);
}

/* Focus States */
.search-input:focus {
  box-shadow: 0 0 0 4px rgba(230, 81, 0, 0.15);
  transform: translateY(-2px);
}

/* Button Interactions */
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px rgba(230, 81, 0, 0.3);
}
```

#### Loading States
- **Skeleton cards**: Shimmer animation during data load
- **Progressive enhancement**: Content appears as it loads
- **Error handling**: Clear messages with retry options
- **Empty states**: Helpful guidance for no results

#### Responsive Behavior
- **Mobile filters**: Collapsible accordion panel
- **Touch targets**: Minimum 44px for mobile interaction
- **Flexible grid**: Auto-adjusting columns based on screen size
- **Modal adaptation**: Full-screen on mobile devices

### Accessibility Features

#### WCAG 2.1 AA Compliance
- **Color contrast**: 4.5:1 minimum ratio for all text
- **Keyboard navigation**: Full functionality without mouse
- **Screen readers**: Proper ARIA labels and landmarks
- **Focus management**: Visible indicators, logical tab order

#### Semantic Structure
```html
<main role="main" aria-label="Archive search results">
  <section aria-label="Search interface">
    <h2 class="sr-only">Search Controls</h2>
  </section>
  <section aria-label="Object results" aria-live="polite">
    <h2 class="sr-only">Search Results</h2>
  </section>
</main>
```

### Performance Optimizations

#### Image Strategy
- **Lazy loading**: Intersection Observer for viewport entry
- **Aspect ratios**: CSS prevents layout shift
- **Fallbacks**: Elegant placeholders for missing images
- **Optimization**: WebP with JPEG fallback

#### Loading Performance
- **Critical CSS**: Inline essential styles
- **Font loading**: System fonts for immediate rendering
- **JavaScript**: Minimal dependencies (only Fuse.js)
- **Caching**: Leverage browser cache for static assets

### Brand Integration

#### Museum Heritage
- **Institutional colors**: Authentic orange from original site
- **Professional typography**: Academic weight and hierarchy
- **Scholarly layout**: Generous spacing, clear organization
- **Cultural respect**: Appropriate tone for historical content

#### Modern Usability
- **Contemporary patterns**: Familiar interaction models
- **Research workflow**: Tools researchers expect
- **Progressive disclosure**: Simple to advanced features
- **Mobile accessibility**: Full functionality on all devices

### Technical Implementation

#### CSS Architecture
```scss
/* Component-based structure */
.archive-header { }
.archive-search { }
.archive-filters { }
.archive-results { }
.object-card { }
.modal-dialog { }

/* Utility classes */
.sr-only { }        /* Screen reader only */
.text-center { }    /* Text alignment */
.mb-4 { }          /* Margin bottom */
```

#### JavaScript Patterns
- **Event delegation**: Efficient event handling
- **Progressive enhancement**: Works without JavaScript
- **Error boundaries**: Graceful failure handling
- **State management**: Simple object-based state

This design specification provides a complete blueprint for a professional, accessible, and museum-appropriate research interface that honors the Hans Gross Criminal Museum's institutional identity while delivering modern digital research capabilities.