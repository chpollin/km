/**
 * Collection Explorer - Category Management System
 * Hans Gross Kriminalmuseum Archive
 * 
 * Responsible for:
 * - Extracting categories from object metadata
 * - Grouping objects by different dimensions
 * - Providing category statistics and information
 */

class CategoryManager {
    constructor(explorer) {
        this.explorer = explorer;
        this.categories = {
            temporal: {},
            type: {},
            geographic: {},
            crime: {}
        };
        this.availableGroupings = [];
    }

    /**
     * Initialize category system by analyzing all objects
     */
    initialize() {
        console.log('📊 Initializing category system...');
        
        this.extractAllCategories();
        this.calculateAvailableGroupings();
        
        console.log('✅ Categories initialized:', this.categories);
        console.log('🎯 Available groupings:', this.availableGroupings);
    }

    /**
     * Extract all category types from the collection
     */
    extractAllCategories() {
        this.extractObjectTypes();
        this.extractObjectClasses(); // New: hierarchical classification
        this.extractTemporalCategories();
        this.extractBasicCrimeTypes();
        this.extractGeographicRegions();
    }

    /**
     * Extract object types (already available but formalize)
     */
    extractObjectTypes() {
        const types = {};

        this.explorer.objects.forEach(obj => {
            const type = obj.container || 'unknown';
            if (!types[type]) {
                types[type] = {
                    count: 0,
                    objects: [],
                    displayName: this.getTypeDisplayName(type)
                };
            }
            types[type].count++;
            types[type].objects.push(obj);
        });

        this.categories.type = types;
        console.log('📂 Object types extracted:', Object.keys(types));
    }

    /**
     * Extract hierarchical object classes from enhanced metadata
     * Categories like Waffe.Feuerwaffe.Pistole, Dokument.Karteikarte, etc.
     */
    extractObjectClasses() {
        const classes = {};
        const primaryClasses = {};
        const secondaryClasses = {};

        this.explorer.objects.forEach(obj => {
            const fullClass = obj.objectClass || 'Beweisstück.Sonstiges';
            const parts = fullClass.split('.');

            // Primary classification (e.g., Waffe, Dokument, Beweisstück)
            const primary = parts[0];
            if (!primaryClasses[primary]) {
                primaryClasses[primary] = {
                    count: 0,
                    objects: [],
                    displayName: primary,
                    subcategories: {}
                };
            }
            primaryClasses[primary].count++;
            primaryClasses[primary].objects.push(obj);

            // Secondary classification if exists (e.g., Feuerwaffe, Karteikarte)
            if (parts[1]) {
                const secondary = parts[1];
                const secondaryKey = `${primary}.${secondary}`;

                if (!secondaryClasses[secondaryKey]) {
                    secondaryClasses[secondaryKey] = {
                        count: 0,
                        objects: [],
                        displayName: secondary,
                        parent: primary
                    };
                }
                secondaryClasses[secondaryKey].count++;
                secondaryClasses[secondaryKey].objects.push(obj);

                // Add to parent's subcategories
                primaryClasses[primary].subcategories[secondary] = secondaryClasses[secondaryKey];
            }

            // Full classification for detailed grouping
            if (!classes[fullClass]) {
                classes[fullClass] = {
                    count: 0,
                    objects: [],
                    displayName: this.getClassDisplayName(fullClass),
                    hierarchy: parts
                };
            }
            classes[fullClass].count++;
            classes[fullClass].objects.push(obj);
        });

        this.categories.objectClass = classes;
        this.categories.primaryClass = primaryClasses;
        this.categories.secondaryClass = secondaryClasses;

        console.log('🎯 Object classes extracted:');
        console.log('  Primary:', Object.keys(primaryClasses));
        console.log('  Full classes:', Object.keys(classes).length, 'unique classifications');
    }

    /**
     * Get display name for object class
     */
    getClassDisplayName(classPath) {
        const parts = classPath.split('.');
        return parts[parts.length - 1]; // Return the most specific part
    }

    /**
     * Extract temporal categories from historical dates (1850-1950)
     * Uses enhanced metadata with extracted historical years
     */
    extractTemporalCategories() {
        const decades = {};
        let exactDateCount = 0;
        let estimatedDateCount = 0;
        let unknownDateCount = 0;

        this.explorer.objects.forEach(obj => {
            // Use historical year from enhanced metadata
            const year = obj.year || obj.historicalYear;
            const isEstimated = obj.dateEstimated === true;

            if (year && year >= 1850 && year <= 1950) {
                const decade = this.yearToDecade(year);

                if (!decades[decade]) {
                    decades[decade] = {
                        count: 0,
                        objects: [],
                        displayName: decade,
                        range: this.getDecadeRange(decade),
                        exactCount: 0,
                        estimatedCount: 0
                    };
                }

                decades[decade].count++;
                decades[decade].objects.push(obj);

                if (isEstimated) {
                    decades[decade].estimatedCount++;
                    estimatedDateCount++;
                } else {
                    decades[decade].exactCount++;
                    exactDateCount++;
                }
            } else {
                unknownDateCount++;
            }
        });

        this.categories.temporal = decades;

        console.log('📅 Temporal categories extracted (1850-1950):', Object.keys(decades).sort());
        console.log(`  📊 Date statistics: ${exactDateCount} exact, ${estimatedDateCount} estimated, ${unknownDateCount} unknown`);
    }

