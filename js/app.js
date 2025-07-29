/**
 * Hans Gross Kriminalmuseum Archive - Improved Main Application
 * A research tool for exploring the digitized Hans Gross Criminal Museum collection
 * Streamlined with essential filters only
 */

class ArchiveApp {
    constructor() {
        this.objects = [];
        this.filteredObjects = [];
        this.currentPage = 1;
        this.itemsPerPage = 24;
        this.currentView = 'grid';
        this.searchQuery = '';
        this.sortBy = 'identifier';
        this.sortDirection = 'asc';
        this.currentModalObjectIndex = 0;
        this.modalListenersInitialized = false;
        this.fuse = null;
        
        // Simplified filter structure - only essential filters
        this.filters = {
            objectType: {
                karteikarten: true,
                objekte: true
            }
        };
        
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
            
            // Initialize components
            this.initializeEventListeners();
            this.initializeFilters();
            this.initializeFuzzySearch();
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
            console.log(`📋 Sample object structure:`, this.objects[0]);
            
            // Log object type distribution
            const typeCount = this.getObjectTypeCounts();
            console.log(`🔍 Object types found:`, typeCount);
            
        } catch (error) {
            console.error('💥 Error loading archive data:', error);
            throw error;
        }
    }

    /**
     * Initialize fuzzy search with Fuse.js
     */
    initializeFuzzySearch() {
        if (typeof Fuse === 'undefined') {
            console.warn('⚠️ Fuse.js not loaded, falling back to basic search');
            return;
        }

        const fuseOptions = {
            keys: [
                { name: 'title', weight: 0.4 },
                { name: 'description', weight: 0.3 },
                { name: 'identifier', weight: 0.2 },
                { name: 'createdDate', weight: 0.1 }
            ],
            threshold: 0.3,
            includeScore: true,
            includeMatches: true,
            minMatchCharLength: 2
        };

        this.fuse = new Fuse(this.objects, fuseOptions);
        console.log('🔍 Fuzzy search initialized with Fuse.js');
    }

    /**
     * Initialize filter system - simplified
     */
    initializeFilters() {
        console.log('🎛️ Initializing filter system...');

        // Object type filters only
        document.querySelectorAll('[data-filter="karteikarten"], [data-filter="objekte"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.updateObjectTypeFilter(e.target.dataset.filter, e.target.checked);
            });
        });

        // Sort dropdown
        const sortSelect = document.getElementById('sort-options');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.updateSort(e.target.value);
            });
        }

        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        console.log('✅ Filter system initialized');
    }

    /**
     * Update object type filter
     */
    updateObjectTypeFilter(filterType, checked) {
        console.log(`🎯 Object type filter changed: ${filterType} = ${checked}`);
        
        this.filters.objectType[filterType] = checked;
        this.applyFilters();
        this.updateFilterCounts();
    }

    /**
     * Update sort order
     */
    updateSort(sortValue) {
        console.log(`📊 Sort changed to: ${sortValue}`);
        
        const [field, direction] = sortValue.includes('-desc') 
            ? [sortValue.replace('-desc', ''), 'desc']
            : [sortValue, 'asc'];
        
        this.sortBy = field;
        this.sortDirection = direction;
        this.applyFilters();
    }

    /**
     * Clear all filters - simplified
     */
    clearAllFilters() {
        console.log('🧹 Clearing all filters...');
        
        // Reset filter state
        this.filters = {
            objectType: {
                karteikarten: true,
                objekte: true
            }
        };

        // Reset UI checkboxes
        document.querySelectorAll('[data-filter]').forEach(checkbox => {
            if (checkbox.dataset.filter === 'karteikarten' || checkbox.dataset.filter === 'objekte') {
                checkbox.checked = true;
            }
        });

        // Reset sort
        const sortSelect = document.getElementById('sort-options');
        if (sortSelect) {
            sortSelect.value = 'identifier';
        }
        this.sortBy = 'identifier';
        this.sortDirection = 'asc';

        // Clear search
        const searchInput = document.getElementById('main-search');
        if (searchInput) {
            searchInput.value = '';
        }
        this.searchQuery = '';

        this.applyFilters();
        this.updateFilterCounts();
        
        if (typeof showToast === 'function') {
            showToast('success', 'Filters Cleared', 'All filters have been reset');
        }
    }

    /**
     * Initialize event listeners
     */
    initializeEventListeners() {
        console.log('🎧 Setting up event listeners...');
        
        // Search input with enhanced fuzzy search
        const searchInput = document.getElementById('main-search');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
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

        // Retry button for error state
        const retryButton = document.getElementById('retry-load');
        if (retryButton) {
            retryButton.addEventListener('click', () => {
                this.init();
            });
        }

        // Clear search button in empty state
        const clearSearchBtn = document.getElementById('clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        console.log('✅ Event listeners initialized');
    }

    /**
     * Handle search input with fuzzy search
     */
    handleSearch(query) {
        console.log(`🔍 Search query: "${query}"`);
        this.searchQuery = query.trim();
        this.applyFilters();
    }

    /**
     * Apply current filters, search, and sorting - simplified
     */
    applyFilters() {
        console.log('⚙️ Applying filters, search, and sorting...');
        
        let filtered = [...this.objects];
        
        // Apply object type filters
        if (!this.filters.objectType.karteikarten && !this.filters.objectType.objekte) {
            // If both unchecked, show none
            filtered = [];
        } else if (!this.filters.objectType.karteikarten) {
            // Show only objekte
            filtered = filtered.filter(obj => obj.container === 'objekte');
        } else if (!this.filters.objectType.objekte) {
            // Show only karteikarten
            filtered = filtered.filter(obj => obj.container === 'karteikarten');
        }
        // If both checked, show all (no filter needed)

        // Apply search
        if (this.searchQuery) {
            if (this.fuse) {
                // Use Fuse.js for fuzzy search
                const searchResults = this.fuse.search(this.searchQuery);
                const searchedObjects = searchResults.map(result => result.item);
                // Filter to only include objects that passed other filters
                filtered = filtered.filter(obj => 
                    searchedObjects.some(searchObj => searchObj.identifier === obj.identifier)
                );
            } else {
                // Fallback to basic search
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
        }

        // Apply sorting
        filtered = this.sortObjects(filtered);
        
        this.filteredObjects = filtered;
        this.currentPage = 1;
        
        console.log(`📊 Filter results: ${this.filteredObjects.length} objects found`);
        
        this.updateStatistics();
        this.renderResults();
    }

    /**
     * Sort objects based on current sort settings
     */
    sortObjects(objects) {
        return objects.sort((a, b) => {
            let aValue, bValue;
            
            switch (this.sortBy) {
                case 'title':
                    aValue = (a.title || '').toLowerCase();
                    bValue = (b.title || '').toLowerCase();
                    break;
                case 'date':
                    aValue = a.createdDate || '';
                    bValue = b.createdDate || '';
                    break;
                case 'relevance':
                    // For relevance, prefer objects with more complete data
                    aValue = this.calculateRelevanceScore(a);
                    bValue = this.calculateRelevanceScore(b);
                    break;
                case 'identifier':
                default:
                    aValue = a.identifier || '';
                    bValue = b.identifier || '';
            }
            
            let comparison = 0;
            if (aValue < bValue) comparison = -1;
            if (aValue > bValue) comparison = 1;
            
            return this.sortDirection === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Calculate relevance score for sorting
     */
    calculateRelevanceScore(obj) {
        let score = 0;
        
        // Points for having content
        if (obj.title && obj.title.trim()) score += 3;
        if (obj.description && obj.description.trim()) score += 3;
        if (obj.image_downloaded) score += 2;
        if (obj.tei_downloaded || obj.lido_downloaded) score += 2;
        if (obj.rdf_downloaded) score += 1;
        if (obj.createdDate && obj.createdDate.trim()) score += 1;
        
        // Bonus for longer descriptions/titles
        if (obj.description) score += Math.min(obj.description.length / 100, 2);
        if (obj.title) score += Math.min(obj.title.length / 20, 1);
        
        return score;
    }

    /**
     * Update filter counts in sidebar
     */
    updateFilterCounts() {
        // For future implementation if needed
        this.updateStatistics();
    }

    /**
     * Get counts for current filter state
     */
    getFilteredCounts() {
        const counts = {
            total: this.filteredObjects.length,
            karteikarten: this.filteredObjects.filter(obj => obj.container === 'karteikarten').length,
            objekte: this.filteredObjects.filter(obj => obj.container === 'objekte').length,
            withImages: this.filteredObjects.filter(obj => obj.image_downloaded).length,
            withSource: this.filteredObjects.filter(obj => obj.tei_downloaded || obj.lido_downloaded).length,
            withRdf: this.filteredObjects.filter(obj => obj.rdf_downloaded).length
        };

        return counts;
    }

    /**
     * Scroll to top of results
     */
    scrollToTop() {
        const resultsSection = document.querySelector('.results-section');
        if (resultsSection && typeof smoothScrollTo === 'function') {
            smoothScrollTo(resultsSection, 100);
        } else if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        const totalCounts = this.getObjectTypeCounts();
        const filteredCounts = this.getFilteredCounts();
        
        // Update header count
        const objectCount = document.getElementById('object-count');
        if (objectCount) {
            objectCount.textContent = `${totalCounts.total} objects in archive`;
        }
        
        // Update sidebar statistics (show total counts, not filtered)
        const totalCountElement = document.getElementById('total-count');
        const cardsCountElement = document.getElementById('cards-count');
        const objectsCountElement = document.getElementById('objects-count');
        
        if (totalCountElement) totalCountElement.textContent = totalCounts.total;
        if (cardsCountElement) cardsCountElement.textContent = totalCounts.karteikarten;
        if (objectsCountElement) objectsCountElement.textContent = totalCounts.objekte;
        
        // Update results info
        const resultsCount = document.getElementById('results-count');
        if (resultsCount) {
            if (this.searchQuery || this.hasActiveFilters()) {
                resultsCount.textContent = `${filteredCounts.total} objects found`;
            } else {
                resultsCount.textContent = `${filteredCounts.total} objects in collection`;
            }
        }
        
        console.log('📊 Statistics updated');
    }

    /**
     * Check if any filters are active - simplified
     */
    hasActiveFilters() {
        const typeFiltersActive = !this.filters.objectType.karteikarten || !this.filters.objectType.objekte;
        return typeFiltersActive || this.sortBy !== 'identifier';
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
                    console.warn('Unknown container type:', obj.container, 'for object:', obj.identifier);
            }
        });

        return counts;
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
            if (typeof showEmptyState === 'function') {
                showEmptyState();
            }
            return;
        }
        
        // Hide empty state
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        // Render object cards
        if (typeof renderObjectCards === 'function') {
            renderObjectCards(this.getPaginatedObjects(), (objectId) => {
                this.showObjectModal(objectId);
            });
        }
        
        this.updatePagination();
        
        console.log('✅ Results rendered');
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
     * Show object modal with detailed information
     */
    showObjectModal(objectId) {
        const obj = this.filteredObjects.find(o => o.identifier === objectId);
        if (!obj) {
            console.error('❌ Object not found:', objectId);
            return;
        }

        console.log('🔍 Opening modal for object:', obj);

        // Set current modal object for navigation
        this.currentModalObjectIndex = this.filteredObjects.findIndex(o => o.identifier === objectId);
        
        // Show modal using component function
        if (typeof showModal === 'function') {
            showModal(obj, this.currentModalObjectIndex, this.filteredObjects.length, {
                onNavigate: (direction) => this.navigateModal(direction),
                onClose: () => this.closeObjectModal()
            });
        }
        
        // Initialize modal event listeners if not already done
        if (!this.modalListenersInitialized && typeof initializeModalEventListeners === 'function') {
            initializeModalEventListeners({
                onNavigate: (direction) => this.navigateModal(direction),
                onClose: () => this.closeObjectModal()
            });
            this.modalListenersInitialized = true;
        }
    }

    /**
     * Navigate to previous/next object in modal
     */
    navigateModal(direction) {
        const newIndex = this.currentModalObjectIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.filteredObjects.length) {
            const newObject = this.filteredObjects[newIndex];
            this.currentModalObjectIndex = newIndex;
            
            if (typeof updateModalContent === 'function') {
                updateModalContent(newObject, this.currentModalObjectIndex, this.filteredObjects.length);
            }
        }
    }

    /**
     * Close object modal
     */
    closeObjectModal() {
        if (typeof closeModal === 'function') {
            closeModal();
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
        
        // Show toast notification if available
        if (typeof showToast === 'function') {
            showToast('error', 'Loading Error', message);
        }
    }

    /**
     * Get detailed archive analysis for debugging
     */
    getArchiveAnalysis() {
        if (this.objects.length === 0) {
            return { error: 'No data loaded' };
        }

        const analysis = {
            totalObjects: this.objects.length,
            objectTypes: this.getObjectTypeCounts(),
            completeness: {
                withImages: this.objects.filter(obj => obj.image_downloaded).length,
                withTEI: this.objects.filter(obj => obj.tei_downloaded).length,
                withLIDO: this.objects.filter(obj => obj.lido_downloaded).length,
                withRDF: this.objects.filter(obj => obj.rdf_downloaded).length
            },
            searchCapabilities: {
                fuseLoaded: !!this.fuse,
                searchableFields: this.fuse ? this.fuse.options.keys.map(k => k.name) : []
            },
            currentState: {
                filteredCount: this.filteredObjects.length,
                currentPage: this.currentPage,
                totalPages: Math.ceil(this.filteredObjects.length / this.itemsPerPage),
                activeFilters: this.hasActiveFilters(),
                searchQuery: this.searchQuery
            }
        };

        return analysis;
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

// Expose useful debugging function globally
window.getArchiveAnalysis = () => {
    if (window.archiveApp) {
        return window.archiveApp.getArchiveAnalysis();
    } else {
        return { error: 'Archive app not initialized' };
    }
};