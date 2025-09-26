/**
 * Collection Explorer - Layout Management System
 * Hans Gross Kriminalmuseum Archive
 * 
 * Responsible for:
 * - Grid layout algorithms for categorical grouping
 * - Hierarchical positioning (Primary × Secondary categories)
 * - Optimal spacing and arrangement calculations
 * - Layout transitions and animations
 */

class LayoutManager {
    constructor(explorer) {
        this.explorer = explorer;
        this.currentLayout = 'clustered'; // Default from existing system
        this.currentPrimary = 'type';
        this.currentSecondary = null;
        
        // Layout configuration
        this.config = {
            gridSpacing: 400,        // Space between grid cells
            cellPadding: 50,         // Padding inside each cell
            objectSpacing: 25,       // Space between objects within cell
            headerHeight: 60,        // Space for category headers
            minCellSize: 300,        // Minimum cell dimensions
            maxObjectsPerRow: 12     // Max objects per row in cell
        };
        
        this.layoutCache = new Map();
    }

    /**
     * Create grid layout based on primary and secondary groupings
     */
    createGridLayout(primaryDimension, secondaryDimension = null) {
        console.log(`📐 Creating grid layout: ${primaryDimension}${secondaryDimension ? ' × ' + secondaryDimension : ''}`);
        
        this.currentLayout = 'grid';
        this.currentPrimary = primaryDimension;
        this.currentSecondary = secondaryDimension;
        
        const cacheKey = `${primaryDimension}-${secondaryDimension}`;
        if (this.layoutCache.has(cacheKey)) {
            console.log('📋 Using cached layout');
            return this.layoutCache.get(cacheKey);
        }
        
        let groupedData;
        if (secondaryDimension) {
            groupedData = this.explorer.categoryManager.groupObjects(primaryDimension, secondaryDimension);
            this.createHierarchicalGrid(groupedData);
        } else {
            groupedData = this.explorer.categoryManager.categories[primaryDimension];
            this.createSimpleGrid(groupedData);
        }
        
        this.layoutCache.set(cacheKey, groupedData);
        return groupedData;
    }

    /**
     * Create simple grid for single dimension grouping
     */
    createSimpleGrid(categories) {
        const categoryKeys = Object.keys(categories).sort();
        const gridDimensions = this.calculateOptimalGrid(categoryKeys.length);
        
        console.log(`📊 Simple grid: ${gridDimensions.cols} × ${gridDimensions.rows}`);
        
        categoryKeys.forEach((categoryKey, index) => {
            const category = categories[categoryKey];
            const gridPos = this.getGridPosition(index, gridDimensions.cols);
            const cellBounds = this.calculateCellBounds(gridPos, gridDimensions);
            
            this.positionObjectsInCell(category.objects, cellBounds, categoryKey);
        });
    }

    /**
     * Create hierarchical grid for two-dimension grouping
     */
    createHierarchicalGrid(hierarchicalData) {
        const primaryKeys = Object.keys(hierarchicalData).sort();
        
        // Calculate grid based on primary categories
        const primaryGrid = this.calculateOptimalGrid(primaryKeys.length);
        
        console.log(`📊 Hierarchical grid: ${primaryGrid.cols} × ${primaryGrid.rows} primary cells`);
        
        primaryKeys.forEach((primaryKey, primaryIndex) => {
            const secondaryData = hierarchicalData[primaryKey];
            const secondaryKeys = Object.keys(secondaryData).sort();
            
            if (secondaryKeys.length === 0) return;
            
            // Position for primary category
            const primaryGridPos = this.getGridPosition(primaryIndex, primaryGrid.cols);
            const primaryCellBounds = this.calculateCellBounds(primaryGridPos, primaryGrid);
            
            // Calculate sub-grid for secondary categories
            const secondaryGrid = this.calculateOptimalGrid(secondaryKeys.length);
            
            secondaryKeys.forEach((secondaryKey, secondaryIndex) => {
                const category = secondaryData[secondaryKey];
                const secondaryGridPos = this.getGridPosition(secondaryIndex, secondaryGrid.cols);
                
                // Calculate position within primary cell
                const subCellBounds = this.calculateSubCellBounds(
                    primaryCellBounds, 
                    secondaryGridPos, 
                    secondaryGrid
                );
                
                const categoryLabel = `${primaryKey}-${secondaryKey}`;
                this.positionObjectsInCell(category.objects, subCellBounds, categoryLabel);
            });
        });
    }

