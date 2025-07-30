/**
 * Performance monitoring for virtual scrolling
 */

class DiffPerformanceMonitor {
    constructor() {
        this.metrics = {
            renderTimes: [],
            scrollTimes: [],
            memoryUsage: [],
            domNodeCount: [],
            highlightingTimes: []
        };

        this.observers = {
            memory: null,
            performance: null
        };

        this.init();
    }

    init() {
        // Setup performance observer if available
        if (window.PerformanceObserver) {
            this.observers.performance = new window.PerformanceObserver((list) => {
                this.handlePerformanceEntries(list.getEntries());
            });

            this.observers.performance.observe({ entryTypes: ['measure', 'navigation'] });
        }

        // Monitor memory usage periodically
        if (window.performance && window.performance.memory) {
            setInterval(() => this.recordMemoryUsage(), 5000);
        }

        // DOM node count monitoring
        setInterval(() => this.recordDOMNodeCount(), 10000);
    }

    handlePerformanceEntries(entries) {
        entries.forEach(entry => {
            if (entry.entryType === 'measure') {
                const category = this.getMetricCategory(entry.name);
                this.recordMetric(category, entry.duration);
            }
        });
    }

    startMeasure(name) {
        if (window.performance) {
            window.performance.mark(`${name}-start`);
        }
    }

    endMeasure(name) {
        if (window.performance) {
            window.performance.mark(`${name}-end`);
            window.performance.measure(name, `${name}-start`, `${name}-end`);
        }
    }

    getMetricCategory(measureName) {
        if (measureName.includes('render')) return 'renderTimes';
        if (measureName.includes('scroll')) return 'scrollTimes';
        if (measureName.includes('highlight')) return 'highlightingTimes';
        return 'renderTimes';
    }

    recordMetric(category, value) {
        if (!this.metrics[category]) this.metrics[category] = [];

        this.metrics[category].push({
            value,
            timestamp: Date.now()
        });

        // Keep only last 100 measurements
        if (this.metrics[category].length > 100) {
            this.metrics[category].shift();
        }
    }

    recordMemoryUsage() {
        if (window.performance && window.performance.memory) {
            const usage = {
                used: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(window.performance.memory.jsHeapSizeLimit / 1024 / 1024),
                timestamp: Date.now()
            };

            this.recordMetric('memoryUsage', usage);
        }
    }

    recordDOMNodeCount() {
        const nodeCount = document.querySelectorAll('*').length;
        this.recordMetric('domNodeCount', nodeCount);
    }

    getAverageMetric(category) {
        if (!this.metrics[category] || this.metrics[category].length === 0) return 0;

        const values = this.metrics[category].map(m => typeof m.value === 'number' ? m.value : m.value.used || 0);
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    generateReport() {
        return {
            averageRenderTime: `${this.getAverageMetric('renderTimes').toFixed(2)}ms`,
            averageScrollTime: `${this.getAverageMetric('scrollTimes').toFixed(2)}ms`,
            averageMemoryUsage: `${this.getAverageMetric('memoryUsage').toFixed(1)}MB`,
            averageDOMNodes: Math.round(this.getAverageMetric('domNodeCount')),
            averageHighlightTime: `${this.getAverageMetric('highlightingTimes').toFixed(2)}ms`,
            totalMeasurements: Object.values(this.metrics).reduce((sum, arr) => sum + arr.length, 0)
        };
    }

    logReport() {
        console.table(this.generateReport());
    }

    // Integration with virtual scroller
    integrateWithVirtualScroller(scroller) {
        // Wrap critical methods with performance monitoring
        const originalHandleScroll = scroller.handleScroll.bind(scroller);
        scroller.handleScroll = (event) => {
            this.startMeasure('virtual-scroll');
            originalHandleScroll(event);
            this.endMeasure('virtual-scroll');
        };

        const originalRenderVisibleRange = scroller.renderVisibleRange.bind(scroller);
        scroller.renderVisibleRange = () => {
            this.startMeasure('virtual-render');
            originalRenderVisibleRange();
            this.endMeasure('virtual-render');
        };

        const originalHighlightLine = scroller.highlightLine.bind(scroller);
        scroller.highlightLine = (element, lineData) => {
            this.startMeasure('virtual-highlight');
            originalHighlightLine(element, lineData);
            this.endMeasure('virtual-highlight');
        };
    }
}

// Global performance monitor instance
window.diffPerformanceMonitor = new DiffPerformanceMonitor();
