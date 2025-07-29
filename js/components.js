/**
 * Hans Gross Kriminalmuseum Archive - UI Components
 * Components for rendering object cards, modals, and other UI elements
 * 
 * VOLLSTÄNDIGE VERSION mit Filter-System und View Toggle Integration
 */

/**
 * Initialize view toggle functionality - ENHANCED VERSION
 */
function initializeViewToggle() {
    console.log('Initializing enhanced view toggle...');
    
    const viewToggles = document.querySelectorAll('.view-toggle');
    const objectGrid = document.getElementById('object-grid');
    
    if (!objectGrid) {
        console.warn('Object grid not found for view toggle');
        return;
    }
    
    // Set initial view state
    let currentView = 'grid';
    
    viewToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const newView = toggle.dataset.view;
            
            // Don't do anything if clicking the same view
            if (newView === currentView) return;
            
            console.log(`Switching view from ${currentView} to ${newView}`);
            
            // Update active state with animation
            updateToggleStates(viewToggles, toggle);
            
            // Switch view with smooth transition
            switchView(objectGrid, currentView, newView);
            
            // Update current view
            currentView = newView;
            
            // Store user preference (only if localStorage is available)
            try {
                localStorage.setItem('archiveViewPreference', newView);
            } catch (e) {
                console.log('localStorage not available, skipping preference save');
            }
            
            // Show toast notification
            if (typeof showToast === 'function') {
                const viewName = newView === 'grid' ? 'Grid View' : 'List View';
                showToast('success', 'View Changed', `Switched to ${viewName}`);
            }
        });
    });
    
    // Load saved view preference (only if localStorage is available)
    try {
        const savedView = localStorage.getItem('archiveViewPreference');
        if (savedView && ['grid', 'list'].includes(savedView)) {
            const targetToggle = document.querySelector(`[data-view="${savedView}"]`);
            if (targetToggle && savedView !== currentView) {
                targetToggle.click();
            }
        }
    } catch (e) {
        console.log('localStorage not available, using default view');
    }
    
    console.log('Enhanced view toggle initialized');
}

/**
 * Update toggle button states with smooth transitions
 */
function updateToggleStates(toggles, activeToggle) {
    toggles.forEach(toggle => {
        toggle.classList.remove('active');
        // Add subtle animation
        toggle.style.transform = 'scale(0.95)';
        setTimeout(() => {
            toggle.style.transform = 'scale(1)';
        }, 100);
    });
    
    activeToggle.classList.add('active');
    activeToggle.style.transform = 'scale(1.05)';
    setTimeout(() => {
        activeToggle.style.transform = 'scale(1)';
    }, 150);
}

/**
 * Switch between grid and list views with animation
 */
function switchView(objectGrid, fromView, toView) {
    // Add transition class for smooth animation
    objectGrid.classList.add('view-transitioning');
    
    // Fade out current view
    objectGrid.style.opacity = '0.7';
    objectGrid.style.transform = 'scale(0.98)';
    
    setTimeout(() => {
        // Apply new view classes
        if (toView === 'list') {
            objectGrid.classList.add('list-view');
            objectGrid.classList.remove('grid-view');
        } else {
            objectGrid.classList.add('grid-view');
            objectGrid.classList.remove('list-view');
        }
        
        // Fade back in
        objectGrid.style.opacity = '1';
        objectGrid.style.transform = 'scale(1)';
        
        // Remove transition class
        setTimeout(() => {
            objectGrid.classList.remove('view-transitioning');
        }, 300);
        
    }, 150);
    
    console.log(`View switched to: ${toView}`);
}

/**
 * Render object cards in the grid with view support
 */
function renderObjectCards(objects, onCardClick) {
    console.log('Rendering object cards with view support...');
    
    const objectGrid = document.getElementById('object-grid');
    if (!objectGrid) return;
    
    if (objects.length === 0) {
        objectGrid.innerHTML = '<p class="no-objects-message">No objects to display</p>';
        return;
    }
    
    // Determine current view
    const isListView = objectGrid.classList.contains('list-view');
    
    objectGrid.innerHTML = objects.map(obj => 
        createObjectCardHtml(obj, isListView)
    ).join('');
    
    // Attach event listeners to cards
    attachCardEventListeners(onCardClick);
    
    // Add stagger animation for cards
    addCardAnimations();
    
    console.log(`Rendered ${objects.length} object cards in ${isListView ? 'list' : 'grid'} view`);
}

