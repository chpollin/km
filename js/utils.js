/**
 * Hans Gross Kriminalmuseum Archive - Utility Functions
 * Helper functions for data processing and common operations
 * 
 * VOLLSTÄNDIGE VERSION mit erweiterten Funktionen für Filter-System und View Toggle
 */

/**
 * Debounce function for search input and other frequent operations
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Throttle function for scroll events and performance-critical operations
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * SVG Placeholder for missing images
 */
const IMAGE_PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f5f5f5' width='400' height='300'/%3E%3Cg opacity='0.3'%3E%3Crect x='150' y='100' width='100' height='80' fill='none' stroke='%23999' stroke-width='2'/%3E%3Ccircle cx='180' cy='130' r='8' fill='%23999'/%3E%3Cpath d='M160,170 L200,140 L240,170' fill='none' stroke='%23999' stroke-width='2'/%3E%3C/g%3E%3Ctext x='50%25' y='220' text-anchor='middle' font-family='system-ui, sans-serif' font-size='14' fill='%23666'%3EBild nicht verfügbar%3C/text%3E%3C/svg%3E`;

/**
 * Load image with fallback and retry logic
 */
function loadImageWithFallback(src, retries = 2) {
    return new Promise((resolve) => {
        const img = new Image();
        let attempts = 0;

        const tryLoad = () => {
            // Add cache buster for retries
            img.src = attempts === 0 ? src : `${src}?retry=${attempts}`;

            img.onload = () => {
                console.log(`✅ Image loaded: ${src}`);
                resolve(img.src);
            };

            img.onerror = () => {
                attempts++;
                if (attempts <= retries) {
                    console.warn(`⚠️ Image load failed, retrying (${attempts}/${retries}): ${src}`);
                    setTimeout(tryLoad, 1000 * attempts);
                } else {
                    console.error(`❌ Image load failed after ${retries} retries: ${src}`);
                    resolve(IMAGE_PLACEHOLDER_SVG);
                }
            };
        };

        tryLoad();
    });
}

/**
 * Get image URL for object with fallback handling
 */
function getImageUrl(obj) {
    if (!obj || !obj.pid) {
        console.warn('Invalid object for image URL generation:', obj);
        return IMAGE_PLACEHOLDER_SVG;
    }

    try {
        // GAMS URL pattern: gams.uni-graz.at/{object_id}/IMAGE.1
        // Extract o:km.X from pid like "info:fedora/o:km.5"
        const objectId = obj.pid.replace('info:fedora/', '');
        const imageUrl = `https://gams.uni-graz.at/${objectId}/IMAGE.1`;

        console.log(`Generated image URL for ${obj.identifier}: ${imageUrl}`);
        return imageUrl;
    } catch (error) {
        console.error('Error generating image URL:', error, obj);
        return IMAGE_PLACEHOLDER_SVG;
    }
}

/**
 * Get TEI URL for object
 */
function getTEIUrl(obj) {
    if (!obj || !obj.pid) {
        console.warn('Invalid object for TEI URL generation:', obj);
        return '';
    }
    
    try {
        const objectId = obj.pid.replace('info:fedora/', '');
        const teiUrl = `https://gams.uni-graz.at/${objectId}/TEI_SOURCE`;
        
        console.log(`Generated TEI URL for ${obj.identifier}: ${teiUrl}`);
        return teiUrl;
    } catch (error) {
        console.error('Error generating TEI URL:', error, obj);
        return '';
    }
}

/**
 * Get LIDO URL for object
 */
function getLIDOUrl(obj) {
    if (!obj || !obj.pid) {
        console.warn('Invalid object for LIDO URL generation:', obj);
        return '';
    }

    try {
        const objectId = obj.pid.replace('info:fedora/', '');
        const lidoUrl = `https://gams.uni-graz.at/${objectId}/LIDO_SOURCE`;

        console.log(`Generated LIDO URL for ${obj.identifier}: ${lidoUrl}`);
        return lidoUrl;
    } catch (error) {
        console.error('Error generating LIDO URL:', error, obj);
        return '';
    }
}

