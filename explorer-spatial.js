/**
 * Collection Explorer - Spatial Management System
 * Hans Gross Kriminalmuseum Archive
 * 
 * Responsible for:
 * - Spatial positioning algorithms
 * - Zoom level calculations and object representations
 * - Spatial indexing (QuadTree)
 * - Object rendering at different detail levels
 */

class SpatialManager {
    constructor(explorer) {
        this.explorer = explorer;
        this.spatialIndex = null;
        this.currentStrategy = 'clustered';
        
        // Zoom level configurations
        this.zoomLevels = {
            dots: { min: 0.1, max: 0.3 },
            chips: { min: 0.3, max: 0.6 },
            thumbnails: { min: 0.6, max: 1.5 },
            cards: { min: 1.5, max: 3.0 },
            full: { min: 3.0, max: 10.0 }
        };
        
        // Object type configurations
        this.objectTypes = {
            karteikarten: { color: '#22c55e' },
            objekte: { color: '#f97316' }
        };
    }

    processObjectPositions() {
        console.log('🗺️ Processing spatial positions...');
        
        switch (this.currentStrategy) {
            case 'clustered':
                this.createClusteredLayout();
                break;
            case 'temporal':
                this.createTemporalLayout();
                break;
            case 'grid':
                this.createGridLayout();
                break;
            default:
                this.createSimilarityLayout();
        }
        
        this.buildSpatialIndex();
        console.log('✅ Spatial positioning complete');
    }

    createClusteredLayout() {
        // Group objects by type and create clusters
        const karteikarten = this.explorer.objects.filter(obj => obj.container === 'karteikarten');
        const objekte = this.explorer.objects.filter(obj => obj.container === 'objekte');
        
        // Create main clusters
        this.positionCluster(karteikarten, -1000, -500, 'circular');
        this.positionCluster(objekte, 1000, 500, 'spiral');
    }

    positionCluster(objects, centerX, centerY, pattern = 'circular') {
        const count = objects.length;
        
        objects.forEach((obj, index) => {
            let position;
            
            switch (pattern) {
                case 'spiral':
                    position = this.getSpiralPosition(index, count, centerX, centerY);
                    break;
                case 'grid':
                    position = this.getGridPosition(index, count, centerX, centerY);
                    break;
                case 'circular':
                default:
                    position = this.getCircularPosition(index, count, centerX, centerY);
            }
            
            obj.x = position.x;
            obj.y = position.y;
        });
    }

    getCircularPosition(index, total, centerX, centerY) {
        const rings = Math.ceil(Math.sqrt(total / Math.PI));
        const itemsPerRing = Math.ceil(total / rings);
        const ringIndex = Math.floor(index / itemsPerRing);
        const positionInRing = index % itemsPerRing;
        
        const radius = 50 + ringIndex * 80;
        const itemsInThisRing = Math.min(itemsPerRing, total - ringIndex * itemsPerRing);
        const angle = (positionInRing / itemsInThisRing) * 2 * Math.PI;
        
        // Add some randomness to make it more organic
        const jitter = 20;
        const jitterX = (Math.random() - 0.5) * jitter;
        const jitterY = (Math.random() - 0.5) * jitter;
        
        return {
            x: centerX + Math.cos(angle) * radius + jitterX,
            y: centerY + Math.sin(angle) * radius + jitterY
        };
    }

    getSpiralPosition(index, total, centerX, centerY) {
        const spiralTightness = 0.1;
        const angle = index * spiralTightness;
        const radius = angle * 15;
        
        return {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
        };
    }

    getGridPosition(index, total, centerX, centerY) {
        const columns = Math.ceil(Math.sqrt(total));
        const row = Math.floor(index / columns);
        const col = index % columns;
        
        const spacing = 60;
        const offsetX = -(columns * spacing) / 2;
        const offsetY = -(Math.ceil(total / columns) * spacing) / 2;
        
        return {
            x: centerX + offsetX + col * spacing,
            y: centerY + offsetY + row * spacing
        };
    }

    buildSpatialIndex() {
        // Build QuadTree for efficient spatial queries
        const bounds = this.getCollectionBounds();
        this.spatialIndex = new QuadTree(bounds, 10, 5);
        
        this.explorer.objects.forEach(obj => {
            this.spatialIndex.insert({
                x: obj.x,
                y: obj.y,
                width: 1,
                height: 1,
                object: obj
            });
        });
        
        console.log('🌳 Spatial index built with', this.explorer.objects.length, 'objects');
    }

