/**
 * Collection Explorer - Core Rendering Engine
 * Hans Gross Kriminalmuseum Archive
 * 
 * Main class responsible for:
 * - Canvas setup and rendering pipeline
 * - Data loading and processing
 * - Performance monitoring
 * - Render loop management
 */

class CollectionExplorer {
    constructor() {
        // Canvas and rendering
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridCanvas = document.getElementById('grid-overlay');
        this.gridCtx = this.gridCanvas.getContext('2d');
        this.container = document.querySelector('.canvas-container');
        
        // View state
        this.zoom = 0.5;
        this.panX = 0;
        this.panY = 0;
        this.targetZoom = 0.5;
        this.targetPanX = 0;
        this.targetPanY = 0;
        
        // Data and objects
        this.objects = [];
        this.visibleObjects = [];
        this.selectedObject = null;
        this.searchResults = [];
        this.searchTerm = '';
        
        // Performance tracking
        this.needsRedraw = true;
        this.animationId = null;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 60;
        this.isPaused = false;
        
        // Spatial manager (will be initialized)
        this.spatialManager = null;
        
        // UI manager (will be initialized)
        this.uiManager = null;
        
        // Layout systems (will be initialized)
        this.categoryManager = null;
        this.layoutManager = null;
        this.layoutControls = null;
        
        // Initialize
        this.init();
    }

    async init() {
        console.log('🗺️ Initializing Collection Explorer...');
        
        try {
            this.setupCanvas();
            await this.loadData();
            
            // Initialize spatial and UI managers
            this.spatialManager = new SpatialManager(this);
            this.uiManager = new UIManager(this);
            
            // Process object positions
            this.spatialManager.processObjectPositions();
            
            // Start rendering
            this.startRenderLoop();
            this.hideLoading();
            
            // Initialize layout systems
            this.initializeLayoutSystems();
            
            console.log('✅ Collection Explorer initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Collection Explorer:', error);
            this.showError(error.message);
        }
    }

    initializeLayoutSystems() {
        try {
            console.log('🔧 Initializing layout systems...');
            
            // Initialize category manager
            this.categoryManager = new CategoryManager(this);
            this.categoryManager.initialize();
            
            // Initialize layout manager  
            this.layoutManager = new LayoutManager(this);
            
            // Initialize layout controls (right-side panel)
            if (window.LayoutControlsRight) {
                this.layoutControls = new LayoutControlsRight(this);
            }
            
            console.log('✅ Layout systems initialized');
        } catch (error) {
            console.error('❌ Failed to initialize layout systems:', error);
        }
    }

    setupCanvas() {
        const updateCanvasSize = () => {
            const rect = this.container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            
            // Main canvas
            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
            this.ctx.scale(dpr, dpr);
            
            // Grid canvas
            this.gridCanvas.width = rect.width * dpr;
            this.gridCanvas.height = rect.height * dpr;
            this.gridCanvas.style.width = rect.width + 'px';
            this.gridCanvas.style.height = rect.height + 'px';
            this.gridCtx.scale(dpr, dpr);
            
            this.needsRedraw = true;
        };
        
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
    }