    /**
     * Extract decade from object metadata (legacy - kept for compatibility)
     * New implementation uses historical years from enhanced metadata directly
     */
    extractDecade(obj) {
        // Use historical year from enhanced metadata first
        const year = obj.year || obj.historicalYear;

        if (year && year >= 1850 && year <= 1950) {
            return this.yearToDecade(year);
        }

        return null;
    }

    /**
     * Parse year from various date formats
     */
    parseYear(dateStr) {
        if (typeof dateStr === 'number') {
            return dateStr >= 1800 && dateStr <= 2000 ? dateStr : null;
        }
        
        if (typeof dateStr !== 'string') return null;
        
        // Try various date patterns
        const patterns = [
            /(\d{4})/,                    // Simple 4-digit year
            /(\d{4})-\d{2}-\d{2}/,       // YYYY-MM-DD
            /\b(\d{4})\b/,               // Year in text
            /(\d{2})\.(\d{2})\.(\d{4})/  // DD.MM.YYYY
        ];
        
        for (const pattern of patterns) {
            const match = dateStr.match(pattern);
            if (match) {
                const year = parseInt(match[1]);
                if (year >= 1800 && year <= 2000) {
                    return year;
                }
            }
        }
        
        return null;
    }

    /**
     * Extract year from descriptive text
     */
    extractYearFromText(text) {
        const yearMatch = text.match(/\b(18|19)\d{2}\b/);
        return yearMatch ? parseInt(yearMatch[0]) : null;
    }

    /**
     * Convert year to decade string
     */
    yearToDecade(year) {
        const decade = Math.floor(year / 10) * 10;
        return `${decade}s`;
    }

    /**
     * Get decade range for display
     */
    getDecadeRange(decade) {
        const start = parseInt(decade);
        return `${start}-${start + 9}`;
    }

    /**
     * Extract basic crime types from index card descriptions
     */
    extractBasicCrimeTypes() {
        const crimeTypes = {};
        
        // Only process Karteikarten (index cards)
        const indexCards = this.explorer.objects.filter(obj => obj.container === 'karteikarten');
        
        indexCards.forEach(obj => {
            const crimes = this.extractCrimeFromText(obj.description || obj.title || '');
            crimes.forEach(crime => {
                if (!crimeTypes[crime]) {
                    crimeTypes[crime] = {
                        count: 0,
                        objects: [],
                        displayName: this.getCrimeDisplayName(crime)
                    };
                }
                crimeTypes[crime].count++;
                crimeTypes[crime].objects.push(obj);
            });
        });
        
        // Only keep crime types with at least 5 cases for meaningful grouping
        const filteredCrimes = {};
        Object.keys(crimeTypes).forEach(crime => {
            if (crimeTypes[crime].count >= 5) {
                filteredCrimes[crime] = crimeTypes[crime];
            }
        });
        
        this.categories.crime = filteredCrimes;
        console.log('⚖️ Crime types extracted:', Object.keys(filteredCrimes));
    }

    /**
     * Extract crime types from text using simple keyword matching
     */
    extractCrimeFromText(text) {
        const crimeKeywords = {
            'theft': ['diebstahl', 'theft', 'stealing', 'gestohlen'],
            'fraud': ['betrug', 'fraud', 'schwindel', 'täuschung'],
            'violence': ['gewalt', 'violence', 'körperverletzung', 'schläger'],
            'burglary': ['einbruch', 'burglary', 'breaking'],
            'murder': ['mord', 'murder', 'totschlag', 'killing'],
            'forgery': ['fälschung', 'forgery', 'gefälscht'],
            'other': []
        };
        
        const textLower = text.toLowerCase();
        const foundCrimes = [];
        
        Object.keys(crimeKeywords).forEach(crimeType => {
            const keywords = crimeKeywords[crimeType];
            if (keywords.some(keyword => textLower.includes(keyword))) {
                foundCrimes.push(crimeType);
            }
        });
        
        // Default to 'other' if no specific crime found
        return foundCrimes.length > 0 ? foundCrimes : ['other'];
    }

    /**
     * Extract geographic regions from court information
     */
    extractGeographicRegions() {
        const regions = {};
        
        this.explorer.objects.forEach(obj => {
            const region = this.extractRegion(obj);
            if (region) {
                if (!regions[region]) {
                    regions[region] = {
                        count: 0,
                        objects: [],
                        displayName: this.getRegionDisplayName(region)
                    };
                }
                regions[region].count++;
                regions[region].objects.push(obj);
            }
        });
        
        this.categories.geographic = regions;
        console.log('🗺️ Geographic regions extracted:', Object.keys(regions));
    }