    /**
     * Position objects within a grid cell
     */
    positionObjectsInCell(objects, cellBounds, categoryLabel) {
        if (!objects || objects.length === 0) return;
        
        const objectsPerRow = Math.min(
            this.config.maxObjectsPerRow,
            Math.ceil(Math.sqrt(objects.length))
        );
        
        const availableWidth = cellBounds.width - (this.config.cellPadding * 2);
        const availableHeight = cellBounds.height - (this.config.cellPadding * 2) - this.config.headerHeight;
        
        const objectSpacingX = availableWidth / objectsPerRow;
        const rows = Math.ceil(objects.length / objectsPerRow);
        const objectSpacingY = availableHeight / rows;
        
        objects.forEach((obj, index) => {
            const row = Math.floor(index / objectsPerRow);
            const col = index % objectsPerRow;
            
            // Add slight randomization to avoid perfect grid monotony
            const jitterX = (Math.random() - 0.5) * (this.config.objectSpacing * 0.3);
            const jitterY = (Math.random() - 0.5) * (this.config.objectSpacing * 0.3);
            
            obj.x = cellBounds.x + this.config.cellPadding + 
                   (col * objectSpacingX) + (objectSpacingX / 2) + jitterX;
            
            obj.y = cellBounds.y + this.config.cellPadding + this.config.headerHeight +
                   (row * objectSpacingY) + (objectSpacingY / 2) + jitterY;
            
            // Store category information for rendering
            obj.gridCategory = categoryLabel;
            obj.cellBounds = cellBounds;
        });
        
        console.log(`📍 Positioned ${objects.length} objects in cell: ${categoryLabel}`);
    }

    /**
     * Calculate optimal grid dimensions for given number of items
     */
    calculateOptimalGrid(itemCount) {
        if (itemCount <= 1) return { cols: 1, rows: 1 };
        if (itemCount <= 2) return { cols: 2, rows: 1 };
        if (itemCount <= 4) return { cols: 2, rows: 2 };
        if (itemCount <= 6) return { cols: 3, rows: 2 };
        if (itemCount <= 9) return { cols: 3, rows: 3 };
        if (itemCount <= 12) return { cols: 4, rows: 3 };
        
        // For larger numbers, aim for roughly square grid
        const cols = Math.ceil(Math.sqrt(itemCount));
        const rows = Math.ceil(itemCount / cols);
        
        return { cols, rows };
    }

    /**
     * Get grid position (row, col) from linear index
     */
    getGridPosition(index, cols) {
        return {
            row: Math.floor(index / cols),
            col: index % cols
        };
    }

    /**
     * Calculate cell bounds for grid position
     */
    calculateCellBounds(gridPos, gridDimensions) {
        const totalWidth = gridDimensions.cols * this.config.gridSpacing;
        const totalHeight = gridDimensions.rows * this.config.gridSpacing;
        
        // Center the entire grid
        const startX = -totalWidth / 2;
        const startY = -totalHeight / 2;
        
        return {
            x: startX + (gridPos.col * this.config.gridSpacing),
            y: startY + (gridPos.row * this.config.gridSpacing),
            width: this.config.gridSpacing,
            height: this.config.gridSpacing
        };
    }

    /**
     * Calculate sub-cell bounds within a primary cell
     */
    calculateSubCellBounds(primaryBounds, secondaryGridPos, secondaryGrid) {
        const subCellWidth = (primaryBounds.width - this.config.cellPadding * 2) / secondaryGrid.cols;
        const subCellHeight = (primaryBounds.height - this.config.cellPadding * 2 - this.config.headerHeight) / secondaryGrid.rows;
        
        return {
            x: primaryBounds.x + this.config.cellPadding + (secondaryGridPos.col * subCellWidth),
            y: primaryBounds.y + this.config.cellPadding + this.config.headerHeight + (secondaryGridPos.row * subCellHeight),
            width: subCellWidth,
            height: subCellHeight
        };
    }

