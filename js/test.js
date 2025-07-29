/**
 * Hans Gross Kriminalmuseum Archive - Complete Test Suite
 * Comprehensive testing with concise, information-dense output
 */

class ArchiveTestSuite {
    constructor() {
        this.results = { passed: 0, failed: 0, tests: [] };
        this.app = null;
        this.data = null;
    }

    async init() {
        console.log('🧪 Archive Test Suite v2.0');
        
        try {
            await this.waitForApp();
            await this.loadTestData();
            await this.runAllTests();
            this.generateReport();
        } catch (error) {
            console.error('💥 Test suite failed:', error.message);
        }
    }

    async waitForApp() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.archiveApp?.objects?.length > 0) {
                    this.app = window.archiveApp;
                    resolve();
                } else {
                    setTimeout(check, 500);
                }
            };
            check();
        });
    }

    async loadTestData() {
        const response = await fetch('km_archive/metadata/all_objects.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.data = await response.json();
    }

    async runAllTests() {
        await this.testDataIntegrity();
        await this.testFilterFunctionality();
        await this.testSearchFunctionality();
        await this.testUIComponents();
        await this.testPerformance();
        await this.testModalSystem();
        await this.testViewToggle();
    }

    // Data Integrity Tests
    async testDataIntegrity() {
        const tests = [
            ['Data Structure', () => Array.isArray(this.data) && this.data.length === 3892, `${this.data.length}/3892 objects`],
            ['Required Fields', () => this.data.every(obj => obj.pid && obj.identifier && obj.container), this.validateFields()],
            ['Container Values', () => this.data.every(obj => ['karteikarten', 'objekte'].includes(obj.container)), this.getContainerStats()],
            ['Karteikarten Count', () => this.data.filter(obj => obj.container === 'karteikarten').length === 1657, `${this.data.filter(obj => obj.container === 'karteikarten').length}/1657`],
            ['Objekte Count', () => this.data.filter(obj => obj.container === 'objekte').length === 2235, `${this.data.filter(obj => obj.container === 'objekte').length}/2235`],
            ['Image Availability', () => this.data.filter(obj => obj.image_downloaded).length, `${this.data.filter(obj => obj.image_downloaded).length} with images`],
            ['Source Data', () => this.data.filter(obj => obj.tei_downloaded || obj.lido_downloaded).length, `${this.data.filter(obj => obj.tei_downloaded || obj.lido_downloaded).length} with sources`]
        ];

        this.runTests('DATA', tests);
    }

    // Filter System Tests
    async testFilterFunctionality() {
        const initial = { ...this.app.filters };
        const tests = [];

        // Test initial state
        tests.push(['Initial State', () => this.app.filteredObjects.length === this.app.objects.length, `${this.app.filteredObjects.length}/${this.app.objects.length}`]);

        // Test Karteikarten only
        this.app.updateObjectTypeFilter('objekte', false);
        await this.wait(50);
        tests.push(['Karteikarten Only', () => this.app.filteredObjects.every(obj => obj.container === 'karteikarten') && this.app.filteredObjects.length === 1657, `${this.app.filteredObjects.length}/1657, all=${this.app.filteredObjects.every(obj => obj.container === 'karteikarten')}`]);

        // Test Objekte only
        this.app.updateObjectTypeFilter('karteikarten', false);
        this.app.updateObjectTypeFilter('objekte', true);
        await this.wait(50);
        tests.push(['Objekte Only', () => this.app.filteredObjects.every(obj => obj.container === 'objekte') && this.app.filteredObjects.length === 2235, `${this.app.filteredObjects.length}/2235, all=${this.app.filteredObjects.every(obj => obj.container === 'objekte')}`]);

        // Test both disabled
        this.app.updateObjectTypeFilter('objekte', false);
        await this.wait(50);
        tests.push(['Both Disabled', () => this.app.filteredObjects.length === 0, `${this.app.filteredObjects.length} objects`]);

        // Test availability filters
        this.app.filters = { ...initial };
        this.app.filters.availability.hasImage = true;
        this.app.applyFilters();
        await this.wait(50);
        const withImages = this.app.filteredObjects.length;
        tests.push(['Image Filter', () => this.app.filteredObjects.every(obj => obj.image_downloaded), `${withImages} with images, valid=${this.app.filteredObjects.every(obj => obj.image_downloaded)}`]);

        // Restore state
        this.app.filters = initial;
        this.app.applyFilters();

        this.runTests('FILTER', tests);
    }

    // Search System Tests
    async testSearchFunctionality() {
        const tests = [];

        // Test basic search
        this.app.handleSearch('km');
        await this.wait(50);
        const kmResults = this.app.filteredObjects.length;
        tests.push(['Basic Search', () => kmResults > 0, `"km" → ${kmResults} results`]);

        // Test empty search
        this.app.handleSearch('');
        await this.wait(50);
        tests.push(['Empty Search', () => this.app.filteredObjects.length === this.app.objects.length, `→ ${this.app.filteredObjects.length} results`]);

        // Test fuzzy search
        if (this.app.fuse) {
            this.app.handleSearch('kartei');
            await this.wait(50);
            const fuzzyResults = this.app.filteredObjects.length;
            tests.push(['Fuzzy Search', () => fuzzyResults > 0, `"kartei" → ${fuzzyResults} results`]);
        } else {
            tests.push(['Fuzzy Search', () => false, 'Fuse.js not loaded']);
        }

        // Test combined search + filter
        this.app.handleSearch('km');
        this.app.updateObjectTypeFilter('objekte', false);
        await this.wait(50);
        const combinedResults = this.app.filteredObjects.length;
        tests.push(['Search + Filter', () => combinedResults < kmResults && this.app.filteredObjects.every(obj => obj.container === 'karteikarten'), `${combinedResults} results, all karteikarten`]);

        // Reset
        this.app.handleSearch('');
        this.app.updateObjectTypeFilter('objekte', true);

        this.runTests('SEARCH', tests);
    }

    // UI Component Tests
    async testUIComponents() {
        const tests = [
            ['Search Input', () => !!document.getElementById('main-search'), document.getElementById('main-search')?.tagName],
            ['Filter Checkboxes', () => document.querySelectorAll('[data-filter]').length >= 5, `${document.querySelectorAll('[data-filter]').length} checkboxes`],
            ['Results Grid', () => !!document.getElementById('object-grid'), document.getElementById('object-grid')?.children.length + ' cards'],
            ['Statistics', () => ['total-count', 'cards-count', 'objects-count'].every(id => document.getElementById(id)), 'all present'],
            ['View Toggles', () => document.querySelectorAll('.view-toggle').length === 2, `${document.querySelectorAll('.view-toggle').length}/2 buttons`],
            ['Pagination', () => !!document.getElementById('pagination'), document.getElementById('pagination')?.style.display],
            ['Modal', () => !!document.getElementById('object-modal'), 'present'],
            ['Toast Container', () => !!document.getElementById('toast-container'), 'present']
        ];

        this.runTests('UI', tests);
    }

    // Performance Tests
    async testPerformance() {
        const tests = [];

        // Filter performance
        const filterStart = performance.now();
        this.app.applyFilters();
        const filterTime = performance.now() - filterStart;
        tests.push(['Filter Speed', () => filterTime < 100, `${filterTime.toFixed(1)}ms`]);

        // Search performance
        const searchStart = performance.now();
        this.app.handleSearch('test');
        const searchTime = performance.now() - searchStart;
        tests.push(['Search Speed', () => searchTime < 300, `${searchTime.toFixed(1)}ms`]);

        // Render performance
        const renderStart = performance.now();
        this.app.renderResults();
        const renderTime = performance.now() - renderStart;
        tests.push(['Render Speed', () => renderTime < 200, `${renderTime.toFixed(1)}ms`]);

        // Memory usage (basic check)
        const memInfo = performance.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1048576),
            total: Math.round(performance.memory.totalJSHeapSize / 1048576)
        } : null;
        tests.push(['Memory Usage', () => !memInfo || memInfo.used < 50, memInfo ? `${memInfo.used}/${memInfo.total}MB` : 'unavailable']);

        this.app.handleSearch('');
        this.runTests('PERF', tests);
    }

    // Modal System Tests
    async testModalSystem() {
        const tests = [];
        const testObj = this.app.objects[0];

        // Test modal opening
        this.app.showObjectModal(testObj.identifier);
        await this.wait(100);
        const modal = document.getElementById('object-modal');
        const isVisible = modal.style.display === 'flex';
        tests.push(['Modal Open', () => isVisible, isVisible ? 'visible' : 'hidden']);

        // Test modal content
        const title = document.getElementById('modal-object-title')?.textContent;
        const identifier = document.getElementById('modal-identifier')?.textContent;
        tests.push(['Modal Content', () => title && identifier, `title=${!!title}, id=${!!identifier}`]);

        // Test navigation
        const prevBtn = document.getElementById('prev-object');
        const nextBtn = document.getElementById('next-object');
        tests.push(['Modal Navigation', () => prevBtn && nextBtn, `prev=${prevBtn?.disabled}, next=${nextBtn?.disabled}`]);

        // Close modal
        this.app.closeObjectModal();
        await this.wait(100);

        this.runTests('MODAL', tests);
    }

    // View Toggle Tests
    async testViewToggle() {
        const tests = [];
        const grid = document.getElementById('object-grid');
        const toggles = document.querySelectorAll('.view-toggle');

        if (typeof initializeViewToggle === 'function') {
            // Test grid view (default)
            tests.push(['Grid View', () => !grid.classList.contains('list-view'), `classes: ${grid.className}`]);

            // Test list view toggle
            const listToggle = document.querySelector('[data-view="list"]');
            if (listToggle) {
                listToggle.click();
                await this.wait(200);
                tests.push(['List View', () => grid.classList.contains('list-view'), `classes: ${grid.className}`]);

                // Switch back
                document.querySelector('[data-view="grid"]')?.click();
                await this.wait(200);
            }
        } else {
            tests.push(['View Toggle', () => false, 'function not found']);
        }

        this.runTests('VIEW', tests);
    }

    // Helper Methods
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    validateFields() {
        const missing = this.data.filter(obj => !obj.pid || !obj.identifier || !obj.container).length;
        return `${this.data.length - missing}/${this.data.length} valid`;
    }

    getContainerStats() {
        const containers = [...new Set(this.data.map(obj => obj.container))];
        return containers.join(', ');
    }

    runTests(category, tests) {
        let passed = 0, failed = 0;
        const results = [];

        tests.forEach(([name, test, info]) => {
            try {
                const result = test();
                const success = !!result;
                
                if (success) {
                    passed++;
                    results.push(`✅ ${name} ${info ? `(${info})` : ''}`);
                } else {
                    failed++;
                    results.push(`❌ ${name} ${info ? `(${info})` : ''}`);
                }

                this.results.tests.push({ category, name, passed: success, info });
            } catch (error) {
                failed++;
                results.push(`💥 ${name} (${error.message})`);
                this.results.tests.push({ category, name, passed: false, error: error.message });
            }
        });

        console.log(`${category}: ${passed}✅ ${failed}❌ | ${results.join(' | ')}`);
        this.results.passed += passed;
        this.results.failed += failed;
    }

    generateReport() {
        const total = this.results.passed + this.results.failed;
        const rate = ((this.results.passed / total) * 100).toFixed(1);
        
        console.log(`\n📊 SUMMARY: ${this.results.passed}/${total} passed (${rate}%)`);
        
        if (this.results.failed > 0) {
            const failed = this.results.tests.filter(t => !t.passed);
            console.log(`🚨 FAILED: ${failed.map(t => `${t.category}:${t.name}`).join(', ')}`);
            
            console.log('\n🔧 DEBUG COMMANDS:');
            console.log('• debugArchive.checkState() - Current app state');
            console.log('• debugArchive.testFilter("karteikarten", false) - Test filter');
            console.log('• debugArchive.analyzeData() - Data structure analysis');
        }

        // Setup debug tools
        this.setupDebugTools();
        
        window.testResults = this.results;
    }

    setupDebugTools() {
        window.debugArchive = {
            checkState: () => {
                if (!this.app) return console.log('❌ App not available');
                console.log(`📊 STATE: ${this.app.objects.length} total, ${this.app.filteredObjects.length} filtered`);
                console.log(`🎛️ FILTERS:`, this.app.filters);
                console.log(`🔍 SEARCH: "${this.app.searchQuery}"`);
            },
            
            testFilter: (type, enabled) => {
                if (!this.app) return console.log('❌ App not available');
                const before = this.app.filteredObjects.length;
                this.app.updateObjectTypeFilter(type, enabled);
                setTimeout(() => {
                    console.log(`🧪 FILTER TEST: ${type}=${enabled} | ${before}→${this.app.filteredObjects.length}`);
                }, 50);
            },
            
            analyzeData: () => {
                if (!this.app?.objects.length) return console.log('❌ No data');
                const sample = this.app.objects[0];
                const props = Object.keys(sample);
                const containers = [...new Set(this.app.objects.map(obj => obj.container))];
                console.log(`📋 SAMPLE:`, Object.fromEntries(props.slice(0, 5).map(p => [p, sample[p]])));
                console.log(`📊 CONTAINERS:`, containers.map(c => `${c}:${this.app.objects.filter(obj => obj.container === c).length}`).join(', '));
            },
            
            fullDiagnosis: () => {
                console.log('🏥 FULL DIAGNOSIS:');
                this.checkState();
                this.analyzeData();
                console.log(`🔗 DOM ELEMENTS: search=${!!document.getElementById('main-search')}, grid=${!!document.getElementById('object-grid')}, checkboxes=${document.querySelectorAll('[data-filter]').length}`);
            }
        };
    }
}

// Auto-initialize
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        new ArchiveTestSuite().init();
    }, 2000);
});

window.ArchiveTestSuite = ArchiveTestSuite;