    async loadData() {
        console.log('📂 Loading enhanced archive data...');
        this.updateLoadingProgress(20);

        try {
            // Try to load enhanced data first, fallback to original
            let response = await fetch('km_archive/metadata/enhanced_objects_v2.json');
            if (!response.ok) {
                console.warn('Enhanced data not found, falling back to original data');
                response = await fetch('km_archive/metadata/all_objects.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }

            this.updateLoadingProgress(50);
            const data = await response.json();
            
            if (!Array.isArray(data)) {
                throw new Error('Invalid data format: expected an array');
            }
            
            this.updateLoadingProgress(70);
            
            // Process objects
            this.objects = this.processObjects(data);
            console.log(`📊 Processed ${this.objects.length} objects`);
            
            this.updateLoadingProgress(90);
            this.updateStatistics();
            this.updateLoadingProgress(100);
            
        } catch (error) {
            console.error('💥 Error loading data:', error);
            throw error;
        }
    }

    processObjects(data) {
        return data.map((obj, index) => {
            // Enhanced data processing
            const colors = this.getObjectColors(obj);

            // Extract year for timeline
            const year = obj.historicalYear || parseInt(obj.createdDate) || null;
            const isEstimated = obj.dateSource === 'estimated';

            return {
                ...obj,
                x: 0, // Will be set by spatial manager
                y: 0, // Will be set by spatial manager
                colors: colors,
                visible: false,
                searchMatch: false,
                selected: false,
                index: index,
                year: year,
                isEstimated: isEstimated,
                category: this.extractCategory(obj)
            };
        });
    }

    extractCategory(obj) {
        if (obj.objectClass) {
            // Use enhanced classification
            const parts = obj.objectClass.split('.');
            return {
                primary: parts[0] || 'Unbekannt',
                secondary: parts[1] || '',
                tertiary: parts[2] || ''
            };
        }
        // Fallback for non-enhanced data
        return {
            primary: obj.container === 'karteikarten' ? 'Dokument' : 'Objekt',
            secondary: '',
            tertiary: ''
        };
    }

    getObjectColors(obj) {
        // Simplified color scheme - only 2 main categories
        // This improves visual clarity and reduces cognitive load

        if (obj.container === 'karteikarten') {
            // Blue for Karteikarten (index cards/documents)
            return {
                primary: '#007AFF',      // iOS blue
                secondary: '#0051D5',    // Darker blue
                border: '#007AFF'
            };
        } else if (obj.container === 'objekte') {
            // Orange for physical museum objects
            return {
                primary: '#FF9500',      // iOS orange
                secondary: '#CC7700',    // Darker orange
                border: '#FF9500'
            };
        } else {
            // Gray for unknown/uncategorized
            return {
                primary: '#8E8E93',      // iOS gray
                secondary: '#636366',    // Darker gray
                border: '#8E8E93'
            };
        }
    }

    startRenderLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        const render = (currentTime) => {
            if (this.isPaused) {
                this.animationId = requestAnimationFrame(render);
                return;
            }
            
            // Calculate FPS
            if (currentTime - this.lastFrameTime >= 1000) {
                this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
                this.updatePerformanceMonitor();
                this.frameCount = 0;
                this.lastFrameTime = currentTime;
            }
            this.frameCount++;
            
            // Update animations
            this.updateAnimations();
            
            // Render if needed
            if (this.needsRedraw) {
                this.updateVisibleObjects();
                this.render();
                this.needsRedraw = false;
            }
            
            this.animationId = requestAnimationFrame(render);
        };
        
        this.animationId = requestAnimationFrame(render);
    }

    updateAnimations() {
        const ease = 0.15;
        let needsUpdate = false;
        
        // Smooth zoom animation
        if (Math.abs(this.zoom - this.targetZoom) > 0.01) {
            this.zoom += (this.targetZoom - this.zoom) * ease;
            needsUpdate = true;
        }
        
        // Smooth pan animation
        if (Math.abs(this.panX - this.targetPanX) > 0.5) {
            this.panX += (this.targetPanX - this.panX) * ease;
            needsUpdate = true;
        }
        
        if (Math.abs(this.panY - this.targetPanY) > 0.5) {
            this.panY += (this.targetPanY - this.panY) * ease;
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            this.needsRedraw = true;
            this.uiManager?.updateZoomIndicator();
        }
    }

    updateVisibleObjects() {
        if (!this.spatialManager) return;
        
        const viewBounds = this.getViewBounds();
        this.visibleObjects = this.spatialManager.getObjectsInBounds(viewBounds);
        
        // Update visibility flags
        this.objects.forEach(obj => {
            obj.visible = this.visibleObjects.includes(obj);
        });
        
        // Update performance monitor
        this.updatePerformanceMonitor();
    }

    getViewBounds() {
        const canvasWidth = this.canvas.width / window.devicePixelRatio;
        const canvasHeight = this.canvas.height / window.devicePixelRatio;
        
        const viewWidth = canvasWidth / this.zoom;
        const viewHeight = canvasHeight / this.zoom;
        
        return {
            left: -this.panX - viewWidth / 2,
            right: -this.panX + viewWidth / 2,
            top: -this.panY - viewHeight / 2,
            bottom: -this.panY + viewHeight / 2
        };
    }

    render() {
        if (!this.spatialManager) return;
        
        const canvasWidth = this.canvas.width / window.devicePixelRatio;
        const canvasHeight = this.canvas.height / window.devicePixelRatio;
        
        // Clear canvas
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Save context for transformations
        this.ctx.save();
        
        // Apply zoom and pan transformations
        this.ctx.translate(canvasWidth / 2, canvasHeight / 2);
        this.ctx.scale(this.zoom, this.zoom);
        this.ctx.translate(this.panX, this.panY);
        
        // Draw grid if zoomed in enough
        if (this.zoom > 0.5) {
            this.drawGrid();
        }
        
        // Draw objects using spatial manager
        this.spatialManager.renderObjects(this.ctx, this.zoom);
        
        this.ctx.restore();
        
        // Update UI elements
        this.uiManager?.updateMinimap();
    }

    drawGrid() {
        const gridSize = 200;
        const viewBounds = this.getViewBounds();
        
        const startX = Math.floor(viewBounds.left / gridSize) * gridSize;
        const endX = Math.ceil(viewBounds.right / gridSize) * gridSize;
        const startY = Math.floor(viewBounds.top / gridSize) * gridSize;
        const endY = Math.ceil(viewBounds.bottom / gridSize) * gridSize;
        
        this.ctx.strokeStyle = '#2a2a2a';
        this.ctx.lineWidth = 1 / this.zoom;
        this.ctx.globalAlpha = Math.min(1, (this.zoom - 0.5) * 2);
        
        this.ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
        }
        this.ctx.stroke();
        
        this.ctx.globalAlpha = 1;
    }