/**
 * Create HTML for a single object card with view support
 */
function createObjectCardHtml(obj, isListView = false) {
    const title = escapeHtml(obj.title || 'Untitled Object');
    const description = escapeHtml(obj.description || 'No description available');
    const imageUrl = getImageUrl(obj);
    const typeDisplayName = getObjectTypeDisplayName(obj.container);
    
    // Adjust description length based on view
    const maxDescLength = isListView ? 200 : 120;
    const truncatedDesc = truncateText(description, maxDescLength);
    
    return `
        <article class="object-card ${isListView ? 'list-card' : 'grid-card'}" 
                 data-object-id="${obj.identifier}" 
                 tabindex="0">
            <div class="card-image ${isListView ? 'list-image' : 'grid-image'}">
                ${obj.image_downloaded ? 
                    `<img src="${imageUrl}" 
                         alt="${title}" 
                         loading="lazy" 
                         class="object-image"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
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
                    <button class="quick-view-btn" 
                            aria-label="Quick view ${title}" 
                            title="View details">
                        <span aria-hidden="true">👁️</span>
                    </button>
                </div>
            </div>
            <div class="card-content ${isListView ? 'list-content' : 'grid-content'}">
                <div class="card-header">
                    <span class="object-id">${obj.identifier}</span>
                    <span class="object-type ${obj.container}">
                        ${typeDisplayName}
                    </span>
                </div>
                <h3 class="card-title">${title}</h3>
                <p class="card-description">${truncatedDesc}</p>
                ${obj.createdDate ? `<div class="card-meta">
                    <span class="creation-date">Created: ${formatDate(obj.createdDate)}</span>
                </div>` : ''}
                <div class="availability-indicators">
                    ${createAvailabilityIndicators(obj)}
                </div>
                ${isListView ? `<div class="list-actions">
                    <button class="btn-secondary btn-sm view-details-btn" 
                            aria-label="View details for ${title}">
                        View Details
                    </button>
                </div>` : ''}
            </div>
        </article>
    `;
}

/**
 * Add stagger animation to cards
 */
function addCardAnimations() {
    const cards = document.querySelectorAll('.object-card');
    
    cards.forEach((card, index) => {
        // Reset any existing animation
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        // Stagger the animation
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        }, index * 50); // 50ms delay between cards
    });
}

/**
 * Attach event listeners to object cards
 */
function attachCardEventListeners(onCardClick) {
    const cards = document.querySelectorAll('.object-card');
    
    cards.forEach(card => {
        // Card click handler
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking buttons
            if (e.target.closest('.quick-view-btn') || e.target.closest('.view-details-btn')) return;
            
            const objectId = card.dataset.objectId;
            console.log('Card clicked:', objectId);
            
            // Add click feedback
            card.style.transform = 'scale(0.98)';
            setTimeout(() => {
                card.style.transform = 'scale(1)';
            }, 100);
            
            onCardClick(objectId);
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
                console.log('Quick view:', objectId);
                onCardClick(objectId);
            });
        }
        
        // List view details button
        const detailsBtn = card.querySelector('.view-details-btn');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const objectId = card.dataset.objectId;
                console.log('View details:', objectId);
                onCardClick(objectId);
            });
        }
        
        // Hover effects for better UX
        card.addEventListener('mouseenter', () => {
            if (!card.classList.contains('view-transitioning')) {
                card.style.transform = 'translateY(-2px)';
            }
        });
        
        card.addEventListener('mouseleave', () => {
            if (!card.classList.contains('view-transitioning')) {
                card.style.transform = 'translateY(0)';
            }
        });
    });
}

/**
 * Show empty state when no results
 */
function showEmptyState() {
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
 * Show object modal with detailed information
 */
function showModal(obj, currentIndex, totalObjects, callbacks) {
    console.log('Opening modal for object:', obj);
    
    // Populate modal content
    populateModalContent(obj);
    updateModalNavigation(currentIndex, totalObjects);
    
    // Show modal
    const modal = document.getElementById('object-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Trigger animation after display
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        // Focus management
        const closeButton = modal.querySelector('.modal-close');
        if (closeButton) {
            closeButton.focus();
        }
    }
}

/**
 * Populate modal with object data
 */
function populateModalContent(obj) {
    // Title
    const titleElement = document.getElementById('modal-object-title');
    if (titleElement) {
        titleElement.textContent = obj.title || 'Untitled Object';
    }

    // Metadata
    const fields = {
        'modal-identifier': obj.identifier,
        'modal-type': getObjectTypeDisplayName(obj.container),
        'modal-date': formatDate(obj.createdDate),
        'modal-description': obj.description || 'No description available'
    };

    Object.entries(fields).forEach(([elementId, value]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    });

    // Handle image
    setModalImage(obj);

    // Generate download links
    generateModalDownloadLinks(obj);
}

/**
 * Set modal image
 */
function setModalImage(obj) {
    const modalImage = document.getElementById('modal-image');
    const imagePlaceholder = document.getElementById('modal-image-placeholder');

    if (obj.image_downloaded && modalImage && imagePlaceholder) {
        const imageUrl = getImageUrl(obj);
        modalImage.src = imageUrl;
        modalImage.alt = obj.title || 'Object image';
        modalImage.style.display = 'block';
        imagePlaceholder.style.display = 'none';

        // Handle image load error
        modalImage.onerror = () => {
            modalImage.style.display = 'none';
            imagePlaceholder.style.display = 'flex';
        };
    } else if (imagePlaceholder && modalImage) {
        modalImage.style.display = 'none';
        imagePlaceholder.style.display = 'flex';
    }
}

/**
 * Generate download links for modal
 */
function generateModalDownloadLinks(obj) {
    const downloadContainer = document.getElementById('modal-downloads');
    if (!downloadContainer) return;

    downloadContainer.innerHTML = generateDownloadLinksHtml(obj);
}

/**
 * Update modal navigation controls
 */
function updateModalNavigation(currentIndex, totalObjects) {
    // Update position indicator
    const positionElement = document.getElementById('object-position');
    if (positionElement) {
        positionElement.textContent = `Object ${currentIndex + 1} of ${totalObjects}`;
    }

    // Update navigation buttons
    const prevButton = document.getElementById('prev-object');
    const nextButton = document.getElementById('next-object');

    if (prevButton) {
        prevButton.disabled = currentIndex === 0;
    }

    if (nextButton) {
        nextButton.disabled = currentIndex === totalObjects - 1;
    }
}

/**
 * Update modal content with new object
 */
function updateModalContent(obj, currentIndex, totalObjects) {
    populateModalContent(obj);
    updateModalNavigation(currentIndex, totalObjects);
}

/**
 * Initialize modal event listeners
 */
function initializeModalEventListeners(callbacks) {
    const modal = document.getElementById('object-modal');
    if (!modal) return;

    // Close button
    const closeButton = modal.querySelector('.modal-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            callbacks.onClose();
        });
    }

    // Overlay click to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            callbacks.onClose();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!modal.classList.contains('active')) return;

        switch (e.key) {
            case 'Escape':
                callbacks.onClose();
                break;
            case 'ArrowLeft':
                callbacks.onNavigate(-1);
                break;
            case 'ArrowRight':
                callbacks.onNavigate(1);
                break;
        }
    });

    // Navigation buttons
    const prevButton = document.getElementById('prev-object');
    const nextButton = document.getElementById('next-object');

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            callbacks.onNavigate(-1);
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            callbacks.onNavigate(1);
        });
    }

    // Copy link functionality
    const copyLinkBtn = document.getElementById('copy-link');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {
            const currentUrl = window.location.href;
            copyToClipboard(currentUrl);
        });
    }

    // Generate citation functionality
    const generateCitationBtn = document.getElementById('generate-citation');
    const citationOutput = document.getElementById('citation-output');
    const citationText = document.getElementById('citation-text');
    
    if (generateCitationBtn && citationOutput && citationText) {
        generateCitationBtn.addEventListener('click', () => {
            // Get current object data from modal
            const objectId = document.getElementById('modal-identifier').textContent;
            const title = document.getElementById('modal-object-title').textContent;
            const date = document.getElementById('modal-date').textContent;
            
            // Create mock object for citation generation
            const obj = {
                title: title,
                identifier: objectId,
                createdDate: date,
                pid: `info:fedora/${objectId}`
            };
            
            const citation = generateCitation(obj);
            citationText.value = citation;
            citationOutput.style.display = 'block';
            citationText.select();
        });
    }
}

/**
 * Close object modal
 */
function closeModal() {
    const modal = document.getElementById('object-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

/**
 * Initialize mobile filter toggle
 */
function initializeMobileFilterToggle() {
    const mobileToggle = document.querySelector('.mobile-filter-toggle');
    const filtersSidebar = document.querySelector('.filters-sidebar');
    
    if (!mobileToggle || !filtersSidebar) return;
    
    mobileToggle.addEventListener('click', () => {
        const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
        
        // Toggle expanded state
        mobileToggle.setAttribute('aria-expanded', !isExpanded);
        
        // Toggle sidebar visibility
        if (isExpanded) {
            filtersSidebar.classList.remove('active');
        } else {
            filtersSidebar.classList.add('active');
        }
        
        console.log('Mobile filter toggle:', !isExpanded ? 'opened' : 'closed');
    });
    
    // Close filters when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1023) {
            if (!filtersSidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
                filtersSidebar.classList.remove('active');
                mobileToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });
}

/**
 * Initialize error handling
 */
function initializeErrorHandling() {
    // Retry load button
    const retryBtn = document.getElementById('retry-load');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            // Trigger app reload if available
            if (window.archiveApp && typeof window.archiveApp.loadArchiveData === 'function') {
                console.log('Retrying data load...');
                window.archiveApp.init();
            } else {
                // Fallback: reload page
                window.location.reload();
            }
        });
    }
    
    // Clear search button in empty state
    const clearSearchBtn = document.getElementById('clear-search');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            const searchInput = document.getElementById('main-search');
            if (searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
            }
            
            // Clear filters if app is available
            if (window.archiveApp && typeof window.archiveApp.clearAllFilters === 'function') {
                window.archiveApp.clearAllFilters();
            }
        });
    }
}

/**
 * Initialize accessibility features
 */
function initializeAccessibility() {
    // Announce region changes for screen readers
    const resultsSection = document.querySelector('.results-section');
    if (resultsSection) {
        // Set up mutation observer for live region updates
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Announce when results change
                    const resultsCount = document.getElementById('results-count');
                    if (resultsCount) {
                        resultsCount.setAttribute('aria-live', 'polite');
                    }
                }
            });
        });
        
        observer.observe(resultsSection, {
            childList: true,
            subtree: true
        });
    }
    
    // Enhanced keyboard navigation
    document.addEventListener('keydown', (e) => {
        // Global keyboard shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'k':
                    e.preventDefault();
                    const searchInput = document.getElementById('main-search');
                    if (searchInput) {
                        searchInput.focus();
                        searchInput.select();
                    }
                    break;
                case 'g':
                    e.preventDefault();
                    const gridToggle = document.querySelector('[data-view="grid"]');
                    if (gridToggle) gridToggle.click();
                    break;
                case 'l':
                    e.preventDefault();
                    const listToggle = document.querySelector('[data-view="list"]');
                    if (listToggle) listToggle.click();
                    break;
            }
        }
    });
}

/**
 * Initialize all components when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing enhanced components...');
    
    // Initialize all component systems
    initializeViewToggle();
    initializeMobileFilterToggle();
    initializeErrorHandling();
    initializeAccessibility();
    
    console.log('All components initialized successfully');
});

// Export functions for external use if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        renderObjectCards,
        showModal,
        closeModal,
        showEmptyState,
        initializeViewToggle,
        initializeModalEventListeners,
        updateModalContent
    };
}