    /**
     * Extract region from object metadata
     */
    extractRegion(obj) {
        // Look for Austrian cities/regions in description or metadata
        const austrianCities = {
            'wien': 'Vienna',  
            'vienna': 'Vienna',
            'graz': 'Graz',
            'salzburg': 'Salzburg',
            'innsbruck': 'Innsbruck',
            'linz': 'Linz',
            'klagenfurt': 'Klagenfurt'
        };
        
        const text = (obj.description || obj.title || '').toLowerCase();
        
        for (const [city, region] of Object.entries(austrianCities)) {
            if (text.includes(city)) {
                return region.toLowerCase();
            }
        }
        
        // Default to 'austria' for objects without specific location
        return 'austria';
    }

    /**
     * Group objects by specified dimensions
     */
    groupObjects(primaryDimension, secondaryDimension = null) {
        console.log(`🔄 Grouping objects by ${primaryDimension}${secondaryDimension ? ' × ' + secondaryDimension : ''}`);
        
        if (!secondaryDimension) {
            return this.categories[primaryDimension] || {};
        }
        
        // Hierarchical grouping: Primary → Secondary
        const hierarchicalGroups = {};
        
        const primaryCategories = this.categories[primaryDimension] || {};
        const secondaryCategories = this.categories[secondaryDimension] || {};
        
        Object.keys(primaryCategories).forEach(primaryKey => {
            hierarchicalGroups[primaryKey] = {};
            
            const primaryObjects = primaryCategories[primaryKey].objects;
            
            Object.keys(secondaryCategories).forEach(secondaryKey => {
                const secondaryObjects = secondaryCategories[secondaryKey].objects;
                
                // Find intersection of objects
                const intersection = primaryObjects.filter(obj => 
                    secondaryObjects.includes(obj)
                );
                
                if (intersection.length > 0) {
                    hierarchicalGroups[primaryKey][secondaryKey] = {
                        count: intersection.length,
                        objects: intersection,
                        displayName: `${primaryCategories[primaryKey].displayName} - ${secondaryCategories[secondaryKey].displayName}`
                    };
                }
            });
        });
        
        return hierarchicalGroups;
    }

    /**
     * Get available grouping dimensions based on data
     */
    calculateAvailableGroupings() {
        this.availableGroupings = [];
        
        if (Object.keys(this.categories.type).length > 1) {
            this.availableGroupings.push({
                key: 'type',
                displayName: 'Object Type',
                description: 'Group by Karteikarten vs Objekte'
            });
        }
        
        if (Object.keys(this.categories.temporal).length > 1) {
            this.availableGroupings.push({
                key: 'temporal',
                displayName: 'Time Period',
                description: 'Group by decades (1890s, 1900s, etc.)'
            });
        }
        
        if (Object.keys(this.categories.crime).length > 1) {
            this.availableGroupings.push({
                key: 'crime',
                displayName: 'Crime Type',
                description: 'Group by type of criminal case'
            });
        }
        
        if (Object.keys(this.categories.geographic).length > 1) {
            this.availableGroupings.push({
                key: 'geographic',
                displayName: 'Geographic Region',
                description: 'Group by Austrian regions'
            });
        }
    }

    /**
     * Get statistics for a specific grouping
     */
    getGroupingStats(dimension) {
        const categories = this.categories[dimension] || {};
        const stats = {
            totalCategories: Object.keys(categories).length,
            totalObjects: 0,
            categoryStats: {}
        };
        
        Object.keys(categories).forEach(key => {
            const category = categories[key];
            stats.totalObjects += category.count;
            stats.categoryStats[key] = {
                count: category.count,
                percentage: 0 // Will be calculated below
            };
        });
        
        // Calculate percentages
        Object.keys(stats.categoryStats).forEach(key => {
            stats.categoryStats[key].percentage = 
                Math.round((stats.categoryStats[key].count / stats.totalObjects) * 100);
        });
        
        return stats;
    }

    // Display name helpers
    getTypeDisplayName(type) {
        const displayNames = {
            'karteikarten': 'Index Cards',
            'objekte': 'Museum Objects',
            'unknown': 'Unknown Type'
        };
        return displayNames[type] || type;
    }

    getCrimeDisplayName(crime) {
        const displayNames = {
            'theft': 'Theft',
            'fraud': 'Fraud',
            'violence': 'Violence',
            'burglary': 'Burglary',
            'murder': 'Murder',
            'forgery': 'Forgery',
            'other': 'Other Crimes'
        };
        return displayNames[crime] || crime;
    }

    getRegionDisplayName(region) {
        const displayNames = {
            'vienna': 'Vienna',
            'graz': 'Graz',
            'salzburg': 'Salzburg',
            'innsbruck': 'Innsbruck',
            'linz': 'Linz',
            'klagenfurt': 'Klagenfurt',
            'austria': 'Austria (General)'
        };
        return displayNames[region] || region;
    }

    /**
     * Debug method to log category information
     */
    debugCategories() {
        console.log('📊 Category Debug Information:');
        
        Object.keys(this.categories).forEach(dimension => {
            console.log(`\n${dimension.toUpperCase()} Categories:`);
            const categories = this.categories[dimension];
            
            Object.keys(categories).forEach(key => {
                const category = categories[key];
                console.log(`  ${key}: ${category.count} objects (${category.displayName})`);
            });
        });
    }
}

// Export for use
window.CategoryManager = CategoryManager;