    getCollectionBounds() {
        if (this.explorer.objects.length === 0) {
            return { x: -2500, y: -2000, width: 5000, height: 4000 };
        }
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        this.explorer.objects.forEach(obj => {
            minX = Math.min(minX, obj.x);
            maxX = Math.max(maxX, obj.x);
            minY = Math.min(minY, obj.y);
            maxY = Math.max(maxY, obj.y);
        });
        
        const padding = 200;
        return {
            x: minX - padding,
            y: minY - padding,
            width: (maxX - minX) + padding * 2,
            height: (maxY - minY) + padding * 2
        };
    }

    getBoundsForObjects(objects) {
        if (objects.length === 0) return this.getCollectionBounds();
        
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        objects.forEach(obj => {
            minX = Math.min(minX, obj.x);
            maxX = Math.max(maxX, obj.x);
            minY = Math.min(minY, obj.y);
            maxY = Math.max(maxY, obj.y);
        });
        
        return {
            left: minX,
            right: maxX,
            top: minY,
            bottom: maxY
        };
    }

    getObjectsInBounds(bounds) {
        if (!this.spatialIndex) return this.explorer.objects;
        
        const candidates = this.spatialIndex.retrieve({
            x: bounds.left,
            y: bounds.top,
            width: bounds.right - bounds.left,
            height: bounds.bottom - bounds.top
        });
        
        return candidates.map(candidate => candidate.object);
    }

    // Rendering methods for different zoom levels
    renderObjects(ctx, zoom) {
        const level = this.getZoomLevel(zoom);
        
        for (const obj of this.explorer.visibleObjects) {
            this.renderObject(ctx, obj, level, zoom);
        }
    }

    getZoomLevel(zoom) {
        if (zoom <= this.zoomLevels.dots.max) return 'dots';
        if (zoom <= this.zoomLevels.chips.max) return 'chips';
        if (zoom <= this.zoomLevels.thumbnails.max) return 'thumbnails';
        if (zoom <= this.zoomLevels.cards.max) return 'cards';
        return 'full';
    }

    renderObject(ctx, obj, level, zoom) {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        
        // Apply highlighting for search results
        if (obj.searchMatch && this.explorer.searchTerm) {
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10 / zoom;
        }
        
        // Apply selection highlight
        if (obj.selected) {
            ctx.shadowColor = '#3b82f6';
            ctx.shadowBlur = 15 / zoom;
        }
        
        switch (level) {
            case 'dots':
                this.renderDot(ctx, obj, zoom);
                break;
            case 'chips':
                this.renderChip(ctx, obj, zoom);
                break;
            case 'thumbnails':
                this.renderThumbnail(ctx, obj, zoom);
                break;
            case 'cards':
                this.renderCard(ctx, obj, zoom);
                break;
            case 'full':
                this.renderFullCard(ctx, obj, zoom);
                break;
        }
        
        ctx.restore();
    }

