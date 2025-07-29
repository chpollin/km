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
            
            console.log('✅ Collection Explorer initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Collection Explorer:', error);
            this.showError(error.message);
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
        console.log('📂 Loading archive data...');
        this.updateLoadingProgress(20);
        
        try {
            let data;
            
            try {
                // Try to load real data first
                const response = await fetch('km_archive/metadata/all_objects.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                data = await response.json();
                console.log('✅ Loaded real archive data');
            } catch (fetchError) {
                console.warn('⚠️ Could not load real data, using mock data for demonstration');
                // Fallback to mock data
                data = this.generateMockData();
            }
            
            this.updateLoadingProgress(50);
            
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

    generateMockData() {
        console.log('🎭 Generating mock data for demonstration...');
        const mockData = [];
        const types = ['karteikarten', 'objekte'];
        const titles = [
            'Revolver Smith & Wesson', 'Fingerprint Analysis Kit', 'Crime Scene Photograph',
            'Evidence Bag', 'Magnifying Glass', 'Handwriting Sample', 'Blood Analysis Report',
            'Witness Statement', 'Court Document', 'Police Report', 'Autopsy Notes',
            'Criminal Portrait', 'Weapon Analysis', 'Forensic Tools', 'Case File',
            'Poison Bottle', 'Lock Pick Set', 'Counterfeit Money', 'Death Certificate',
            'Diary Entry', 'Medical Examination', 'Burglar Tools', 'Suicide Note'
        ];
        
        const crimes = ['Theft', 'Murder', 'Fraud', 'Burglary', 'Assault', 'Forgery', 'Poisoning', 'Counterfeiting'];
        
        // Generate 500 mock objects for demonstration
        for (let i = 1; i <= 500; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const title = titles[Math.floor(Math.random() * titles.length)];
            const crime = crimes[Math.floor(Math.random() * crimes.length)];
            const year = 1890 + Math.floor(Math.random() * 40);
            
            mockData.push({
                pid: `info:fedora:o:km.${i}`,
                identifier: `o:km.${String(i).padStart(4, '0')}`,
                container: type,
                title: `${title} (${year})`,
                description: `${type === 'karteikarten' ? 'Index card documenting a' : 'Physical evidence from a'} ${crime.toLowerCase()} case from ${year}. Contains detailed forensic analysis and investigation notes.`,
                createdDate: `${year}`,
                image_downloaded: Math.random() > 0.3,
                tei_downloaded: Math.random() > 0.4,
                lido_downloaded: Math.random() > 0.5,
                rdf_downloaded: Math.random() > 0.6,
                fulltext: Math.random() > 0.7 ? `Detailed case notes for ${crime} investigation...` : null
            });
        }
        
        return mockData;
    }

    processObjects(data) {
        return data.map((obj, index) => {
            // Calculate completeness score
            const completeness = this.calculateCompleteness(obj);
            
            // Determine colors based on type and completeness
            const colors = this.getObjectColors(obj, completeness);
            
            return {
                ...obj,
                x: 0, // Will be set by spatial manager
                y: 0, // Will be set by spatial manager
                completeness: completeness,
                colors: colors,
                visible: false,
                searchMatch: false,
                selected: false,
                index: index
            };
        });
    }

    calculateCompleteness(obj) {
        let score = 0;
        let maxScore = 5;
        
        // Basic metadata
        if (obj.title && obj.title.trim()) score += 1;
        if (obj.description && obj.description.trim()) score += 1;
        
        // File availability
        if (obj.image_downloaded) score += 1;
        if (obj.tei_downloaded || obj.lido_downloaded) score += 1;
        if (obj.rdf_downloaded) score += 1;
        
        return score / maxScore;
    }

    getObjectColors(obj, completeness) {
        const isIncomplete = completeness < 0.7;
        
        if (obj.container === 'karteikarten') {
            return {
                primary: isIncomplete ? '#15803d' : '#22c55e',
                secondary: '#16a34a',
                border: isIncomplete ? '#15803d' : '#22c55e'
            };
        } else {
            return {
                primary: isIncomplete ? '#dc2626' : '#f97316',
                secondary: '#ea580c',
                border: isIncomplete ? '#dc2626' : '#f97316'
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
        this.targetZoom = Math.max(0.1, Math.min(5, newZoom));
        
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