/**
 * Compact Layout Controls for Collection Explorer - Right Side Panel
 */
class LayoutControlsRight {
    constructor(explorer) {
        this.explorer = explorer;
        this.isOpen = false;
        this.currentLayout = 'clustered';

        this.createControlsPanel();
        this.setupEventListeners();
    }

    createControlsPanel() {
        // Remove any existing controls
        const existing = document.getElementById('layoutControlsRight');
        if (existing) existing.remove();

        const controlsHTML = `
            <div class="layout-controls-panel" id="layoutControlsRight">
                <button class="controls-tab" id="controlsTab" aria-label="Layout controls">
                    <span class="tab-icon">◀</span>
                    <span class="tab-label">Layout</span>
                </button>

                <div class="controls-panel-content" id="controlsPanelContent">
                    <div class="panel-header">
                        <span class="panel-title">Layout</span>
                    </div>

                    <div class="layout-grid">
                        <button class="layout-opt active" data-layout="clustered" title="Clustered">
                            <span>🌀</span>
                        </button>
                        <button class="layout-opt" data-layout="grid" title="Grid">
                            <span>⚏</span>
                        </button>
                        <button class="layout-opt" data-layout="timeline" title="Timeline">
                            <span>📅</span>
                        </button>
                        <button class="layout-opt" data-layout="radial" title="Radial">
                            <span>🎯</span>
                        </button>
                    </div>

                    <div class="grouping-section" id="groupingOptions" style="display: none;">
                        <label>Group by</label>
                        <select id="primaryGroup" class="group-select">
                            <option value="type">Type</option>
                            <option value="temporal">Time</option>
                            <option value="crime">Crime</option>
                            <option value="geographic">Region</option>
                        </select>
                    </div>

                    <button class="apply-btn" id="applyLayoutBtn">Apply</button>
                </div>
            </div>
        `;

        document.querySelector('.explorer-main').insertAdjacentHTML('beforeend', controlsHTML);
        this.addStyles();
    }

    addStyles() {
        const styleId = 'layout-controls-right-styles';
        if (document.getElementById(styleId)) return;

        const styles = `
            .layout-controls-panel {
                position: fixed;
                right: 0;
                top: 50%;
                transform: translateY(-50%);
                z-index: 999;
                transition: right 0.3s ease;
            }

            .layout-controls-panel.open {
                right: 0;
            }

            .layout-controls-panel:not(.open) .controls-panel-content {
                transform: translateX(100%);
            }

            .controls-tab {
                position: absolute;
                left: -32px;
                top: 0;
                width: 32px;
                height: 80px;
                background: white;
                border: 1px solid #ddd;
                border-right: none;
                border-radius: 6px 0 0 6px;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 4px;
                font-size: 11px;
                color: #666;
                box-shadow: -2px 0 4px rgba(0,0,0,0.05);
                transition: all 0.2s ease;
            }

            .controls-tab:hover {
                background: #f8f8f8;
                left: -34px;
                width: 34px;
            }

            .tab-icon {
                transition: transform 0.3s ease;
                font-size: 12px;
            }

            .layout-controls-panel.open .tab-icon {
                transform: rotate(180deg);
            }

            .tab-label {
                writing-mode: vertical-rl;
                text-orientation: mixed;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .controls-panel-content {
                width: 180px;
                background: white;
                border: 1px solid #ddd;
                border-right: none;
                border-radius: 8px 0 0 8px;
                box-shadow: -2px 0 8px rgba(0,0,0,0.1);
                transition: transform 0.3s ease;
                overflow: hidden;
            }

            .panel-header {
                padding: 10px 12px;
                background: #f8f8f8;
                border-bottom: 1px solid #e0e0e0;
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #333;
            }

            .layout-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 4px;
                padding: 12px;
            }

            .layout-opt {
                aspect-ratio: 1;
                background: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .layout-opt:hover {
                background: #e8e8e8;
                border-color: #999;
            }

            .layout-opt.active {
                background: #007AFF;
                border-color: #007AFF;
                color: white;
            }

            .grouping-section {
                padding: 0 12px 12px;
            }

            .grouping-section label {
                display: block;
                font-size: 11px;
                font-weight: 500;
                margin-bottom: 6px;
                color: #666;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .group-select {
                width: 100%;
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 12px;
                background: white;
                cursor: pointer;
            }

            .apply-btn {
                width: calc(100% - 24px);
                margin: 0 12px 12px;
                padding: 8px;
                background: #007AFF;
                color: white;
                border: none;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: opacity 0.2s ease;
            }

            .apply-btn:hover {
                opacity: 0.9;
            }

            .apply-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;

        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }

    setupEventListeners() {
        // Tab toggle
        const tab = document.getElementById('controlsTab');
        tab?.addEventListener('click', () => this.toggle());

        // Layout buttons
        document.querySelectorAll('.layout-opt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.layout-opt').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentLayout = btn.dataset.layout;

                // Show/hide grouping for non-clustered layouts
                const grouping = document.getElementById('groupingOptions');
                if (grouping) {
                    grouping.style.display = this.currentLayout === 'clustered' ? 'none' : 'block';
                }
            });
        });

        // Apply button
        const applyBtn = document.getElementById('applyLayoutBtn');
        applyBtn?.addEventListener('click', () => this.applyLayout());
    }

    toggle() {
        this.isOpen = !this.isOpen;
        const panel = document.getElementById('layoutControlsRight');
        if (panel) {
            panel.classList.toggle('open', this.isOpen);
        }
    }

    applyLayout() {
        const applyBtn = document.getElementById('applyLayoutBtn');
        if (applyBtn) {
            applyBtn.disabled = true;
            applyBtn.textContent = 'Applying...';
        }

        // Initialize layout manager if needed
        if (!this.explorer.layoutManager) {
            this.explorer.layoutManager = new LayoutManager(this.explorer);
        }

        // Get grouping if not clustered
        let primaryGrouping = null;
        if (this.currentLayout !== 'clustered') {
            const select = document.getElementById('primaryGroup');
            primaryGrouping = select?.value || 'type';
        }

        // Apply layout
        try {
            this.explorer.layoutManager.switchLayout(
                this.currentLayout,
                primaryGrouping,
                null
            );

            // Reset button after animation
            setTimeout(() => {
                if (applyBtn) {
                    applyBtn.disabled = false;
                    applyBtn.textContent = 'Apply';
                }
                // Auto-close panel
                this.toggle();
            }, 500);

        } catch (error) {
            console.error('Error applying layout:', error);
            if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.textContent = 'Apply';
            }
        }
    }
}

// Export for use
window.LayoutControlsRight = LayoutControlsRight;