    /**
     * Create temporal timeline layout (horizontal chronological arrangement)
     * Uses historical dates from 1850-1950 instead of digitization dates
     */
    createTemporalTimeline() {
        console.log('📅 Creating temporal timeline layout with historical dates');

        this.currentLayout = 'timeline';

        // Group objects by historical decade
        const objectsByDecade = {};
        const minYear = 1850;
        const maxYear = 1950;

        // Initialize decades
        for (let year = minYear; year <= maxYear; year += 10) {
            const decadeKey = `${year}s`;
            objectsByDecade[decadeKey] = {
                label: decadeKey,
                year: year,
                objects: [],
                exactCount: 0,
                estimatedCount: 0
            };
        }

        // Add "Unknown" category for objects without dates
        objectsByDecade['Unknown'] = {
            label: 'Unknown',
            year: maxYear + 20,
            objects: [],
            exactCount: 0,
            estimatedCount: 0
        };

        // Sort objects into decades based on historical year
        this.explorer.objects.forEach(obj => {
            let year = obj.year || obj.historicalYear;
            let isEstimated = obj.dateEstimated === true;

            if (!year || year < minYear || year > maxYear) {
                // Put objects without valid historical dates in Unknown
                objectsByDecade['Unknown'].objects.push(obj);
                if (year && isEstimated) {
                    objectsByDecade['Unknown'].estimatedCount++;
                }
            } else {
                // Calculate decade
                const decade = Math.floor(year / 10) * 10;
                const decadeKey = `${decade}s`;

                if (objectsByDecade[decadeKey]) {
                    objectsByDecade[decadeKey].objects.push(obj);
                    if (isEstimated) {
                        objectsByDecade[decadeKey].estimatedCount++;
                    } else {
                        objectsByDecade[decadeKey].exactCount++;
                    }
                }
            }
        });

        // Filter out empty decades and sort
        const activeDecades = Object.keys(objectsByDecade)
            .filter(key => objectsByDecade[key].objects.length > 0)
            .sort((a, b) => objectsByDecade[a].year - objectsByDecade[b].year);

        console.log(`📊 Timeline spans ${activeDecades.length} decades with objects`);
        activeDecades.forEach(decade => {
            const data = objectsByDecade[decade];
            console.log(`  ${decade}: ${data.objects.length} objects (${data.exactCount} exact, ${data.estimatedCount} estimated)`);
        });

        // Calculate timeline layout
        const timelineWidth = activeDecades.length * this.config.gridSpacing;
        const startX = -timelineWidth / 2;

        activeDecades.forEach((decadeKey, index) => {
            const decadeData = objectsByDecade[decadeKey];
            const x = startX + (index * this.config.gridSpacing);

            // Position objects in vertical column for each decade
            // Pass additional info for potential visual differentiation
            this.positionObjectsInTimelineColumn(decadeData.objects, x, decadeKey, decadeData);
        });
    }

    /**
     * Position objects in a vertical column
     */
    positionObjectsInColumn(objects, centerX, categoryLabel) {
        if (!objects || objects.length === 0) return;

        const objectsPerRow = 8;
        const rows = Math.ceil(objects.length / objectsPerRow);
        const totalHeight = rows * this.config.objectSpacing;
        const startY = -totalHeight / 2;

        objects.forEach((obj, index) => {
            const row = Math.floor(index / objectsPerRow);
            const col = index % objectsPerRow;

            const offsetX = (col - objectsPerRow / 2) * (this.config.objectSpacing * 0.7);
            const jitterX = (Math.random() - 0.5) * 5;
            const jitterY = (Math.random() - 0.5) * 5;

            obj.x = centerX + offsetX + jitterX;
            obj.y = startY + (row * this.config.objectSpacing) + jitterY;
            obj.gridCategory = categoryLabel;
        });
    }

    /**
     * Position objects in timeline column with chronological sorting
     */
    positionObjectsInTimelineColumn(objects, centerX, categoryLabel, decadeData) {
        if (!objects || objects.length === 0) return;

        // Sort objects by year within decade for better visual organization
        const sortedObjects = [...objects].sort((a, b) => {
            const yearA = a.year || a.historicalYear || 0;
            const yearB = b.year || b.historicalYear || 0;
            return yearA - yearB;
        });

        const objectsPerRow = 10; // Slightly more objects per row for timeline
        const rows = Math.ceil(sortedObjects.length / objectsPerRow);
        const totalHeight = rows * this.config.objectSpacing;
        const startY = -totalHeight / 2;

        sortedObjects.forEach((obj, index) => {
            const row = Math.floor(index / objectsPerRow);
            const col = index % objectsPerRow;

            // Tighter horizontal spacing for timeline view
            const offsetX = (col - objectsPerRow / 2) * (this.config.objectSpacing * 0.5);

            // Less jitter for cleaner timeline appearance
            const jitterX = (Math.random() - 0.5) * 3;
            const jitterY = (Math.random() - 0.5) * 3;

            obj.x = centerX + offsetX + jitterX;
            obj.y = startY + (row * this.config.objectSpacing) + jitterY;
            obj.gridCategory = categoryLabel;

            // Store timeline metadata for rendering
            obj.timelineDecade = categoryLabel;
            obj.isEstimatedDate = obj.dateEstimated === true;
        });
    }

