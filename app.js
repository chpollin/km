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
                searchInput.value = '';
                this.handleSearch('');
            });
        }

        console.log('✅ Event listeners initialized');
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
        
        // For now, just show a simple message
        const objectGrid = document.getElementById('object-grid');
        if (objectGrid) {
            objectGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; background: white; border-radius: 0.75rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <h3>🚧 Archive Loaded Successfully!</h3>
                    <p>Found ${this.filteredObjects.length} objects in the collection.</p>
                    <p style="color: #757575; font-size: 0.875rem;">
                        Check the browser console for detailed data analysis.
                    </p>
                </div>
            `;
        }
        
        console.log('✅ Results rendered');
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