/**
 * Collection Explorer - Layout Controls System
 * Hans Gross Kriminalmuseum Archive
 * 
 * Responsible for:
 * - UI controls for layout switching
 * - Smooth transitions between layouts
 * - Dynamic control updates based on available data
 * - Layout preferences and state management
 */

class LayoutControls {
    constructor(explorer) {
        this.explorer = explorer;
        this.isTransitioning = false;
        this.currentControls = {
            layoutType: 'clustered',
            primaryGrouping: 'type',
            secondaryGrouping: null
        };
        
        this.createControlsUI();
        this.setupEventListeners();
        this.updateAvailableOptions();
    }

    /**
     * Create the layout controls UI
     */
    createControlsUI() {
        // Check if controls already exist
        if (document.getElementById('layoutControls')) return;
        
        const controlsHTML = `
            <div class="layout-controls collapsed" id="layoutControls">
                <div class="controls-header">
                    <h3>Layout Controls</h3>
                    <button class="controls-toggle" id="controlsToggle" aria-label="Toggle layout controls" aria-expanded="false">
                        <span class="toggle-icon" aria-hidden="true">▶</span>
                    </button>
                </div>

                <div class="controls-content" id="controlsContent" style="display: none;">
                    <div class="control-section">
                        <label for="layoutType">Layout Style</label>
                        <div class="layout-buttons">
                            <button class="layout-btn active" data-layout="clustered" title="Original spiral clusters">
                                <span class="btn-icon">🌀</span>
                                <span class="btn-label">Clusters</span>
                            </button>
                            <button class="layout-btn" data-layout="grid" title="Categorical grid">
                                <span class="btn-icon">⚏</span>
                                <span class="btn-label">Grid</span>
                            </button>
                            <button class="layout-btn" data-layout="timeline" title="Temporal timeline">
                                <span class="btn-icon">📅</span>
                                <span class="btn-label">Timeline</span>
                            </button>
                            <button class="layout-btn" data-layout="radial" title="Radial clusters">
                                <span class="btn-icon">🎯</span>
                                <span class="btn-label">Radial</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="control-section" id="groupingSection">
                        <label for="primaryGrouping">Primary Grouping</label>
                        <select id="primaryGrouping" class="control-select">
                            <option value="type">Object Type</option>
                            <option value="temporal">Time Period</option>
                            <option value="crime">Crime Type</option>
                            <option value="geographic">Geographic Region</option>
                        </select>
                        
                        <label for="secondaryGrouping">Secondary Grouping</label>
                        <select id="secondaryGrouping" class="control-select">
                            <option value="">None</option>
                            <option value="type">Object Type</option>
                            <option value="temporal">Time Period</option>
                            <option value="crime">Crime Type</option>
                            <option value="geographic">Geographic Region</option>
                        </select>
                    </div>
                    
                    <div class="control-section">
                        <div class="layout-info" id="layoutInfo">
                            <div class="info-item">
                                <span class="info-label">Objects:</span>
                                <span class="info-value" id="objectCount">3,892</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Categories:</span>
                                <span class="info-value" id="categoryCount">2</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Layout:</span>
                                <span class="info-value" id="currentLayout">Clustered</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="control-section">
                        <div class="control-actions">
                            <button class="action-btn primary" id="applyLayout">
                                <span class="btn-icon">✨</span>
                                Apply Layout
                            </button>
                            <button class="action-btn secondary" id="resetLayout">
                                <span class="btn-icon">🔄</span>
                                Reset View
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert controls into the page
        const container = document.querySelector('.explorer-main');
        if (container) {
            container.insertAdjacentHTML('beforeend', controlsHTML);
        }
        
        // Add CSS for the controls
        this.injectControlsCSS();
    }

    /**
     * Setup event listeners for all controls
     */
    setupEventListeners() {
        // Toggle controls visibility
        document.getElementById('controlsToggle')?.addEventListener('click', () => {
            this.toggleControls();
        });
        
        // Layout type buttons
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectLayoutType(e.target.closest('.layout-btn').dataset.layout);
            });
        });
        
        // Grouping selects
        document.getElementById('primaryGrouping')?.addEventListener('change', (e) => {
            this.currentControls.primaryGrouping = e.target.value;
            this.updateSecondaryOptions();
            this.updateLayoutInfo();
        });
        
        document.getElementById('secondaryGrouping')?.addEventListener('change', (e) => {
            this.currentControls.secondaryGrouping = e.target.value || null;
            this.updateLayoutInfo();
        });
        
        // Action buttons
        document.getElementById('applyLayout')?.addEventListener('click', () => {
            this.applyCurrentLayout();
        });
        
        document.getElementById('resetLayout')?.addEventListener('click', () => {
            this.resetToDefaultView();
        });
        
        // Layout buttons handle their own switching
        // No keyboard shortcuts needed - buttons provide all functionality
    }

    /**
     * Update available options based on extracted categories
     */
    updateAvailableOptions() {
        if (!this.explorer.categoryManager) return;
        
        const availableGroupings = this.explorer.categoryManager.availableGroupings;
        const primarySelect = document.getElementById('primaryGrouping');
        const secondarySelect = document.getElementById('secondaryGrouping');
        
        if (primarySelect) {
            // Clear existing options
            primarySelect.innerHTML = '';
            
            // Add available groupings
            availableGroupings.forEach(grouping => {
                const option = document.createElement('option');
                option.value = grouping.key;
                option.textContent = grouping.displayName;
                option.title = grouping.description;
                primarySelect.appendChild(option);
            });
            
            // Set default
            if (availableGroupings.length > 0) {
                primarySelect.value = this.currentControls.primaryGrouping;
            }
        }
        
        this.updateSecondaryOptions();
        this.updateLayoutInfo();
    }

    /**
     * Update secondary grouping options (exclude current primary)
     */
    updateSecondaryOptions() {
        if (!this.explorer.categoryManager) return;
        
        const availableGroupings = this.explorer.categoryManager.availableGroupings;
        const secondarySelect = document.getElementById('secondaryGrouping');
        
        if (secondarySelect) {
            secondarySelect.innerHTML = '<option value="">None</option>';
            
            availableGroupings.forEach(grouping => {
                if (grouping.key !== this.currentControls.primaryGrouping) {
                    const option = document.createElement('option');
                    option.value = grouping.key;
                    option.textContent = grouping.displayName;
                    option.title = grouping.description;
                    secondarySelect.appendChild(option);
                }
            });
            
            // Reset secondary if it matches primary
            if (this.currentControls.secondaryGrouping === this.currentControls.primaryGrouping) {
                this.currentControls.secondaryGrouping = null;
                secondarySelect.value = '';
            }
        }
    }

    /**
     * Select layout type and update UI
     */
    selectLayoutType(layoutType) {
        this.currentControls.layoutType = layoutType;
        
        // Update button states
        document.querySelectorAll('.layout-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.layout === layoutType) {
                btn.classList.add('active');
            }
        });
        
        // Show/hide grouping controls based on layout type
        const groupingSection = document.getElementById('groupingSection');
        if (groupingSection) {
            if (layoutType === 'clustered') {
                groupingSection.style.display = 'none';
            } else {
                groupingSection.style.display = 'block';
            }
        }
        
        this.updateLayoutInfo();
    }

    /**
     * Apply the currently selected layout
     */
    applyCurrentLayout() {
        if (this.isTransitioning) return;
        
        this.isTransitioning = true;
        this.showTransitionFeedback();
        
        // Initialize layout manager if not exists
        if (!this.explorer.layoutManager) {
            this.explorer.layoutManager = new LayoutManager(this.explorer);
        }
        
        // Apply the layout
        try {
            this.explorer.layoutManager.switchLayout(
                this.currentControls.layoutType,
                this.currentControls.primaryGrouping,
                this.currentControls.secondaryGrouping
            );
            
            // Smooth zoom to fit new layout
            setTimeout(() => {
                this.fitLayoutToView();
                this.hideTransitionFeedback();
                this.isTransitioning = false;
            }, 300);
            
            this.updateLayoutInfo();
            
        } catch (error) {
            console.error('❌ Error applying layout:', error);
            this.hideTransitionFeedback();
            this.isTransitioning = false;
        }
    }

    /**
     * Quick switch layout without UI updates
     */
    quickSwitchLayout(layoutType) {
        this.selectLayoutType(layoutType);
        this.applyCurrentLayout();
    }

    /**
     * Fit current layout to view
     */
    fitLayoutToView() {
        if (!this.explorer.layoutManager) return;
        
        const bounds = this.explorer.layoutManager.getLayoutBounds();
        this.explorer.zoomToBounds(bounds, 0.1);
    }

    /**
     * Reset to default view
     */
    resetToDefaultView() {
        this.selectLayoutType('clustered');
        this.currentControls.primaryGrouping = 'type';
        this.currentControls.secondaryGrouping = null;
        
        // Update UI
        document.getElementById('primaryGrouping').value = 'type';
        document.getElementById('secondaryGrouping').value = '';
        
        this.applyCurrentLayout();
    }

    /**
     * Update layout information display
     */
    updateLayoutInfo() {
        const objectCount = document.getElementById('objectCount');
        const categoryCount = document.getElementById('categoryCount');
        const currentLayout = document.getElementById('currentLayout');
        
        if (objectCount) {
            objectCount.textContent = this.explorer.objects.length.toLocaleString();
        }
        
        if (this.explorer.categoryManager && categoryCount) {
            const primary = this.explorer.categoryManager.categories[this.currentControls.primaryGrouping];
            const primaryCount = primary ? Object.keys(primary).length : 0;
            
            let totalCategories = primaryCount;
            if (this.currentControls.secondaryGrouping) {
                const secondary = this.explorer.categoryManager.categories[this.currentControls.secondaryGrouping];
                const secondaryCount = secondary ? Object.keys(secondary).length : 0;
                totalCategories = primaryCount * secondaryCount;
            }
            
            categoryCount.textContent = totalCategories;
        }
        
        if (currentLayout) {
            const layoutNames = {
                clustered: 'Clustered',
                grid: 'Grid',
                timeline: 'Timeline',
                radial: 'Radial'
            };
            currentLayout.textContent = layoutNames[this.currentControls.layoutType] || 'Unknown';
        }
    }

    /**
     * Toggle controls visibility
     */
    toggleControls() {
        const content = document.getElementById('controlsContent');
        const toggle = document.getElementById('controlsToggle');
        const controls = document.getElementById('layoutControls');

        if (content && controls) {
            const isVisible = !controls.classList.contains('collapsed');

            if (isVisible) {
                // Collapse
                controls.classList.add('collapsed');
                content.style.display = 'none';
            } else {
                // Expand
                controls.classList.remove('collapsed');
                content.style.display = 'block';
            }

            if (toggle) {
                const icon = toggle.querySelector('.toggle-icon');
                if (icon) {
                    icon.textContent = isVisible ? '▶' : '▼';
                }
                toggle.setAttribute('aria-expanded', !isVisible);
            }
        }
    }

    /**
     * Show transition feedback
     */
    showTransitionFeedback() {
        const applyBtn = document.getElementById('applyLayout');
        if (applyBtn) {
            applyBtn.disabled = true;
            applyBtn.innerHTML = '<span class="btn-icon">⏳</span>Applying...';
        }
    }

    /**
     * Hide transition feedback
     */
    hideTransitionFeedback() {
        const applyBtn = document.getElementById('applyLayout');
        if (applyBtn) {
            applyBtn.disabled = false;
            applyBtn.innerHTML = '<span class="btn-icon">✨</span>Apply Layout';
        }
    }

    /**
     * Inject CSS for controls
     */
    injectControlsCSS() {
        const css = `
            .layout-controls {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 320px;
                background: rgba(255, 255, 255, 0.98);
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                z-index: 1000;
                font-family: system-ui, -apple-system, sans-serif;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .controls-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #e0e0e0;
                background: #f8f8f8;
                border-radius: 8px 8px 0 0;
            }
            
            .controls-header h3 {
                margin: 0;
                color: #333333;
                font-size: 14px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .controls-toggle {
                background: none;
                border: none;
                color: #666;
                cursor: pointer;
                font-size: 14px;
                transition: transform 0.3s ease;
                padding: 4px;
                display: flex;
                align-items: center;
            }

            .controls-toggle:hover {
                color: #333;
            }

            .toggle-icon {
                transition: transform 0.2s ease;
                display: inline-block;
            }

            .layout-controls.collapsed {
                width: auto;
                min-width: 200px;
            }

            .layout-controls.collapsed .controls-content {
                display: none;
            }
            
            .controls-content {
                padding: 16px;
            }
            
            .control-section {
                margin-bottom: 24px;
            }
            
            .control-section:last-child {
                margin-bottom: 0;
            }
            
            .control-section label {
                display: block;
                color: #666;
                font-size: 11px;
                font-weight: 600;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .layout-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-bottom: 16px;
            }
            
            .layout-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                padding: 10px 6px;
                background: white;
                border: 2px solid #e0e0e0;
                border-radius: 6px;
                color: #666;
                cursor: pointer;
                transition: all 0.2s ease;
                font-size: 11px;
            }

            .layout-btn:hover {
                background: #f5f5f5;
                border-color: #007AFF;
                color: #333;
            }

            .layout-btn.active {
                background: #007AFF;
                border-color: #007AFF;
                color: white;
                font-weight: 600;
            }
            
            .btn-icon {
                font-size: 16px;
            }
            
            .btn-label {
                font-weight: 500;
            }
            
            .control-select {
                width: 100%;
                padding: 10px 12px;
                background: #2a2a2a;
                border: 1px solid #404040;
                border-radius: 6px;
                color: #ffffff;
                font-size: 14px;
                margin-bottom: 12px;
            }
            
            .control-select:focus {
                outline: none;
                border-color: #f97316;
            }
            
            .layout-info {
                background: #2a2a2a;
                border-radius: 8px;
                padding: 12px;
            }
            
            .info-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
            }
            