    /**
     * Create radial cluster layout (circular arrangement of categories)
     */
    createRadialClusters(dimension) {
        console.log(`🎯 Creating radial cluster layout for ${dimension}`);
        
        this.currentLayout = 'radial';
        const categories = this.explorer.categoryManager.categories[dimension];
        const categoryKeys = Object.keys(categories);
        
        const centerRadius = 200;
        const angleStep = (2 * Math.PI) / categoryKeys.length;
        
        categoryKeys.forEach((categoryKey, index) => {
            const category = categories[categoryKey];
            const angle = index * angleStep;
            
            const centerX = Math.cos(angle) * centerRadius;
            const centerY = Math.sin(angle) * centerRadius;
            
            // Create circular cluster for each category
            this.positionObjectsInCluster(category.objects, centerX, centerY, categoryKey);
        });
    }

    /**
     * Position objects in circular cluster
     */
    positionObjectsInCluster(objects, centerX, centerY, categoryLabel) {
        if (!objects || objects.length === 0) return;
        
        const rings = Math.ceil(Math.sqrt(objects.length / Math.PI));
        const baseRadius = 30;
        
        objects.forEach((obj, index) => {
            const ring = Math.floor(Math.sqrt(index));
            const itemsInRing = Math.max(1, Math.floor(2 * Math.PI * (ring + 1)));
            const angleInRing = (index - ring * ring) / itemsInRing * 2 * Math.PI;
            
            const radius = baseRadius + (ring * 40);
            const jitterRadius = (Math.random() - 0.5) * 10;
            
            obj.x = centerX + Math.cos(angleInRing) * (radius + jitterRadius);
            obj.y = centerY + Math.sin(angleInRing) * (radius + jitterRadius);
            obj.gridCategory = categoryLabel;
        });
    }

    /**
     * Get current layout information for UI
     */
    getCurrentLayoutInfo() {
        return {
            type: this.currentLayout,
            primary: this.currentPrimary,
            secondary: this.currentSecondary,
            stats: this.getLayoutStats()
        };
    }

    /**
     * Get statistics for current layout
     */
    getLayoutStats() {
        const stats = {
            totalObjects: this.explorer.objects.length,
            categoriesUsed: 0,
            layoutDimensions: { width: 0, height: 0 }
        };
        
        if (this.currentLayout === 'grid') {
            const categories = this.currentSecondary ? 
                this.explorer.categoryManager.groupObjects(this.currentPrimary, this.currentSecondary) :
                this.explorer.categoryManager.categories[this.currentPrimary];
            
            stats.categoriesUsed = this.countCategories(categories);
        }
        
        return stats;
    }

    /**
     * Count total categories in potentially hierarchical structure
     */
    countCategories(categories) {
        let count = 0;
        Object.keys(categories).forEach(key => {
            if (categories[key].objects) {
                count++;
            } else {
                count += this.countCategories(categories[key]);
            }
        });
        return count;
    }

    /**
     * Switch to different layout type
     */
    switchLayout(layoutType, primaryDimension, secondaryDimension = null) {
        console.log(`🔄 Switching to ${layoutType} layout`);
        
        switch (layoutType) {
            case 'grid':
                this.createGridLayout(primaryDimension, secondaryDimension);
                break;
            case 'timeline':
                this.createTemporalTimeline();
                break;
            case 'radial':
                this.createRadialClusters(primaryDimension);
                break;
            case 'clustered':
                // Fall back to original clustered layout
                this.explorer.spatialManager.createClusteredLayout();
                this.currentLayout = 'clustered';
                break;
            default:
                console.warn(`Unknown layout type: ${layoutType}`);
        }
        
        // Rebuild spatial index with new positions
        this.explorer.spatialManager.buildSpatialIndex();
        this.explorer.needsRedraw = true;
    }

    /**
     * Get layout bounds for zoom fitting
     */
    getLayoutBounds() {
        if (this.explorer.objects.length === 0) {
            return { left: -1000, right: 1000, top: -1000, bottom: 1000 };
        }
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        this.explorer.objects.forEach(obj => {
            minX = Math.min(minX, obj.x);
            maxX = Math.max(maxX, obj.x);
            minY = Math.min(minY, obj.y);
            maxY = Math.max(maxY, obj.y);
        });
        
        const padding = 100;
        return {
            left: minX - padding,
            right: maxX + padding,
            top: minY - padding,
            bottom: maxY + padding
        };
    }

    /**
     * Clear layout cache (useful when data changes)
     */
    clearCache() {
        this.layoutCache.clear();
        console.log('🗑️ Layout cache cleared');
    }
}

// Export for use
window.LayoutManager = LayoutManager;