/**
 * Get RDF URL for object
 */
function getRDFUrl(obj) {
    if (!obj || !obj.pid) {
        console.warn('Invalid object for RDF URL generation:', obj);
        return '';
    }
    
    try {
        const objectId = obj.pid.replace('info:fedora/', '');
        const rdfUrl = `https://gams.uni-graz.at/${objectId}/RDF`;
        
        console.log(`Generated RDF URL for ${obj.identifier}: ${rdfUrl}`);
        return rdfUrl;
    } catch (error) {
        console.error('Error generating RDF URL:', error, obj);
        return '';
    }
}

/**
 * Get direct GAMS object URL for citation and linking
 */
function getObjectUrl(obj) {
    if (!obj || !obj.pid) {
        console.warn('Invalid object for object URL generation:', obj);
        return '';
    }
    
    try {
        const objectId = obj.pid.replace('info:fedora/', '');
        const objectUrl = `https://gams.uni-graz.at/${objectId}`;
        
        console.log(`Generated object URL for ${obj.identifier}: ${objectUrl}`);
        return objectUrl;
    } catch (error) {
        console.error('Error generating object URL:', error, obj);
        return '';
    }
}

/**
 * Truncate text to specified length with smart word breaking
 */
function truncateText(text, maxLength, suffix = '...') {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    
    // Try to break at word boundary
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
        // If we can break at a word boundary that's not too far back
        return truncated.substring(0, lastSpace).trim() + suffix;
    } else {
        // Otherwise, hard break
        return truncated.trim() + suffix;
    }
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
        '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'/]/g, function(m) { 
        return map[m]; 
    });
}

/**
 * Unescape HTML entities
 */
function unescapeHtml(text) {
    if (!text || typeof text !== 'string') return '';
    
    const map = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#039;': "'",
        '&#x2F;': '/'
    };
    
    return text.replace(/&amp;|&lt;|&gt;|&quot;|&#039;|&#x2F;/g, function(m) {
        return map[m];
    });
}

/**
 * Format date string for display with multiple format support
 */
function formatDate(dateString, format = 'long') {
    if (!dateString) return 'Unknown';
    
    // Handle simple year format
    if (/^\d{4}$/.test(dateString.toString())) {
        return dateString.toString();
    }
    
    // Handle year ranges like "1890-1920"
    if (/^\d{4}-\d{4}$/.test(dateString)) {
        return dateString;
    }
    
    // Handle approximate dates like "ca. 1900"
    if (dateString.toString().toLowerCase().includes('ca.') || 
        dateString.toString().toLowerCase().includes('circa')) {
        return dateString.toString();
    }
    
    // Try to parse as date
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString.toString(); // Return original if not parseable
        }
        
        const options = {
            year: 'numeric',
            month: format === 'short' ? 'short' : 'long',
            day: 'numeric'
        };
        
        if (format === 'year') {
            return date.getFullYear().toString();
        }
        
        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        console.warn('Error formatting date:', dateString, e);
        return dateString.toString();
    }
}

/**
 * Generate download links HTML for object with enhanced error handling
 */
