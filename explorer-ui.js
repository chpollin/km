/**
 * Collection Explorer - UI Management System
 * Hans Gross Kriminalmuseum Archive
 * 
 * Responsible for:
 * - Event handlers and user interactions
 * - UI component management and updates
 * - Search functionality and results
 * - Panel management and control updates
 */

class UIManager {
    constructor(explorer) {
        this.explorer = explorer;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        
        // Touch state for mobile
        this.touchState = {
            touches: [],
            lastDistance: 0,
            lastCenter: { x: 0, y: 0 }
        };
        
        // Debounced functions
        this.debouncedSearch = this.debounce(this.performSearch.bind(this), 300);
        
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.initializeUI();
    }

    setupEventListeners() {
        const canvas = this.explorer.canvas;
        
        // Mouse events
        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('wheel', this.onWheel.bind(this));
        canvas.addEventListener('click', this.onClick.bind(this));
        canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
        
        // Touch events
        canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
        canvas.addEventListener('touchmove', this.onTouchMove.bind(this));
        canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
        
        // Control events
        this.setupControlEvents();
        
        // Window events
        window.addEventListener('resize', this.onResize.bind(this));
    }

    setupControlEvents() {
        // Zoom controls
        document.getElementById('zoomIn')?.addEventListener('click', () => {
            this.explorer.setZoom(this.explorer.targetZoom * 1.3);
        });
        
        document.getElementById('zoomOut')?.addEventListener('click', () => {
            this.explorer.setZoom(this.explorer.targetZoom / 1.3);
        });
        
        document.getElementById('resetView')?.addEventListener('click', () => {
            this.explorer.resetView();
        });
        
        // Zoom slider
        const zoomSlider = document.getElementById('zoomSlider');
        if (zoomSlider) {
            zoomSlider.addEventListener('input', (e) => {
                this.explorer.setZoom(parseFloat(e.target.value));
            });
        }
        
        // Search controls
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.debouncedSearch(e.target.value);
            });
        }
        
        const searchClear = document.getElementById('searchClear');
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        const searchZoomFit = document.getElementById('searchZoomFit');
        if (searchZoomFit) {
            searchZoomFit.addEventListener('click', () => {
                this.explorer.zoomToSearchResults();
            });
        }
        
        // Panel controls
        document.getElementById('panelClose')?.addEventListener('click', () => {
            this.hideObjectDetails();
        });
        
        // Legend toggle
        document.getElementById('legendToggle')?.addEventListener('click', () => {
            this.toggleLegend();
        });
        
        // Minimap toggle
        document.getElementById('minimapToggle')?.addEventListener('click', () => {
            this.toggleMinimap();
        });
        
        // Help overlay
        document.getElementById('helpClose')?.addEventListener('click', () => {
            this.hideHelp();
        });
        
        document.getElementById('helpCloseBtn')?.addEventListener('click', () => {
            this.hideHelp();
        });
        
        // Minimap navigation
        const minimapCanvas = document.getElementById('minimapCanvas');
        if (minimapCanvas) {
            minimapCanvas.addEventListener('click', this.onMinimapClick.bind(this));
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Prevent default for handled keys
            const handledKeys = ['+', '-', '=', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'Escape'];
            if (handledKeys.includes(e.key) || (e.ctrlKey && e.key === 'f')) {
                e.preventDefault();
            }
            
            switch (e.key) {
                case '+':
                case '=':
                    this.explorer.setZoom(this.explorer.targetZoom * 1.2);
                    break;
                case '-':
                    this.explorer.setZoom(this.explorer.targetZoom / 1.2);
                    break;
                case 'ArrowUp':
                    this.explorer.setPan(this.explorer.targetPanX, this.explorer.targetPanY + 50 / this.explorer.zoom);
                    break;
                case 'ArrowDown':
                    this.explorer.setPan(this.explorer.targetPanX, this.explorer.targetPanY - 50 / this.explorer.zoom);
                    break;
                case 'ArrowLeft':
                    this.explorer.setPan(this.explorer.targetPanX + 50 / this.explorer.zoom, this.explorer.targetPanY);
                    break;
                case 'ArrowRight':
                    this.explorer.setPan(this.explorer.targetPanX - 50 / this.explorer.zoom, this.explorer.targetPanY);
                    break;
                case 'Home':
                    this.explorer.resetView();
                    break;
                case 'Escape':
                    if (this.explorer.searchTerm) {
                        this.clearSearch();
                    } else if (this.explorer.selectedObject) {
                        this.explorer.selectObject(null);
                    }
                    break;
                case '?':
                    this.showHelp();
                    break;
                case 'f':
                    if (e.ctrlKey || e.metaKey) {
                        document.getElementById('searchInput')?.focus();
                    }
                    break;
            }
        });
    }

    initializeUI() {
        this.updateZoomIndicator();
        this.updateMinimap();
        this.setupTooltips();
    }

    // Mouse event handlers
    onMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.explorer.container.classList.add('grabbing');
        e.preventDefault();
    }

    onMouseMove(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.lastMouseX;
            const deltaY = e.clientY - this.lastMouseY;
            
            this.explorer.setPan(
                this.explorer.targetPanX + deltaX / this.explorer.zoom,
                this.explorer.targetPanY + deltaY / this.explorer.zoom
            );
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.explorer.container.classList.remove('grabbing');
    }

    onWheel(e) {
        e.preventDefault();
        
        const rect = this.explorer.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, this.explorer.targetZoom * zoomFactor));
        
        this.explorer.setZoom(newZoom, mouseX, mouseY);
    }

    onClick(e) {
        if (this.isDragging) return;
        
        const rect = this.explorer.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        
        const worldPos = this.explorer.screenToWorld(mouseX, mouseY);
        const clickedObject = this.explorer.findObjectAt(worldPos.x, worldPos.y);
        
        if (clickedObject) {
            this.explorer.selectObject(clickedObject);
        } else {
            this.explorer.selectObject(null);
        }
    }

    onDoubleClick(e) {
        const rect = this.explorer.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - rect.width / 2;
        const mouseY = e.clientY - rect.top - rect.height / 2;
        
        const worldPos = this.explorer.screenToWorld(mouseX, mouseY);
        const clickedObject = this.explorer.findObjectAt(worldPos.x, worldPos.y);
        
        if (clickedObject) {
            // Zoom to object
            this.explorer.animateTo(2.0, -clickedObject.x, -clickedObject.y, 600);
        } else {
            // Zoom in at cursor position
            this.explorer.setZoom(this.explorer.targetZoom * 1.5, mouseX, mouseY);
        }
    }

    // Touch event handlers
    onTouchStart(e) {
        e.preventDefault();
        this.touchState.touches = Array.from(e.touches);
        
        if (e.touches.length === 1) {
            this.isDragging = true;
            this.lastMouseX = e.touches[0].clientX;
            this.lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            this.isDragging = false;
            this.touchState.lastDistance = this.getTouchDistance(e.touches);
            this.touchState.lastCenter = this.getTouchCenter(e.touches);
        }
    }

    onTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1 && this.isDragging) {
            const deltaX = e.touches[0].clientX - this.lastMouseX;
            const deltaY = e.touches[0].clientY - this.lastMouseY;
            
            this.explorer.setPan(
                this.explorer.targetPanX + deltaX / this.explorer.zoom,
                this.explorer.targetPanY + deltaY / this.explorer.zoom
            );
            
            this.lastMouseX = e.touches[0].clientX;
            this.lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const distance = this.getTouchDistance(e.touches);
            const center = this.getTouchCenter(e.touches);
            
            if (this.touchState.lastDistance > 0) {
                const scale = distance / this.touchState.lastDistance;
                const newZoom = Math.max(0.1, Math.min(5, this.explorer.targetZoom * scale));
                
                const rect = this.explorer.canvas.getBoundingClientRect();
                const centerX = center.x - rect.left - rect.width / 2;
                const centerY = center.y - rect.top - rect.height / 2;
                
                this.explorer.setZoom(newZoom, centerX, centerY);
            }
            
            this.touchState.lastDistance = distance;
            this.touchState.lastCenter = center;
        }
    }

    onTouchEnd(e) {
        e.preventDefault();
        this.isDragging = false;
        this.touchState.touches = Array.from(e.touches);
        
        if (e.touches.length === 0) {
            // Single tap to select object
            if (e.changedTouches.length === 1) {
                const touch = e.changedTouches[0];
                const rect = this.explorer.canvas.getBoundingClientRect();
                const touchX = touch.clientX - rect.left - rect.width / 2;
                const touchY = touch.clientY - rect.top - rect.height / 2;
                
                const worldPos = this.explorer.screenToWorld(touchX, touchY);
                const tappedObject = this.explorer.findObjectAt(worldPos.x, worldPos.y);
                
                if (tappedObject) {
                    this.explorer.selectObject(tappedObject);
                }
            }
        }
    }

    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getTouchCenter(touches) {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2
        };
    }

    onResize() {
        this.explorer.needsRedraw = true;
        this.updateMinimap();
    }

    // Search functionality
    performSearch(query) {
        const results = this.explorer.search(query);
        this.updateSearchUI(query, results);
    }

    updateSearchUI(query, results) {
        const searchClear = document.getElementById('searchClear');
        const searchZoomFit = document.getElementById('searchZoomFit');
        
        if (searchClear) {
            searchClear.style.display = query ? 'flex' : 'none';
        }
        
        if (searchZoomFit) {
            searchZoomFit.style.display = results.length > 0 ? 'inline-flex' : 'none';
        }
        
        this.updateSearchResults();
    }

    updateSearchResults() {
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            if (this.explorer.searchResults.length > 0) {
                resultsCount.textContent = `${this.explorer.searchResults.length} objects found`;
            } else if (this.explorer.searchTerm) {
                resultsCount.textContent = 'No objects found';
            } else {
                resultsCount.textContent = '';
            }
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        
        this.performSearch('');
    }

    // UI updates
    updateZoomIndicator() {
        const zoomValue = document.querySelector('.zoom-value');
        const zoomDescription = document.querySelector('.zoom-description');
        const zoomSlider = document.getElementById('zoomSlider');
        
        if (zoomValue) {
            zoomValue.textContent = this.explorer.zoom.toFixed(1) + 'x';
        }
        
        if (zoomDescription) {
            const level = this.getZoomLevelDescription(this.explorer.zoom);
            zoomDescription.textContent = level;
        }
        
        if (zoomSlider) {
            zoomSlider.value = this.explorer.zoom;
        }
    }

    getZoomLevelDescription(zoom) {
        if (zoom <= 0.3) return 'Overview';
        if (zoom <= 0.6) return 'Patterns';
        if (zoom <= 1.5) return 'Objects';
        if (zoom <= 3.0) return 'Details';
        return 'Full View';
    }

    updateMinimap() {
        const minimapCanvas = document.getElementById('minimapCanvas');
        if (!minimapCanvas || !this.explorer.objects.length) return;
        
        const ctx = minimapCanvas.getContext('2d');
        const width = minimapCanvas.width = 200;
        const height = minimapCanvas.height = 120;
        
        // Clear
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, width, height);
        
        // Get collection bounds
        const bounds = this.explorer.spatialManager?.getCollectionBounds() || 
            { x: -2500, y: -2000, width: 5000, height: 4000 };
        
        const scaleX = width / bounds.width;
        const scaleY = height / bounds.height;
        const scale = Math.min(scaleX, scaleY) * 0.8;
        
        const offsetX = (width - bounds.width * scale) / 2;
        const offsetY = (height - bounds.height * scale) / 2;
        
        // Draw objects as tiny dots
        this.explorer.objects.forEach(obj => {
            const x = (obj.x - bounds.x) * scale + offsetX;
            const y = (obj.y - bounds.y) * scale + offsetY;
            
            if (x >= 0 && x < width && y >= 0 && y < height) {
                ctx.fillStyle = obj.searchMatch ? '#fbbf24' : obj.colors.primary;
                ctx.fillRect(x, y, 2, 2);
            }
        });
        
        // Draw viewport
        this.updateMinimapViewport(bounds, scale, offsetX, offsetY);
    }

    updateMinimapViewport(bounds, scale, offsetX, offsetY) {
        const viewport = document.getElementById('minimapViewport');
        if (!viewport) return;
        
        const canvasWidth = this.explorer.canvas.width / window.devicePixelRatio;
        const canvasHeight = this.explorer.canvas.height / window.devicePixelRatio;
        
        const viewWidth = canvasWidth / this.explorer.zoom;
        const viewHeight = canvasHeight / this.explorer.zoom;
        
        const viewLeft = -this.explorer.panX - viewWidth / 2;
        const viewTop = -this.explorer.panY - viewHeight / 2;
        
        const x = (viewLeft - bounds.x) * scale + offsetX;
        const y = (viewTop - bounds.y) * scale + offsetY;
        const w = viewWidth * scale;
        const h = viewHeight * scale;
        
        viewport.style.left = Math.max(0, Math.min(200 - w, x)) + 'px';
        viewport.style.top = Math.max(0, Math.min(120 - h, y)) + 'px';
        viewport.style.width = Math.min(200, w) + 'px';
        viewport.style.height = Math.min(120, h) + 'px';
    }

    onMinimapClick(e) {
        const rect = e.target.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        const bounds = this.explorer.spatialManager?.getCollectionBounds() || 
            { x: -2500, y: -2000, width: 5000, height: 4000 };
        
        const worldX = bounds.x + x * bounds.width;
        const worldY = bounds.y + y * bounds.height;
        
        this.explorer.animateTo(this.explorer.targetZoom, -worldX, -worldY, 400);
    }

    // Object details panel
    showObjectDetails(obj) {
        const panel = document.getElementById('infoPanel');
        const content = document.getElementById('panelContent');
        
        if (!panel || !content) return;
        
        // Generate object details HTML
        content.innerHTML = this.generateObjectDetailsHTML(obj);
        
        // Show panel
        panel.classList.add('open');
    }

    hideObjectDetails() {
        const panel = document.getElementById('infoPanel');
        if (panel) {
            panel.classList.remove('open');
        }
        
        this.explorer.selectObject(null);
    }

    generateObjectDetailsHTML(obj) {
        const typeDisplay = obj.container === 'karteikarten' ? 'Karteikarte (Index Card)' : 'Objekt (Museum Object)';
        
        return `
            <div class="object-details">
                <div class="object-image-section">
                    ${obj.image_downloaded ? 
                        `<div class="object-image-placeholder">
                            <span class="image-icon">📷</span>
                            <span>Image Available</span>
                        </div>` :
                        `<div class="object-image-placeholder">
                            <span class="image-icon">📄</span>
                            <span>No Image</span>
                        </div>`
                    }
                </div>
                
                <div class="object-info-section">
                    <h3 class="object-title">${obj.title || 'Untitled Object'}</h3>
                    
                    <div class="object-metadata">
                        <div class="metadata-row">
                            <span class="metadata-label">ID:</span>
                            <span class="metadata-value">${obj.identifier || 'Unknown'}</span>
                        </div>
                        <div class="metadata-row">
                            <span class="metadata-label">Type:</span>
                            <span class="metadata-value">${typeDisplay}</span>
                        </div>
                    </div>
                    
                    <div class="object-description">
                        <h4>Description</h4>
                        <p>${obj.description || 'No description available.'}</p>
                    </div>
                    
                    <div class="object-actions">
                        <button class="action-btn primary" onclick="window.collectionExplorer.uiManager.zoomToObject('${obj.identifier}')">
                            <span>🎯</span>
                            Focus Object
                        </button>
                        <button class="action-btn secondary" onclick="window.collectionExplorer.uiManager.findSimilar('${obj.identifier}')">
                            <span>🔍</span>
                            Find Similar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    zoomToObject(objectId) {
        const obj = this.explorer.objects.find(o => o.identifier === objectId);
        if (obj) {
            this.explorer.animateTo(2.5, -obj.x, -obj.y, 800);
        }
    }

    findSimilar(objectId) {
        const obj = this.explorer.objects.find(o => o.identifier === objectId);
        if (!obj) return;
        
        // Simple similarity based on type and title keywords
        const keywords = this.extractSimpleKeywords(obj.title || '');
        
        const similar = this.explorer.objects.filter(other => {
            if (other.identifier === obj.identifier) return false;
            if (other.container !== obj.container) return false;
            
            const otherKeywords = this.extractSimpleKeywords(other.title || '');
            return this.hasCommonKeywords(keywords, otherKeywords);
        }).slice(0, 20);
        
        // Highlight similar objects
        this.explorer.objects.forEach(o => o.searchMatch = false);
        similar.forEach(o => o.searchMatch = true);
        
        this.explorer.searchResults = similar;
        this.explorer.searchTerm = `Similar to ${obj.identifier}`;
        this.explorer.needsRedraw = true;
        
        // Update search UI
        document.getElementById('searchInput').value = this.explorer.searchTerm;
        this.updateSearchResults();
        
        // Zoom to show similar objects
        if (similar.length > 0) {
            this.explorer.zoomToSearchResults();
        }
    }

    extractSimpleKeywords(text) {
        return text.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3)
            .slice(0, 3);
    }

    hasCommonKeywords(keywords1, keywords2) {
        return keywords1.some(keyword => keywords2.includes(keyword));
    }

    // UI toggles
    toggleLegend() {
        const legend = document.getElementById('legend');
        const toggle = document.getElementById('legendToggle');
        
        if (legend && toggle) {
            legend.classList.toggle('collapsed');
            toggle.textContent = legend.classList.contains('collapsed') ? '▲' : '▼';
        }
    }

    toggleMinimap() {
        const minimap = document.getElementById('minimap');
        if (minimap) {
            minimap.classList.toggle('collapsed');
        }
    }

    showHelp() {
        const helpOverlay = document.getElementById('helpOverlay');
        if (helpOverlay) {
            helpOverlay.classList.add('active');
        }
    }

    hideHelp() {
        const helpOverlay = document.getElementById('helpOverlay');
        if (helpOverlay) {
            helpOverlay.classList.remove('active');
        }
    }

    // Tooltip system
    setupTooltips() {
        // Add tooltips to various UI elements
        this.addTooltip('[aria-label]');
    }

    addTooltip(selector) {
        document.querySelectorAll(selector).forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip.bind(this));
            element.addEventListener('mouseleave', this.hideTooltip.bind(this));
        });
    }

    showTooltip(e) {
        const element = e.target;
        const text = element.getAttribute('aria-label') || element.getAttribute('title');
        if (!text) return;
        
        // Create tooltip if it doesn't exist
        let tooltip = document.getElementById('tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'tooltip';
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);
        }
        
        tooltip.textContent = text;
        tooltip.style.display = 'block';
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 + 'px';
        tooltip.style.top = rect.bottom + 8 + 'px';
    }

    hideTooltip() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Utility functions
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

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Add CSS for dynamically created elements
const additionalCSS = `
.tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    pointer-events: none;
    z-index: 10000;
    white-space: nowrap;
    transform: translateX(-50%);
}

.object-details {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.object-image-placeholder {
    width: 100%;
    height: 150px;
    background: var(--glass-bg);
    border: 1px solid var(--panel-border);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--text-muted);
}

.image-icon {
    font-size: 2rem;
}

.object-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 1rem 0;
}

.object-metadata {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
}

.metadata-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--panel-border);
}

.metadata-label {
    font-weight: 600;
    color: var(--text-secondary);
}

.metadata-value {
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 0.875rem;
}

.object-description h4 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
}

.object-description p {
    color: var(--text-secondary);
    line-height: 1.5;
    margin: 0;
}

.object-actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.action-btn {
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s var(--ease-smooth);
    flex: 1;
    min-width: 0;
    justify-content: center;
}

.action-btn.primary {
    background: var(--museum-orange);
    color: white;
}

.action-btn.primary:hover {
    background: var(--museum-orange-light);
    transform: translateY(-1px);
}

.action-btn.secondary {
    background: var(--glass-bg);
    color: var(--text-primary);
    border: 1px solid var(--panel-border);
}

.action-btn.secondary:hover {
    background: var(--panel-border);
    transform: translateY(-1px);
}
`;

// Inject additional CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// Export for use
window.UIManager = UIManager;