            .info-item:last-child {
                margin-bottom: 0;
            }
            
            .info-label {
                color: #a1a1aa;
                font-size: 12px;
            }
            
            .info-value {
                color: #ffffff;
                font-size: 12px;
                font-weight: 500;
                font-family: monospace;
            }
            
            .control-actions {
                display: flex;
                gap: 8px;
            }
            
            .action-btn {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 12px;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .action-btn.primary {
                background: #f97316;
                color: #ffffff;
            }
            
            .action-btn.primary:hover:not(:disabled) {
                background: #ea580c;
                transform: translateY(-1px);
            }
            
            .action-btn.primary:disabled {
                background: #92400e;
                cursor: not-allowed;
            }
            
            .action-btn.secondary {
                background: #2a2a2a;
                border: 1px solid #404040;
                color: #a1a1aa;
            }
            
            .action-btn.secondary:hover {
                background: #f5f5f5;
                border-color: #999;
                color: #333;
                transform: translateY(-1px);
            }
            
            @media (max-width: 768px) {
                .layout-controls {
                    right: 10px;
                    width: 260px;
                    top: 100px;
                }
                
                .layout-buttons {
                    grid-template-columns: 1fr 1fr;
                    gap: 6px;
                }
                
                .layout-btn {
                    padding: 10px 6px;
                    font-size: 11px;
                }
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = css;
        document.head.appendChild(styleSheet);
    }

    /**
     * Get current layout state
     */
    getCurrentState() {
        return {
            ...this.currentControls,
            isTransitioning: this.isTransitioning
        };
    }

    /**
     * Restore layout state
     */
    restoreState(state) {
        this.currentControls = { ...state };
        this.selectLayoutType(state.layoutType);
        
        const primarySelect = document.getElementById('primaryGrouping');
        const secondarySelect = document.getElementById('secondaryGrouping');
        
        if (primarySelect) primarySelect.value = state.primaryGrouping;
        if (secondarySelect) secondarySelect.value = state.secondaryGrouping || '';
        
        this.updateLayoutInfo();
    }
}

// Export for use
window.LayoutControls = LayoutControls;