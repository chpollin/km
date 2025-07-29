/**
 * Hans Gross Kriminalmuseum Archive - Utility Functions
 * Helper functions for data processing and common operations
 */

/**
 * Debounce function for search input
 */
function debounce(func, wait) {
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

/**
 * Get image URL for object
 */
function getImageUrl(obj) {
    // GAMS URL pattern: gams.uni-graz.at/{object_id}/IMAGE.1
    // Extract o:km.X from pid like "info:fedora/o:km.5"
    const objectId = obj.pid.replace('info:fedora/', '');
    return `https://gams.uni-graz.at/${objectId}/IMAGE.1`;
}

/**
 * Get TEI URL for object
 */
function getTEIUrl(obj) {
    const objectId = obj.pid.replace('info:fedora/', '');
    return `https://gams.uni-graz.at/${objectId}/TEI_SOURCE`;
}

/**
 * Get LIDO URL for object
 */
function getLIDOUrl(obj) {
    const objectId = obj.pid.replace('info:fedora/', '');
    return `https://gams.uni-graz.at/${objectId}/LIDO`;
}

/**
 * Get RDF URL for object
 */
function getRDFUrl(obj) {
    const objectId = obj.pid.replace('info:fedora/', '');
    return `https://gams.uni-graz.at/${objectId}/RDF`;
}

/**
 * Truncate text to specified length
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

/**
 * Format date string for display
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    // Handle simple year format
    if (/^\d{4}$/.test(dateString)) {
        return dateString;
    }
    
    // Try to parse as date
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // Return original if not parseable
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

/**
 * Generate download links HTML for object
 */
function generateDownloadLinksHtml(obj) {
    const links = [];

    // Image download
    if (obj.image_downloaded) {
        const imageUrl = getImageUrl(obj);
        links.push(`
            <a href="${imageUrl}" class="download-link" target="_blank" rel="noopener">
                <span aria-hidden="true">🖼️</span>
                High Resolution Image
            </a>
        `);
    }

    // TEI/XML source
    if (obj.tei_downloaded) {
        const teiUrl = getTEIUrl(obj);
        links.push(`
            <a href="${teiUrl}" class="download-link" target="_blank" rel="noopener">
                <span aria-hidden="true">📄</span>
                TEI/XML Source
            </a>
        `);
    }

    // LIDO metadata
    if (obj.lido_downloaded) {
        const lidoUrl = getLIDOUrl(obj);
        links.push(`
            <a href="${lidoUrl}" class="download-link" target="_blank" rel="noopener">
                <span aria-hidden="true">📋</span>
                LIDO Metadata
            </a>
        `);
    }

    // RDF data
    if (obj.rdf_downloaded) {
        const rdfUrl = getRDFUrl(obj);
        links.push(`
            <a href="${rdfUrl}" class="download-link" target="_blank" rel="noopener">
                <span aria-hidden="true">🔗</span>
                RDF Data
            </a>
        `);
    }

    return links.length > 0 ? 
        links.join('') : 
        '<p class="download-note">No downloads available</p>';
}

/**
 * Show toast notification
 */
function showToast(type, title, message) {
    console.log(`Toast: [${type.toUpperCase()}] ${title}: ${message}`);
    
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
        const toast = document.createElement('div');
        toast.className = `toast ${type} show`;
        toast.innerHTML = `
            <div class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</div>
            <div class="toast-content">
                <div class="toast-title">${escapeHtml(title)}</div>
                <p class="toast-message">${escapeHtml(message)}</p>
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
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('success', 'Copied', 'Link copied to clipboard');
        return true;
    } catch (err) {
        console.error('Failed to copy text: ', err);
        showToast('error', 'Copy Failed', 'Could not copy to clipboard');
        return false;
    }
}

/**
 * Generate citation for object
 */
function generateCitation(obj) {
    const title = obj.title || 'Untitled Object';
    const identifier = obj.identifier;
    const date = obj.createdDate || 'n.d.';
    const currentYear = new Date().getFullYear();
    const objectId = obj.pid.replace('info:fedora/', '');
    const url = `https://gams.uni-graz.at/${objectId}`;
    
    return `"${title}" (${identifier}), ${date}. Hans Gross Kriminalmuseum, University of Graz. Accessed ${currentYear}. ${url}`;
}

/**
 * Validate object data structure
 */
function validateObject(obj) {
    const required = ['pid', 'identifier', 'container'];
    const missing = required.filter(field => !obj[field]);
    
    if (missing.length > 0) {
        console.warn('Object missing required fields:', missing, obj);
        return false;
    }
    
    return true;
}

/**
 * Get object type display name
 */
function getObjectTypeDisplayName(container) {
    switch (container) {
        case 'karteikarten':
            return 'Karteikarte';
        case 'objekte':
            return 'Museum Object';
        default:
            return 'Unknown Type';
    }
}

/**
 * Check if object has all required downloads
 */
function isObjectComplete(obj) {
    return obj.image_downloaded && (obj.tei_downloaded || obj.lido_downloaded);
}

/**
 * Create availability indicators HTML
 */
function createAvailabilityIndicators(obj) {
    const indicators = [];
    
    indicators.push(obj.image_downloaded ? 
        '<span class="available" title="Image available">IMG</span>' : 
        '<span class="missing" title="No image">IMG</span>'
    );
    
    indicators.push(obj.tei_downloaded || obj.lido_downloaded ? 
        '<span class="available" title="Source data available">SRC</span>' : 
        '<span class="missing" title="No source data">SRC</span>'
    );
    
    indicators.push(obj.rdf_downloaded ? 
        '<span class="available" title="RDF data available">RDF</span>' : 
        '<span class="missing" title="No RDF data">RDF</span>'
    );
    
    return indicators.join('');
}