    renderDot(ctx, obj, zoom) {
        const size = 3 / zoom;
        
        ctx.fillStyle = obj.colors.primary;
        ctx.fillRect(-size/2, -size/2, size, size);
        
        // Selection indicator
        if (obj.selected) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2 / zoom;
            ctx.strokeRect(-size/2 - 2/zoom, -size/2 - 2/zoom, size + 4/zoom, size + 4/zoom);
        }
    }

    renderChip(ctx, obj, zoom) {
        const size = 24 / zoom;
        
        // Background
        ctx.fillStyle = obj.colors.primary;
        ctx.fillRect(-size/2, -size/2, size, size);
        
        // ID text
        ctx.fillStyle = 'white';
        ctx.font = `${10/zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const idText = obj.identifier ? obj.identifier.slice(-3) : '???';
        ctx.fillText(idText, 0, 0);
        
        // Selection border
        if (obj.selected) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3 / zoom;
            ctx.strokeRect(-size/2 - 3/zoom, -size/2 - 3/zoom, size + 6/zoom, size + 6/zoom);
        }
    }

    renderThumbnail(ctx, obj, zoom) {
        const size = 80 / zoom;
        
        // Border
        ctx.strokeStyle = obj.colors.border;
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(-size/2, -size/2, size, size);
        
        // Background
        ctx.fillStyle = obj.colors.primary;
        ctx.globalAlpha = 0.1;
        ctx.fillRect(-size/2, -size/2, size, size);
        ctx.globalAlpha = 1;
        
        // Image area
        if (obj.image_downloaded) {
            ctx.fillStyle = '#404040';
            ctx.fillRect(-size/2 + 4/zoom, -size/2 + 4/zoom, size - 8/zoom, size * 0.7);
            
            // Image icon
            ctx.fillStyle = '#666';
            ctx.font = `${16/zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📷', 0, -size * 0.15);
        }
        
        // ID text
        ctx.fillStyle = 'white';
        ctx.font = `${12/zoom}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.identifier || '', 0, size * 0.35);
        
        // Selection indicator
        if (obj.selected) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3 / zoom;
            ctx.strokeRect(-size/2 - 3/zoom, -size/2 - 3/zoom, size + 6/zoom, size + 6/zoom);
        }
    }

    renderCard(ctx, obj, zoom) {
        const width = 200 / zoom;
        const height = 250 / zoom;
        
        // Background
        ctx.fillStyle = 'rgba(42, 42, 42, 0.9)';
        ctx.fillRect(-width/2, -height/2, width, height);
        
        // Border
        ctx.strokeStyle = obj.colors.border;
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(-width/2, -height/2, width, height);
        
        // Image area
        const imageHeight = height * 0.6;
        if (obj.image_downloaded) {
            ctx.fillStyle = '#404040';
            ctx.fillRect(-width/2 + 4/zoom, -height/2 + 4/zoom, width - 8/zoom, imageHeight - 8/zoom);
            
            // Image icon
            ctx.fillStyle = '#666';
            ctx.font = `${24/zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📷', 0, -height/2 + imageHeight/2);
        }
        
        // Info area
        const infoY = -height/2 + imageHeight;
        
        // Type badge
        ctx.fillStyle = obj.colors.primary;
        ctx.fillRect(-width/2 + 8/zoom, infoY + 8/zoom, 60/zoom, 20/zoom);
        
        ctx.fillStyle = 'white';
        ctx.font = `${10/zoom}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.container || '', -width/2 + 12/zoom, infoY + 18/zoom);
        
        // ID
        ctx.fillStyle = '#a1a1aa';
        ctx.font = `${11/zoom}px sans-serif`;
        ctx.fillText(obj.identifier || '', -width/2 + 8/zoom, infoY + 38/zoom);
        
        // Title
        ctx.fillStyle = 'white';
        ctx.font = `${13/zoom}px sans-serif`;
        const title = (obj.title || 'Untitled').substring(0, 20);
        ctx.fillText(title, -width/2 + 8/zoom, infoY + 58/zoom);
        
        // Selection indicator
        if (obj.selected) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3 / zoom;
            ctx.strokeRect(-width/2 - 3/zoom, -height/2 - 3/zoom, width + 6/zoom, height + 6/zoom);
        }
    }

    renderFullCard(ctx, obj, zoom) {
        const width = 300 / zoom;
        const height = 400 / zoom;
        
        // Background with higher opacity
        ctx.fillStyle = 'rgba(42, 42, 42, 0.95)';
        ctx.fillRect(-width/2, -height/2, width, height);
        
        // Border
        ctx.strokeStyle = obj.colors.border;
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(-width/2, -height/2, width, height);
        
        // Image area
        const imageHeight = height * 0.5;
        if (obj.image_downloaded) {
            ctx.fillStyle = '#404040';
            ctx.fillRect(-width/2 + 8/zoom, -height/2 + 8/zoom, width - 16/zoom, imageHeight - 16/zoom);
            
            // Image icon
            ctx.fillStyle = '#666';
            ctx.font = `${32/zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('📷', 0, -height/2 + imageHeight/2);
        }
        
        // Info area
        const infoY = -height/2 + imageHeight;
        let currentY = infoY + 16/zoom;
        
        // Type and ID
        ctx.fillStyle = obj.colors.primary;
        ctx.font = `${12/zoom}px sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`${(obj.container || '').toUpperCase()} • ${obj.identifier || ''}`, -width/2 + 12/zoom, currentY);
        currentY += 20/zoom;
        
        // Title
        ctx.fillStyle = 'white';
        ctx.font = `bold ${14/zoom}px sans-serif`;
        const title = obj.title || 'Untitled Object';
        ctx.fillText(title.substring(0, 25), -width/2 + 12/zoom, currentY);
        currentY += 24/zoom;
        
        // Description (truncated)
        ctx.fillStyle = '#a1a1aa';
        ctx.font = `${11/zoom}px sans-serif`;
        const description = (obj.description || 'No description available').substring(0, 80) + '...';
        ctx.fillText(description, -width/2 + 12/zoom, currentY);
        currentY += 20/zoom;
        
        // Completeness bar
        const barWidth = width - 24/zoom;
        ctx.fillStyle = '#404040';
        ctx.fillRect(-width/2 + 12/zoom, currentY, barWidth, 6/zoom);
        ctx.fillStyle = obj.colors.primary;
        ctx.fillRect(-width/2 + 12/zoom, currentY, barWidth * obj.completeness, 6/zoom);
        
        // Completeness percentage
        ctx.fillStyle = '#a1a1aa';
        ctx.font = `${10/zoom}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(obj.completeness * 100)}% complete`, width/2 - 12/zoom, currentY + 18/zoom);
        
        // Selection indicator
        if (obj.selected) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3 / zoom;
            ctx.strokeRect(-width/2 - 3/zoom, -height/2 - 3/zoom, width + 6/zoom, height + 6/zoom);
        }
    }

    // Layout strategy switching
    switchStrategy(newStrategy) {
        console.log(`🔄 Switching to ${newStrategy} layout`);
        this.currentStrategy = newStrategy;
        this.processObjectPositions();
        this.explorer.needsRedraw = true;
    }
}

// Simple QuadTree implementation for spatial indexing
class QuadTree {
    constructor(bounds, maxObjects = 10, maxLevels = 5, level = 0) {
        this.bounds = bounds;
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.level = level;
        this.objects = [];
        this.nodes = [];
    }

    split() {
        const subWidth = this.bounds.width / 2;
        const subHeight = this.bounds.height / 2;
        const x = this.bounds.x;
        const y = this.bounds.y;

        this.nodes[0] = new QuadTree({
            x: x + subWidth,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);

        this.nodes[1] = new QuadTree({
            x: x,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);

        this.nodes[2] = new QuadTree({
            x: x,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);

        this.nodes[3] = new QuadTree({
            x: x + subWidth,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);
    }

    getIndex(rect) {
        let index = -1;
        const verticalMidpoint = this.bounds.x + (this.bounds.width / 2);
        const horizontalMidpoint = this.bounds.y + (this.bounds.height / 2);

        const topQuadrant = (rect.y < horizontalMidpoint && rect.y + rect.height < horizontalMidpoint);
        const bottomQuadrant = (rect.y > horizontalMidpoint);

        if (rect.x < verticalMidpoint && rect.x + rect.width < verticalMidpoint) {
            if (topQuadrant) {
                index = 1;
            } else if (bottomQuadrant) {
                index = 2;
            }
        } else if (rect.x > verticalMidpoint) {
            if (topQuadrant) {
                index = 0;
            } else if (bottomQuadrant) {
                index = 3;
            }
        }

        return index;
    }

    insert(rect) {
        if (this.nodes.length > 0) {
            const index = this.getIndex(rect);
            if (index !== -1) {
                this.nodes[index].insert(rect);
                return;
            }
        }

        this.objects.push(rect);

        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (this.nodes.length === 0) {
                this.split();
            }

            let i = 0;
            while (i < this.objects.length) {
                const index = this.getIndex(this.objects[i]);
                if (index !== -1) {
                    this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                } else {
                    i++;
                }
            }
        }
    }

    retrieve(rect) {
        const returnObjects = [...this.objects];

        if (this.nodes.length > 0) {
            const index = this.getIndex(rect);
            if (index !== -1) {
                returnObjects.push(...this.nodes[index].retrieve(rect));
            } else {
                for (let i = 0; i < this.nodes.length; i++) {
                    returnObjects.push(...this.nodes[i].retrieve(rect));
                }
            }
        }

        return returnObjects;
    }
}

// Export for use
window.SpatialManager = SpatialManager;