function generateDownloadLinksHtml(obj) {
    if (!obj) {
        return '<p class="download-note">No download information available</p>';
    }
    
    const links = [];

    try {
        // Image download
        if (obj.image_downloaded) {
            const imageUrl = getImageUrl(obj);
            if (imageUrl) {
                links.push(`
                    <a href="${imageUrl}" class="download-link" target="_blank" rel="noopener" 
                       title="Download high resolution image">
                        <span aria-hidden="true">🖼️</span>
                        High Resolution Image
                        <span class="download-meta">(JPEG)</span>
                    </a>
                `);
            }
        }

        // TEI/XML source
        if (obj.tei_downloaded) {
            const teiUrl = getTEIUrl(obj);
            if (teiUrl) {
                links.push(`
                    <a href="${teiUrl}" class="download-link" target="_blank" rel="noopener"
                       title="Download TEI/XML source data">
                        <span aria-hidden="true">📄</span>
                        TEI/XML Source
                        <span class="download-meta">(XML)</span>
                    </a>
                `);
            }
        }

        // LIDO metadata
        if (obj.lido_downloaded) {
            const lidoUrl = getLIDOUrl(obj);
            if (lidoUrl) {
                links.push(`
                    <a href="${lidoUrl}" class="download-link" target="_blank" rel="noopener"
                       title="Download LIDO metadata">
                        <span aria-hidden="true">📋</span>
                        LIDO Metadata
                        <span class="download-meta">(XML)</span>
                    </a>
                `);
            }
        }

        // RDF data
        if (obj.rdf_downloaded) {
            const rdfUrl = getRDFUrl(obj);
            if (rdfUrl) {
                links.push(`
                    <a href="${rdfUrl}" class="download-link" target="_blank" rel="noopener"
                       title="Download RDF linked data">
                        <span aria-hidden="true">🔗</span>
                        RDF Data
                        <span class="download-meta">(RDF/XML)</span>
                    </a>
                `);
            }
        }

        // Object permalink
        const objectUrl = getObjectUrl(obj);
        if (objectUrl) {
            links.push(`
                <a href="${objectUrl}" class="download-link" target="_blank" rel="noopener"
                   title="View original object in GAMS">
                    <span aria-hidden="true">🌐</span>
                    View in GAMS
                    <span class="download-meta">(Original)</span>
                </a>
            `);
        }

    } catch (error) {
        console.error('Error generating download links:', error, obj);
        return '<p class="download-note download-error">Error loading download options</p>';
    }

    return links.length > 0 ? 
        links.join('') : 
        '<p class="download-note">No downloads available for this object</p>';
}

/**
 * Show toast notification with enhanced options
 */
