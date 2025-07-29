/**
 * Hans Gross Kriminalmuseum Archive - UI Components
 * Components for rendering object cards, modals, and other UI elements
 */

/**
 * Render object cards in the grid
 */
function renderObjectCards(objects, onCardClick) {
    console.log('Rendering object cards...');
    
    const objectGrid = document.getElementById('object-grid');
    if (!objectGrid) return;
    
    if (objects.length === 0) {
        objectGrid.innerHTML = '<p>No objects to display</p>';
        return;
    }
    
    objectGrid.innerHTML = objects.map(obj => createObjectCardHtml(obj)).join('');
    
    // Attach event listeners to cards
    attachCardEventListeners(onCardClick);
    
    console.log(`Rendered ${objects.length} object cards`);
}

/**
 * Create HTML for a single object card
 */
function createObjectCardHtml(obj) {
    const title = escapeHtml(obj.title || 'Untitled Object');
    const description = escapeHtml(obj.description || 'No description available');
    const imageUrl = getImageUrl(obj);
    const typeDisplayName = getObjectTypeDisplayName(obj.container);
    
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
                        ${typeDisplayName}
                    </span>
                </div>
                <h3 class="card-title">${title}</h3>
                <p class="card-description">${truncateText(description, 120)}</p>
                ${obj.createdDate ? `<div class="card-meta">
                    <span class="creation-date">Created: ${formatDate(obj.createdDate)}</span>
                </div>` : ''}
                <div class="availability-indicators">
                    ${createAvailabilityIndicators(obj)}
                </div>
            </div>
        </article>
    `;
}

/**
 * Attach event listeners to object cards
 */
function attachCardEventListeners(onCardClick) {
    const cards = document.querySelectorAll('.object-card');
    
    cards.forEach(card => {
        // Card click handler
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking the quick view button
            if (e.target.closest('.quick-view-btn')) return;
            
            const objectId = card.dataset.objectId;
            console.log('Card clicked:', objectId);
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
 * Initialize view toggle functionality
 */
function initializeViewToggle() {
    const viewToggles = document.querySelectorAll('.view-toggle');
    const objectGrid = document.getElementById('object-grid');
    
    viewToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const view = toggle.dataset.view;
            
            // Update active state
            viewToggles.forEach(t => t.classList.remove('active'));
            toggle.classList.add('active');
            
            // Update grid view
            if (objectGrid) {
                if (view === 'list') {
                    objectGrid.classList.add('list-view');
                } else {
                    objectGrid.classList.remove('list-view');
                }
            }
            
            console.log('View changed to:', view);
        });
    });
}

/**
 * Initialize components when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeViewToggle();
});