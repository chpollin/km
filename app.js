/**
 * Hans Gross Kriminalmuseum Archive - Main Application
 * A research tool for exploring the digitized Hans Gross Criminal Museum collection
 */

class ArchiveApp {
    constructor() {
        this.objects = [];
        this.filteredObjects = [];
        this.currentPage = 1;
        this.itemsPerPage = 24;
        this.currentView = 'grid';
        this.searchQuery = '';
        this.filters = {
            objectType: {
                karteikarten: true,
                objekte: true
            },
            availability: {
                hasImage: false,
                hasSource: false,
                hasRdf: false
            }
        };
        this.sortBy = 'identifier';
        
        // Initialize the application
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('🏛️ Initializing Hans Gross Kriminalmuseum Archive...');
        
        try {
            // Load the archive data
            await this.loadArchiveData();
            
            // Initialize UI components
            this.initializeEventListeners();
            this.updateStatistics();
            this.renderResults();
            
            console.log('✅ Archive application initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize archive application:', error);
            this.showError('Failed to load archive data. Please try refreshing the page.');
        }
    }

    /**
     * Load archive data from all_objects.json
     */
    async loadArchiveData() {
        console.log('📂 Loading archive data from all_objects.json...');
        
        try {
            const response = await fetch('km_archive/metadata/all_objects.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Validate data structure
            if (!Array.isArray(data)) {
                throw new Error('Invalid data format: expected an array of objects');
            }
            
            this.objects = data;
            this.filteredObjects = [...this.objects];
            
            console.log(`📊 Loaded ${this.objects.length} objects from archive`);
            console.log('📋 Sample object structure:', this.objects[0]);
            console.log('🔍 Object types found:', this.getObjectTypeCounts());
            console.log('📈 Download statistics:', this.getDownloadStatistics());
            
            // Log detailed breakdown
            this.logDataBreakdown();
            
        } catch (error) {
            console.error('❌ Error loading archive data:', error);
            throw error;
        }
    }

    /**
     * Get counts of different object types
     */
    getObjectTypeCounts() {
        const counts = {
            total: this.objects.length,
            karteikarten: 0,
            objekte: 0,
            unknown: 0
        };

        this.objects.forEach(obj => {
            switch (obj.container) {
                case 'karteikarten':
                    counts.karteikarten++;
                    break;
                case 'objekte':
                    counts.objekte++;
                    break;
                default:
                    counts.unknown++;
            }
        });

        return counts;
    }

    /**
     * Get download statistics
     */
    getDownloadStatistics() {
        const stats = {
            withImages: 0,
            withTEI: 0,
            withLIDO: 0,
            withRDF: 0,
            complete: 0
        };

        this.objects.forEach(obj => {
            if (obj.image_downloaded) stats.withImages++;
            if (obj.tei_downloaded) stats.withTEI++;
            if (obj.lido_downloaded) stats.withLIDO++;
            if (obj.rdf_downloaded) stats.withRDF++;
            
            // Complete means has image and source (TEI or LIDO)
            if (obj.image_downloaded && (obj.tei_downloaded || obj.lido_downloaded)) {
                stats.complete++;
            }
        });

        return stats;
    }

    /**
     * Log detailed data breakdown
     */
    logDataBreakdown() {
        console.group('📊 Detailed Archive Analysis');
        
        // Sample objects by type
        const karteikarten = this.objects.filter(obj => obj.container === 'karteikarten');
        const objekte = this.objects.filter(obj => obj.container === 'objekte');
        
        console.log('📋 Sample Karteikarte:', karteikarten[0]);
        console.log('🏛️ Sample Objekt:', objekte[0]);
        
        // Date range analysis
        const dates = this.objects
            .map(obj => obj.createdDate)
            .filter(date => date && date.trim())
            .sort();
        
        if (dates.length > 0) {
            console.log('📅 Date range:', {
                earliest: dates[0],
                latest: dates[dates.length - 1],
                totalWithDates: dates.length
            });
        }
        
        // Title analysis
        const titlesWithContent = this.objects.filter(obj => obj.title && obj.title.trim()).length;
        const descriptionsWithContent = this.objects.filter(obj => obj.description && obj.description.trim()).length;
        
        console.log('📝 Content analysis:', {
            objectsWithTitles: titlesWithContent,
            objectsWithDescriptions: descriptionsWithContent,
            averageTitleLength: this.objects
                .filter(obj => obj.title)
                .reduce((sum, obj) => sum + obj.title.length, 0) / titlesWithContent || 0
        });
        
        // Model analysis
        const models = {};
        this.objects.forEach(obj => {
            const model = obj.model || 'unknown';
            models[model] = (models[model] || 0) + 1;
        });
        
        console.log('🔗 Model distribution:', models);
        
        console.groupEnd();
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        console.log('🎧 Setting up event listeners...');
        
        // Search input
        const searchInput = document.getElementById('main-search');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.handleSearch(e.target.value);
            }, 300));
        }
        
        // Clear search button
        const clearButton = document.querySelector('.search-clear');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    this.handleSearch('');
                    clearButton.style.display = 'none';
                }
            });
        }
        
        // Show/hide clear button based on search input
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (clearButton) {
                    clearButton.style.display = e.target.value ? 'block' : 'none';
                }
            });
        }

        // Pagination controls
        const prevButton = document.getElementById('prev-page');
        const nextButton = document.getElementById('next-page');
        
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderResults();
                    this.scrollToTop();
                }
            });
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const totalPages = Math.ceil(this.filteredObjects.length / this.itemsPerPage);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.renderResults();
                    this.scrollToTop();
                }
            });
        }

        console.log('✅ Event listeners initialized');
    }

    /**
     * Scroll to top of results
     */
    scrollToTop() {
        const resultsSection = document.querySelector('.results-section');
        if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Handle search input
     */
    handleSearch(query) {
        console.log('🔍 Search query:', query);
        this.searchQuery = query.trim();
        this.applyFilters();
    }

    /**
     * Apply current filters and search
     */
    applyFilters() {
        console.log('🔄 Applying filters and search...');
        
        let filtered = [...this.objects];
        
        // Apply search if query exists
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(obj => {
                const searchableText = [
                    obj.title || '',
                    obj.description || '',
                    obj.identifier || '',
                    obj.createdDate || ''
                ].join(' ').toLowerCase();
                
                return searchableText.includes(query);
            });
        }
        
        this.filteredObjects = filtered;
        this.currentPage = 1;
        
        console.log(`📊 Filter results: ${this.filteredObjects.length} objects found`);
        
        this.updateStatistics();
        this.renderResults();
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        const counts = this.getObjectTypeCounts();
        
        // Update header count
        const objectCount = document.getElementById('object-count');
        if (objectCount) {
            objectCount.textContent = `${counts.total} objects in archive`;
        }
        
        // Update sidebar statistics
        document.getElementById('total-count').textContent = counts.total;
        document.getElementById('cards-count').textContent = counts.karteikarten;
        document.getElementById('objects-count').textContent = counts.objekte;
        
        // Update results info
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            if (this.searchQuery) {
                resultsCount.textContent = `${this.filteredObjects.length} objects found for "${this.searchQuery}"`;
            } else {
                resultsCount.textContent = `${this.filteredObjects.length} objects in collection`;
            }
        }
        
        console.log('📊 Statistics updated');
    }

    /**
     * Render search results
     */
    renderResults() {
        console.log('🎨 Rendering results...');
        
        // Hide loading state
        const loadingState = document.getElementById('loading-state');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
        
        // Show results container
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.style.display = 'block';
        }
        
        // Check if we have results
        if (this.filteredObjects.length === 0) {
            this.showEmptyState();
            return;
        }
        
        // Hide empty state
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Render object cards
        this.renderObjectCards();
        this.updatePagination();
        
        console.log('✅ Results rendered');
    }

    /**
     * Render object cards
     */
    renderObjectCards() {
        console.log('🎴 Rendering object cards...');
        
        const objectGrid = document.getElementById('object-grid');
        if (!objectGrid) return;
        
        const paginatedObjects = this.getPaginatedObjects();
        
        if (paginatedObjects.length === 0) {
            objectGrid.innerHTML = '<p>No objects to display</p>';
            return;
        }
        
        objectGrid.innerHTML = paginatedObjects.map(obj => this.createObjectCard(obj)).join('');
        
        // Attach event listeners to cards
        this.attachCardEventListeners();
        
        console.log(`📦 Rendered ${paginatedObjects.length} object cards`);
    }

    /**
     * Create HTML for a single object card
     */
    createObjectCard(obj) {
        const title = obj.title || 'Untitled Object';
        const description = obj.description || 'No description available';
        const imageUrl = this.getImageUrl(obj);
        
        return `
            <article class="object-card" data-object-id="${obj.identifier}" tabindex="0">
                <div class="card-image">
                    ${obj.image_downloaded ? 
                        `<img src="${imageUrl}" alt="${title}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div class="image-placeholder" style="display: none;">
                             <span class="placeholder-icon" aria-hidden="true">🖼️</span>
                             <span>Image unavailable</span>
                         </div>` :
                        `<div class="image-placeholder">
                             <span class="placeholder-icon" aria-hidden="true">🖼️</span>
                             <span>No image available</span>
                         </div>`
                    }
                    <div class="image-overlay">
                        <button class="quick-view-btn" aria-label="Quick view ${title}" title="View details">
                            <span aria-hidden="true">👁️</span>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <span class="object-id">${obj.identifier}</span>
                        <span class="object-type ${obj.container}">
                            ${obj.container === 'karteikarten' ? 'Karteikarte' : 'Objekt'}
                        </span>
                    </div>
                    <h3 class="card-title">${title}</h3>
                    <p class="card-description">${this.truncateText(description, 120)}</p>
                    ${obj.createdDate ? `<div class="card-meta">
                        <span class="creation-date">Created: ${obj.createdDate}</span>
                    </div>` : ''}
                    <div class="availability-indicators">
                        ${obj.image_downloaded ? 
                            '<span class="available" title="Image available">IMG</span>' : 
                            '<span class="missing" title="No image">IMG</span>'
                        }
                        ${obj.tei_downloaded || obj.lido_downloaded ? 
                            '<span class="available" title="Source data available">SRC</span>' : 
                            '<span class="missing" title="No source data">SRC</span>'
                        }
                        ${obj.rdf_downloaded ? 
                            '<span class="available" title="RDF data available">RDF</span>' : 
                            '<span class="missing" title="No RDF data">RDF</span>'
                        }
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * Get paginated objects for current page
     */
    getPaginatedObjects() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.filteredObjects.slice(startIndex, endIndex);
    }

    /**
     * Update pagination controls
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredObjects.length / this.itemsPerPage);
        const paginationElement = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            if (paginationElement) {
                paginationElement.style.display = 'none';
            }
            return;
        }
        
        if (paginationElement) {
            paginationElement.style.display = 'flex';
        }
        
        // Update pagination status
        const statusElement = document.getElementById('pagination-status');
        if (statusElement) {
            statusElement.textContent = `Page ${this.currentPage} of ${totalPages}`;
        }
        
        // Update button states
        const prevButton = document.getElementById('prev-page');
        const nextButton = document.getElementById('next-page');
        
        if (prevButton) {
            prevButton.disabled = this.currentPage === 1;
        }
        
        if (nextButton) {
            nextButton.disabled = this.currentPage === totalPages;
        }
        
        console.log(`📄 Pagination: Page ${this.currentPage} of ${totalPages}`);
    }

    /**
     * Attach event listeners to object cards
     */
    attachCardEventListeners() {
        const cards = document.querySelectorAll('.object-card');
        
        cards.forEach(card => {
            // Card click handler
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking the quick view button
                if (e.target.closest('.quick-view-btn')) return;
                
                const objectId = card.dataset.objectId;
                console.log('🎯 Card clicked:', objectId);
                // TODO: Open modal (will implement next)
                this.showToast('success', 'Object Selected', `Selected ${objectId} - Modal coming soon!`);
            });
            
            // Keyboard navigation
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            });
            
            // Quick view button
            const quickViewBtn = card.querySelector('.quick-view-btn');
            if (quickViewBtn) {
                quickViewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const objectId = card.dataset.objectId;
                    console.log('👁️ Quick view:', objectId);
                    // TODO: Open modal (will implement next)
                    this.showToast('info', 'Quick View', `Quick view for ${objectId} - Modal coming soon!`);
                });
            }
        });
    }

    /**
     * Show empty state when no results
     */
    showEmptyState() {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        
        const objectGrid = document.getElementById('object-grid');
        if (objectGrid) {
            objectGrid.innerHTML = '';
        }
        
        const pagination = document.getElementById('pagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
    }

    /**
     * Get image URL for object
     */
    getImageUrl(obj) {
        // GAMS URL pattern for images
        const imageId = obj.identifier.replace('o:km.', '');
        return `https://gams.uni-graz.at/archive/objects/${obj.container}/${imageId}/IMAGE.1`;
    }

    /**
     * Truncate text to specified length
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    /**
     * Show toast notification
     */
    showToast(type, title, message) {
        console.log(`🍞 Toast: [${type.toUpperCase()}] ${title}: ${message}`);
        
        // For now, just console log. Will implement toast UI later
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            const toast = document.createElement('div');
            toast.className = `toast ${type} show`;
            toast.innerHTML = `
                <div class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</div>
                <div class="toast-content">
                    <div class="toast-title">${title}</div>
                    <p class="toast-message">${message}</p>
                </div>
                <button class="toast-close" aria-label="Close notification">×</button>
            `;
            
            // Add click to close
            toast.querySelector('.toast-close').addEventListener('click', () => {
                toast.remove();
            });
            
            toastContainer.appendChild(toast);
            
            // Auto remove after 4 seconds
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 4000);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('💥 Error:', message);
        
        // Hide loading state
        const loadingState = document.getElementById('loading-state');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
        
        // Show error state
        const errorState = document.getElementById('error-state');
        if (errorState) {
            errorState.style.display = 'block';
            const errorMessage = errorState.querySelector('p');
            if (errorMessage) {
                errorMessage.textContent = message;
            }
        }
    }

    /**
     * Utility: Debounce function for search input
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, starting archive application...');
    window.archiveApp = new ArchiveApp();
});

// Handle page errors
window.addEventListener('error', (event) => {
    console.error('💥 Global error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Unhandled promise rejection:', event.reason);
    event.preventDefault();
});