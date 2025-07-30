/**
 * Debug utilities for virtual scrolling
 */

class VirtualScrollerDebugger {
    constructor(scroller) {
        this.scroller = scroller;
        this.debugPanel = null;
        this.isVisible = false;

        this.createDebugPanel();
        this.bindKeyboardShortcuts();
    }

    createDebugPanel() {
        this.debugPanel = document.createElement('div');
        this.debugPanel.id = 'virtual-scroller-debug';
        this.debugPanel.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            display: none;
            max-height: 80vh;
            overflow-y: auto;
        `;

        this.debugPanel.innerHTML = `
            <div style="border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 10px;">
                <strong>Virtual Scroller Debug</strong>
                <button onclick="this.parentElement.parentElement.style.display='none'" style="float: right; background: none; border: none; color: white; cursor: pointer;">×</button>
            </div>
            <div id="debug-stats"></div>
            <div id="debug-controls" style="margin-top: 15px; border-top: 1px solid #444; padding-top: 10px;">
                <button onclick="window.virtualScrollerDebugger.forceRerender()" style="background: #333; color: white; border: 1px solid #666; padding: 5px 10px; margin: 2px; cursor: pointer;">Force Rerender</button>
                <button onclick="window.virtualScrollerDebugger.clearDOMPool()" style="background: #333; color: white; border: 1px solid #666; padding: 5px 10px; margin: 2px; cursor: pointer;">Clear DOM Pool</button>
                <button onclick="window.virtualScrollerDebugger.logState()" style="background: #333; color: white; border: 1px solid #666; padding: 5px 10px; margin: 2px; cursor: pointer;">Log State</button>
            </div>
        `;

        document.body.appendChild(this.debugPanel);

        // Update stats every second
        setInterval(() => this.updateStats(), 1000);
    }

    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+V to toggle debug panel
            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.debugPanel.style.display = this.isVisible ? 'block' : 'none';
    }

    updateStats() {
        if (!this.isVisible || !this.scroller) return;

        const stats = this.gatherStats();
        const statsContainer = this.debugPanel.querySelector('#debug-stats');

        statsContainer.innerHTML = `
            <div><strong>Lines:</strong> ${stats.totalLines}</div>
            <div><strong>Visible Range:</strong> ${stats.visibleRange.start} - ${stats.visibleRange.end}</div>
            <div><strong>Rendered Range:</strong> ${stats.renderedRange.start} - ${stats.renderedRange.end}</div>
            <div><strong>DOM Elements:</strong> ${stats.domElementCount}</div>
            <div><strong>Pool Size:</strong> ${stats.poolSize}</div>
            <div><strong>Memory:</strong> ${stats.memoryUsage}</div>
            <div><strong>Last Scroll:</strong> ${stats.lastScrollTime}ms ago</div>
            <div><strong>Is Scrolling:</strong> ${stats.isScrolling}</div>
            <div style="margin-top: 10px;"><strong>Performance:</strong></div>
            <div style="margin-left: 10px;">Avg Render: ${stats.avgRenderTime}ms</div>
            <div style="margin-left: 10px;">Avg Scroll: ${stats.avgScrollTime}ms</div>
        `;
    }

    gatherStats() {
        const now = window.performance.now();
        const perfReport = window.diffPerformanceMonitor?.generateReport() || {};

        return {
            totalLines: this.scroller.allLines.length,
            visibleRange: this.scroller.visibleRange,
            renderedRange: this.scroller.renderedRange,
            domElementCount: this.scroller.lineToElement.size,
            poolSize: Object.values(this.scroller.domPool).reduce((sum, pool) => sum + (pool ? pool.length : 0), 0),
            memoryUsage: window.performance && window.performance.memory
                ? `${Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024)}MB`
                : 'Unknown',
            lastScrollTime: Math.round(now - this.scroller.lastScrollTime),
            isScrolling: this.scroller.isScrolling,
            avgRenderTime: perfReport.averageRenderTime || '0ms',
            avgScrollTime: perfReport.averageScrollTime || '0ms'
        };
    }

    forceRerender() {
        console.log('Forcing virtual scroller rerender...');
        this.scroller.renderVisibleRange();
    }

    clearDOMPool() {
        console.log('Clearing DOM element pool...');
        Object.keys(this.scroller.domPool).forEach(poolKey => {
            this.scroller.domPool[poolKey] = [];
        });
    }

    logState() {
        console.log('Virtual Scroller State:', {
            scroller: this.scroller,
            stats: this.gatherStats(),
            performance: window.diffPerformanceMonitor?.generateReport()
        });
    }
}

// Initialize debugger when virtual scroller is created
window.createVirtualScrollerDebugger = (scroller) => {
    window.virtualScrollerDebugger = new VirtualScrollerDebugger(scroller);
    return window.virtualScrollerDebugger;
};