    // View manipulation methods
    setZoom(newZoom, centerX = 0, centerY = 0) {
        const oldZoom = this.targetZoom;
        // Set reasonable zoom limits: 0.1x (overview) to 3x (detailed view)
        this.targetZoom = Math.max(0.1, Math.min(3, newZoom));
        
        // Zoom toward specific point
        if (centerX !== 0 || centerY !== 0) {
            const zoomFactor = this.targetZoom / oldZoom;
            const worldX = (centerX / oldZoom) - this.targetPanX;
            const worldY = (centerY / oldZoom) - this.targetPanY;
            
            this.targetPanX = (centerX / this.targetZoom) - worldX;
            this.targetPanY = (centerY / this.targetZoom) - worldY;
        }
        
        this.needsRedraw = true;
    }

    setPan(newPanX, newPanY) {
        this.targetPanX = newPanX;
        this.targetPanY = newPanY;
        this.needsRedraw = true;
    }

    animateTo(zoom, panX, panY, duration = 1000) {
        const startZoom = this.zoom;
        const startPanX = this.panX;
        const startPanY = this.panY;
        
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.targetZoom = startZoom + (zoom - startZoom) * eased;
            this.targetPanX = startPanX + (panX - startPanX) * eased;
            this.targetPanY = startPanY + (panY - startPanY) * eased;
            
            this.needsRedraw = true;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    resetView() {
        this.animateTo(0.5, 0, 0, 800);
    }

    // Object interaction methods
    selectObject(obj) {
        if (this.selectedObject) {
            this.selectedObject.selected = false;
        }
        
        this.selectedObject = obj;
        if (obj) {
            obj.selected = true;
            this.uiManager?.showObjectDetails(obj);
        } else {
            this.uiManager?.hideObjectDetails();
        }
        
        this.needsRedraw = true;
    }

    findObjectAt(worldX, worldY) {
        const threshold = 20 / this.zoom; // Hit area scales with zoom
        
        let closestObject = null;
        let closestDistance = threshold;
        
        for (const obj of this.visibleObjects) {
            const distance = Math.sqrt(
                Math.pow(obj.x - worldX, 2) + Math.pow(obj.y - worldY, 2)
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestObject = obj;
            }
        }
        
        return closestObject;
    }

    // Search methods
    search(query) {
        this.searchTerm = query.toLowerCase().trim();
        
        if (!this.searchTerm) {
            this.searchResults = [];
            this.objects.forEach(obj => obj.searchMatch = false);
        } else {
            this.searchResults = this.objects.filter(obj => {
                const searchText = [
                    obj.title || '',
                    obj.description || '',
                    obj.identifier || '',
                    obj.container || ''
                ].join(' ').toLowerCase();
                
                return searchText.includes(this.searchTerm);
            });
            
            // Update search match flags
            this.objects.forEach(obj => {
                obj.searchMatch = this.searchResults.includes(obj);
            });
        }
        
        this.needsRedraw = true;
        this.uiManager?.updateSearchResults();
        
        return this.searchResults;
    }

    zoomToSearchResults() {
        if (this.searchResults.length === 0) return;
        
        const bounds = this.spatialManager.getBoundsForObjects(this.searchResults);
        this.zoomToBounds(bounds, 0.2); // 20% padding
    }

    zoomToBounds(bounds, padding = 0.1) {
        const canvasWidth = this.canvas.width / window.devicePixelRatio;
        const canvasHeight = this.canvas.height / window.devicePixelRatio;
        
        const boundsWidth = bounds.right - bounds.left;
        const boundsHeight = bounds.bottom - bounds.top;
        
        // Add padding
        const paddedWidth = boundsWidth * (1 + padding * 2);
        const paddedHeight = boundsHeight * (1 + padding * 2);
        
        const zoomX = canvasWidth / paddedWidth;
        const zoomY = canvasHeight / paddedHeight;
        const newZoom = Math.min(zoomX, zoomY, 5);
        
        const centerX = bounds.left + boundsWidth / 2;
        const centerY = bounds.top + boundsHeight / 2;
        
        this.animateTo(newZoom, -centerX, -centerY);
    }

    // Utility methods
    screenToWorld(screenX, screenY) {
        const canvasWidth = this.canvas.width / window.devicePixelRatio;
        const canvasHeight = this.canvas.height / window.devicePixelRatio;
        
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        const worldX = (screenX - centerX) / this.zoom - this.panX;
        const worldY = (screenY - centerY) / this.zoom - this.panY;
        
        return { x: worldX, y: worldY };
    }

    worldToScreen(worldX, worldY) {
        const canvasWidth = this.canvas.width / window.devicePixelRatio;
        const canvasHeight = this.canvas.height / window.devicePixelRatio;
        
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        
        const screenX = (worldX + this.panX) * this.zoom + centerX;
        const screenY = (worldY + this.panY) * this.zoom + centerY;
        
        return { x: screenX, y: screenY };
    }

    // Performance and utility methods
    updatePerformanceMonitor() {
        const fpsEl = document.getElementById('fpsCounter');
        const objectsEl = document.getElementById('objectsRendered');
        const memoryEl = document.getElementById('memoryUsage');
        
        if (fpsEl) fpsEl.textContent = this.fps;
        if (objectsEl) objectsEl.textContent = this.visibleObjects.length;
        
        if (memoryEl && performance.memory) {
            const mb = Math.round(performance.memory.usedJSHeapSize / 1048576);
            memoryEl.textContent = mb + 'MB';
        }
    }

    updateStatistics() {
        const totalEl = document.getElementById('total-objects');
        const visibleEl = document.getElementById('visible-objects');
        
        if (totalEl) totalEl.textContent = this.objects.length.toLocaleString();
        if (visibleEl) visibleEl.textContent = this.visibleObjects.length.toLocaleString();
    }

    updateLoadingProgress(percent) {
        const progressBar = document.getElementById('loadingProgress');
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }
    }

    showError(message) {
        console.error('Collection Explorer Error:', message);
        // Could show error UI here
        alert('Error loading collection: ' + message);
    }

    // Lifecycle methods
    pause() {
        this.isPaused = true;
        console.log('⏸️ Collection Explorer paused');
    }

    resume() {
        this.isPaused = false;
        this.needsRedraw = true;
        console.log('▶️ Collection Explorer resumed');
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Clean up event listeners
        window.removeEventListener('resize', this.setupCanvas);
        
        console.log('🗑️ Collection Explorer destroyed');
    }
}

// Export for use in other modules
window.CollectionExplorer = CollectionExplorer;