function showToast(type, title, message, duration = 4000, actions = null) {
    console.log(`Toast: [${type.toUpperCase()}] ${title}: ${message}`);
    
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.warn('Toast container not found');
        return;
    }
    
    // Create unique ID for this toast
    const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type} show`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    const iconMap = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon" aria-hidden="true">${iconMap[type] || 'ℹ️'}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <p class="toast-message">${escapeHtml(message)}</p>
            ${actions ? `<div class="toast-actions">${actions}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Close notification" title="Close">×</button>
    `;
    
    // Add click to close
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        removeToast(toast);
    });
    
    // Add click anywhere on toast to close (except actions)
    toast.addEventListener('click', (e) => {
        if (!e.target.closest('.toast-actions')) {
            removeToast(toast);
        }
    });
    
    toastContainer.appendChild(toast);
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentNode) {
                removeToast(toast);
            }
        }, duration);
    }
    
    return toastId;
}

/**
 * Remove toast with animation
 */
function removeToast(toast) {
    if (!toast) return;
    
    toast.classList.remove('show');
    toast.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

/**
 * Copy text to clipboard with fallback support
 */
async function copyToClipboard(text) {
    if (!text) {
        showToast('error', 'Copy Failed', 'No text to copy');
        return false;
    }
    
    try {
        // Modern clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            showToast('success', 'Copied', 'Text copied to clipboard');
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            textArea.remove();
            
            if (success) {
                showToast('success', 'Copied', 'Text copied to clipboard');
                return true;
            } else {
                throw new Error('Copy command failed');
            }
        }
    } catch (err) {
        console.error('Failed to copy text:', err);
        showToast('error', 'Copy Failed', 'Could not copy to clipboard. Please copy manually.');
        
        // Show the text in a modal or prompt as last resort
        try {
            prompt('Copy this text manually:', text);
        } catch (promptErr) {
            console.error('Prompt fallback failed:', promptErr);
        }
        
        return false;
    }
}

/**
 * Generate academic citation for object with multiple formats
 */
function generateCitation(obj, format = 'mla') {
    if (!obj) {
        return 'Citation not available - invalid object data';
    }
    
    const title = obj.title || 'Untitled Object';
    const identifier = obj.identifier || 'Unknown ID';
    const date = obj.createdDate || 'n.d.';
    const currentYear = new Date().getFullYear();
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const objectUrl = getObjectUrl(obj);
    
    switch (format.toLowerCase()) {
        case 'apa':
            return `Hans Gross Kriminalmuseum. (${date}). ${title} [Digital object]. University of Graz. Retrieved ${currentDate}, from ${objectUrl}`;
            
        case 'chicago':
            return `Hans Gross Kriminalmuseum. "${title}" (${identifier}). ${date}. University of Graz. Accessed ${currentDate}. ${objectUrl}.`;
            
        case 'harvard':
            return `Hans Gross Kriminalmuseum ${currentYear}, '${title}' (${identifier}), ${date}, University of Graz, viewed ${currentDate}, <${objectUrl}>.`;
            
        case 'mla':
        default:
            return `"${title}" (${identifier}), ${date}. Hans Gross Kriminalmuseum, University of Graz. Web. ${currentDate}. <${objectUrl}>`;
    }
}

/**
 * Validate object data structure with detailed reporting
 */
function validateObject(obj) {
    if (!obj || typeof obj !== 'object') {
        console.warn('Invalid object: not an object', obj);
        return { valid: false, errors: ['Object is null or not an object'] };
    }
    
    const required = ['pid', 'identifier', 'container'];
    const recommended = ['title', 'description', 'createdDate'];
    const errors = [];
    const warnings = [];
    
    // Check required fields
    required.forEach(field => {
        if (!obj[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    });
    
    // Check recommended fields
    recommended.forEach(field => {
        if (!obj[field]) {
            warnings.push(`Missing recommended field: ${field}`);
        }
    });
    
    // Validate specific field formats
    if (obj.pid && !obj.pid.includes(':')) {
        warnings.push('PID format may be invalid (should contain ":")');
    }
    
    if (obj.container && !['karteikarten', 'objekte'].includes(obj.container)) {
        warnings.push(`Unknown container type: ${obj.container}`);
    }
    
    const result = {
        valid: errors.length === 0,
        errors,
        warnings,
        completeness: (required.filter(f => obj[f]).length + recommended.filter(f => obj[f]).length) / (required.length + recommended.length)
    };
    
    if (!result.valid) {
        console.warn('Object validation failed:', result, obj);
    }
    
    return result;
}

/**
 * Get object type display name with localization support
 */
function getObjectTypeDisplayName(container, language = 'en') {
    const translations = {
        en: {
            karteikarten: 'Index Card',
            objekte: 'Museum Object',
            unknown: 'Unknown Type'
        },
        de: {
            karteikarten: 'Karteikarte',
            objekte: 'Museumsobjekt',
            unknown: 'Unbekannter Typ'
        }
    };
    
    const lang = translations[language] || translations.en;
    
    switch (container) {
        case 'karteikarten':
            return lang.karteikarten;
        case 'objekte':
            return lang.objekte;
        default:
            console.warn('Unknown container type:', container);
            return lang.unknown;
    }
}

/**
 * Check if object has all required downloads for completeness scoring
 */
function isObjectComplete(obj) {
    if (!obj) return false;
    
    const hasImage = obj.image_downloaded === true;
    const hasSource = obj.tei_downloaded === true || obj.lido_downloaded === true;
    const hasMetadata = obj.rdf_downloaded === true;
    
    return {
        complete: hasImage && hasSource,
        fullComplete: hasImage && hasSource && hasMetadata,
        score: (hasImage ? 1 : 0) + (hasSource ? 1 : 0) + (hasMetadata ? 1 : 0),
        maxScore: 3,
        percentage: ((hasImage ? 1 : 0) + (hasSource ? 1 : 0) + (hasMetadata ? 1 : 0)) / 3 * 100
    };
}

/**
 * Create availability indicators HTML with enhanced information
 */
function createAvailabilityIndicators(obj) {
    if (!obj) return '';
    
    const indicators = [];
    
    // Image indicator
    if (obj.image_downloaded) {
        indicators.push('<span class="available" title="High-resolution image available">IMG</span>');
    } else {
        indicators.push('<span class="missing" title="No image available">IMG</span>');
    }
    
    // Source data indicator
    if (obj.tei_downloaded || obj.lido_downloaded) {
        const sourceType = obj.tei_downloaded ? 'TEI' : 'LIDO';
        indicators.push(`<span class="available" title="${sourceType} source data available">SRC</span>`);
    } else {
        indicators.push('<span class="missing" title="No source data available">SRC</span>');
    }
    
    // RDF data indicator
    if (obj.rdf_downloaded) {
        indicators.push('<span class="available" title="RDF linked data available">RDF</span>');
    } else {
        indicators.push('<span class="missing" title="No RDF data available">RDF</span>');
    }
    
    return indicators.join('');
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Deep clone object to avoid reference issues
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(deepClone);
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Generate unique ID for elements
 */
function generateId(prefix = 'element') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if user prefers dark mode
 */
function prefersDarkMode() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Smooth scroll to element with optional offset
 */
function smoothScrollTo(element, offset = 0) {
    if (!element) return;
    
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - offset;
    
    if (prefersReducedMotion()) {
        window.scrollTo(0, offsetPosition);
    } else {
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

/**
 * Local storage helpers with error handling
 */
const storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
            return false;
        }
    },
    
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('Could not read from localStorage:', e);
            return defaultValue;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('Could not remove from localStorage:', e);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.warn('Could not clear localStorage:', e);
            return false;
        }
    }
};

/**
 * Lazy Image Loading with IntersectionObserver
 */
class LazyImageLoader {
    constructor() {
        this.observer = null;
        this.loadedImages = new Set();
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver(
                (entries) => this.handleIntersection(entries),
                {
                    rootMargin: '100px',
                    threshold: 0.01
                }
            );
        }
    }

    observe(element) {
        if (!this.observer) {
            // Fallback for browsers without IntersectionObserver
            this.loadImage(element);
            return;
        }

        // Store original src and set placeholder
        if (!element.dataset.src && element.src) {
            element.dataset.src = element.src;
            element.src = IMAGE_PLACEHOLDER_SVG;
        }

        this.observer.observe(element);
    }

    handleIntersection(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                this.loadImage(entry.target);
                this.observer.unobserve(entry.target);
            }
        });
    }

    async loadImage(img) {
        const src = img.dataset.src || img.src;

        if (!src || this.loadedImages.has(src)) {
            return;
        }

        // Add loading class
        img.classList.add('loading');

        try {
            const finalSrc = await loadImageWithFallback(src);
            img.src = finalSrc;
            this.loadedImages.add(src);

            // Remove loading class after image loads
            img.onload = () => {
                img.classList.remove('loading');
                img.classList.add('loaded');
            };
        } catch (error) {
            console.error('Failed to lazy load image:', error);
            img.src = IMAGE_PLACEHOLDER_SVG;
            img.classList.remove('loading');
            img.classList.add('error');
        }
    }

    disconnect() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Global lazy loader instance
let lazyImageLoader = null;

function initLazyLoading() {
    if (!lazyImageLoader) {
        lazyImageLoader = new LazyImageLoader();
    }
    return lazyImageLoader;
}

/**
 * Export functions for external use if needed
 */
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        getImageUrl,
        loadImageWithFallback,
        LazyImageLoader,
        initLazyLoading,
        getTEIUrl,
        getLIDOUrl,
        getRDFUrl,
        getObjectUrl,
        truncateText,
        escapeHtml,
        unescapeHtml,
        formatDate,
        generateDownloadLinksHtml,
        showToast,
        copyToClipboard,
        generateCitation,
        validateObject,
        getObjectTypeDisplayName,
        isObjectComplete,
        createAvailabilityIndicators,
        formatFileSize,
        deepClone,
        generateId,
        prefersReducedMotion,
        prefersDarkMode,
        smoothScrollTo,
        storage,
        IMAGE_PLACEHOLDER_SVG
    };
}