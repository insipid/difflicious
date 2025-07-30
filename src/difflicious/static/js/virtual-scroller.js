/**
 * Virtual Scrolling Engine for Difflicious
 * Manages viewport-based rendering of diff lines
 */

class VirtualDiffScroller {
    constructor(options = {}) {
        // Configuration
        this.containerSelector = options.container || '#diff-container';
        this.lineHeight = options.lineHeight || 22;
        this.visibleCount = options.visibleCount || 50;
        this.bufferCount = options.bufferCount || 15;
        this.scrollThrottle = options.scrollThrottle || 16; // ~60fps

        // State
        this.allLines = []; // Flattened array of all diff lines
        this.visibleRange = { start: 0, end: 0 };
        this.renderedRange = { start: -1, end: -1 };
        this.domPool = []; // Reusable DOM elements
        this.lineToElement = new Map(); // Track which elements show which lines

        // DOM references
        this.container = null;
        this.viewport = null;
        this.spacer = null;

        // Performance tracking
        this.lastScrollTime = 0;
        this.isScrolling = false;

        this.init();
    }

    init() {
        this.setupContainer();
        this.bindEvents();
        console.log('Virtual Diff Scroller initialized');
    }

    setupContainer() {
        this.container = document.querySelector(this.containerSelector);
        if (!this.container) {
            console.error('Virtual scroll container not found:', this.containerSelector);
            return;
        }

        // Create virtual viewport
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-viewport';
        this.viewport.style.cssText = `
            position: relative;
            overflow: auto;
            height: 100%;
            contain: layout style paint;
        `;

        // Create spacer to maintain scroll height
        this.spacer = document.createElement('div');
        this.spacer.className = 'virtual-spacer';
        this.spacer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            pointer-events: none;
        `;

        // Setup DOM structure
        this.container.innerHTML = '';
        this.viewport.appendChild(this.spacer);
        this.container.appendChild(this.viewport);
    }

    bindEvents() {
        if (!this.viewport) return;

        // Throttled scroll handler for performance
        let scrollTimeout;
        this.viewport.addEventListener('scroll', (e) => {
            if (scrollTimeout) clearTimeout(scrollTimeout);

            this.isScrolling = true;
            this.handleScroll(e);

            scrollTimeout = setTimeout(() => {
                this.isScrolling = false;
                this.optimizeRendering(); // Clean up after scrolling stops
            }, 150);
        });

        // Resize handling
        window.addEventListener('resize', () => {
            this.recalculateViewport();
            this.renderVisibleRange();
        });
    }

    loadDiffData(diffData) {
        console.time('VirtualScroller: Data Processing');

        // Flatten nested diff structure into linear array
        this.allLines = this.flattenDiffData(diffData);

        // Update spacer height to match content
        const totalHeight = this.allLines.length * this.lineHeight;
        this.spacer.style.height = `${totalHeight}px`;

        console.timeEnd('VirtualScroller: Data Processing');
        console.log(`Virtual scroller loaded ${this.allLines.length} lines`);

        // Initial render
        this.recalculateViewport();
        this.renderVisibleRange();
    }

    flattenDiffData(diffData) {
        const lines = [];
        let globalLineIndex = 0;

        // Process each group (untracked, unstaged, staged)
        Object.entries(diffData.groups || {}).forEach(([groupKey, group]) => {
            if (!group.files || group.files.length === 0) return;

            group.files.forEach((file, fileIndex) => {
                // Add file header as a special line
                lines.push({
                    type: 'file-header',
                    globalIndex: globalLineIndex++,
                    groupKey,
                    fileIndex,
                    filePath: file.path,
                    fileData: file,
                    isExpanded: file.expanded || false
                });

                // Only include hunk lines if file is expanded
                if (file.expanded && file.hunks) {
                    file.hunks.forEach((hunk, hunkIndex) => {
                        // Add hunk header if present
                        if (hunk.section_header) {
                            lines.push({
                                type: 'hunk-header',
                                globalIndex: globalLineIndex++,
                                groupKey,
                                fileIndex,
                                hunkIndex,
                                filePath: file.path,
                                sectionHeader: hunk.section_header,
                                hunkData: hunk
                            });
                        }

                        // Add each diff line
                        hunk.lines.forEach((line, lineIndex) => {
                            lines.push({
                                type: 'diff-line',
                                globalIndex: globalLineIndex++,
                                groupKey,
                                fileIndex,
                                hunkIndex,
                                lineIndex,
                                filePath: file.path,
                                lineData: line,
                                needsHighlighting: true
                            });
                        });
                    });
                }
            });
        });

        return lines;
    }

    handleScroll(event) {
        const scrollTop = event.target.scrollTop;
        this.lastScrollTime = performance.now();

        // Calculate new visible range
        const newStart = Math.floor(scrollTop / this.lineHeight);
        const newEnd = Math.min(
            this.allLines.length,
            newStart + this.visibleCount + (this.bufferCount * 2)
        );

        // Only update if range changed significantly
        if (Math.abs(newStart - this.visibleRange.start) > 5 ||
            Math.abs(newEnd - this.visibleRange.end) > 5) {
            this.visibleRange = { start: newStart, end: newEnd };
            this.renderVisibleRange();
        }
    }

    // Method to simulate scroll events for testing
    simulateScroll(scrollTop) {
        this.isScrolling = true;
        this.handleScroll({ target: { scrollTop } });

        // Simulate timeout behavior for testing
        setTimeout(() => {
            this.isScrolling = false;
            this.optimizeRendering();
        }, 150);
    }

    recalculateViewport() {
        if (!this.container) return;

        const containerRect = this.container.getBoundingClientRect();
        const viewportHeight = containerRect.height;

        this.visibleCount = Math.ceil(viewportHeight / this.lineHeight) + this.bufferCount;

        // Recalculate current visible range
        const scrollTop = this.viewport ? this.viewport.scrollTop : 0;
        const start = Math.floor(scrollTop / this.lineHeight);
        const end = Math.min(this.allLines.length, start + this.visibleCount);

        this.visibleRange = { start, end };
    }

    renderVisibleRange() {
        if (!this.allLines.length) return;

        console.time('VirtualScroller: Render');

        const { start, end } = this.visibleRange;

        // Remove elements outside visible range
        this.cleanupInvisibleElements(start, end);

        // Render new visible elements
        for (let i = start; i < end; i++) {
            if (i >= this.allLines.length) break;

            const lineData = this.allLines[i];
            if (!this.lineToElement.has(i)) {
                this.renderLine(lineData, i);
            }
        }

        this.renderedRange = { start, end };
        console.timeEnd('VirtualScroller: Render');
    }

    renderLine(lineData, globalIndex) {
        const element = this.getDOMElement(lineData.type);

        // Configure element based on line type
        switch (lineData.type) {
        case 'file-header':
            this.configureFileHeader(element, lineData);
            break;
        case 'hunk-header':
            this.configureHunkHeader(element, lineData);
            break;
        case 'diff-line':
            this.configureDiffLine(element, lineData);
            break;
        }

        // Position element
        element.style.position = 'absolute';
        element.style.top = `${globalIndex * this.lineHeight}px`;
        element.style.left = '0';
        element.style.right = '0';
        element.style.height = `${this.lineHeight}px`;
        element.dataset.globalIndex = globalIndex;

        // Add to viewport
        this.viewport.appendChild(element);
        this.lineToElement.set(globalIndex, element);

        // Lazy syntax highlighting for diff lines
        if (lineData.type === 'diff-line' && lineData.needsHighlighting) {
            this.scheduleHighlighting(element, lineData);
        }
    }

    getDOMElement(type) {
        // Try to reuse from pool first
        const poolKey = `${type}-pool`;
        if (this.domPool[poolKey] && this.domPool[poolKey].length > 0) {
            return this.domPool[poolKey].pop();
        }

        // Create new element if pool is empty
        return this.createNewElement(type);
    }

    createNewElement(type) {
        let element;

        switch (type) {
        case 'file-header':
            element = document.createElement('div');
            element.className = 'virtual-file-header bg-white border border-gray-200 rounded-lg shadow-sm';
            element.innerHTML = `
                <div class="file-header-content flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <div class="flex items-center space-x-3">
                        <span class="toggle-icon text-gray-400 transition-transform duration-200">▶</span>
                        <span class="file-path font-mono text-sm text-gray-900"></span>
                        <span class="file-status text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded"></span>
                    </div>
                    <div class="file-stats flex items-center space-x-2 text-xs">
                        <span class="additions bg-green-100 text-green-800 px-2 py-1 rounded hidden"></span>
                        <span class="deletions bg-red-100 text-red-800 px-2 py-1 rounded hidden"></span>
                    </div>
                </div>
            `;
            break;

        case 'hunk-header':
            element = document.createElement('div');
            element.className = 'virtual-hunk-header bg-blue-50 text-xs font-mono text-blue-800 border-b border-blue-100';
            element.innerHTML = `
                <div class="hunk-content px-4 py-2">
                    <span class="section-header"></span>
                </div>
            `;
            break;

        case 'diff-line':
            element = document.createElement('div');
            element.className = 'virtual-diff-line grid grid-cols-2 border-b border-gray-50 hover:bg-gray-25 font-mono text-xs';
            element.innerHTML = `
                <div class="line-left border-r border-gray-200">
                    <div class="flex">
                        <div class="line-num w-12 px-2 py-1 text-gray-400 text-right bg-gray-50 border-r border-gray-200 select-none"></div>
                        <div class="line-content flex-1 px-2 py-1 overflow-x-auto">
                            <span class="line-marker"></span>
                            <span class="line-text"></span>
                        </div>
                    </div>
                </div>
                <div class="line-right">
                    <div class="flex">
                        <div class="line-num w-12 px-2 py-1 text-gray-400 text-right bg-gray-50 border-r border-gray-200 select-none"></div>
                        <div class="line-content flex-1 px-2 py-1 overflow-x-auto">
                            <span class="line-marker"></span>
                            <span class="line-text"></span>
                        </div>
                    </div>
                </div>
            `;
            break;
        }

        return element;
    }

    returnElementToPool(element, type) {
        // Clean element for reuse
        element.style.transform = '';
        element.removeAttribute('data-global-index');

        // Return to appropriate pool
        const poolKey = `${type}-pool`;
        if (!this.domPool[poolKey]) this.domPool[poolKey] = [];
        this.domPool[poolKey].push(element);
    }

    cleanupInvisibleElements(visibleStart, visibleEnd) {
        const elementsToRemove = [];

        this.lineToElement.forEach((element, globalIndex) => {
            if (globalIndex < visibleStart || globalIndex >= visibleEnd) {
                elementsToRemove.push(globalIndex);
            }
        });

        elementsToRemove.forEach(globalIndex => {
            const element = this.lineToElement.get(globalIndex);
            if (element && element.parentNode) {
                const lineType = this.allLines[globalIndex]?.type || 'diff-line';

                element.parentNode.removeChild(element);
                this.lineToElement.delete(globalIndex);
                this.returnElementToPool(element, lineType);
            }
        });
    }

    optimizeRendering() {
        // Phase 1: Basic optimization placeholder
        console.log('Optimizing rendering after scroll stop');
    }

    // Utility methods for testing and debugging
    getTotalLines() {
        return this.allLines.length;
    }

    getVisibleRange() {
        return { ...this.visibleRange };
    }

    getRenderedRange() {
        return { ...this.renderedRange };
    }

    getRenderedElementCount() {
        return this.lineToElement.size;
    }

    // Method to check if scroller is properly initialized
    isInitialized() {
        return !!(this.container && this.viewport && this.spacer);
    }

    // --- Placeholder methods for later phases ---

    configureFileHeader(element, lineData) {
        // Placeholder for Phase 2
        const filePathSpan = element.querySelector('.file-path');
        if (filePathSpan) {
            filePathSpan.textContent = lineData.filePath;
        }
    }

    configureHunkHeader(element, lineData) {
        // Placeholder for Phase 2
        const sectionHeaderSpan = element.querySelector('.section-header');
        if (sectionHeaderSpan) {
            sectionHeaderSpan.textContent = lineData.sectionHeader;
        }
    }

    configureDiffLine(element, lineData) {
        // Content is now set by the highlighting function
    }

    scheduleHighlighting(element, lineData) {
        // Use requestIdleCallback for non-blocking highlighting
        if (window.requestIdleCallback) {
            requestIdleCallback(() => this.highlightLine(element, lineData), { timeout: 100 });
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => this.highlightLine(element, lineData), 0);
        }
    }

    highlightLine(element, lineData) {
        if (!lineData.lineData || !element.isConnected) return;

        const line = lineData.lineData;
        const filePath = lineData.filePath;

        // Get DOM elements for left and right sides
        const leftContent = element.querySelector('.line-left .line-text');
        const rightContent = element.querySelector('.line-right .line-text');
        const leftMarker = element.querySelector('.line-left .line-marker');
        const rightMarker = element.querySelector('.line-right .line-marker');
        const leftNum = element.querySelector('.line-left .line-num');
        const rightNum = element.querySelector('.line-right .line-num');

        if (!leftContent || !rightContent) return;

        try {
            // Clear previous state
            leftContent.innerHTML = '';
            rightContent.innerHTML = '';
            leftNum.textContent = '';
            rightNum.textContent = '';
            leftMarker.innerHTML = '&nbsp;';
            rightMarker.innerHTML = '&nbsp;';
            element.querySelector('.line-left').classList.remove('bg-red-50');
            element.querySelector('.line-right').classList.remove('bg-green-50');

            // Configure left side
            if (line.left && line.left.content) {
                leftNum.textContent = line.left.line_num || '';
                leftContent.innerHTML = this.highlightCode(line.left.content, filePath);

                if (line.left.type === 'deletion') {
                    leftMarker.textContent = '-';
                    leftMarker.className = 'line-marker text-red-600';
                    element.querySelector('.line-left').classList.add('bg-red-50');
                } else if (line.type === 'context') {
                    leftMarker.innerHTML = '&nbsp;';
                    leftMarker.className = 'line-marker text-gray-400';
                }
            }

            // Configure right side
            if (line.right && line.right.content) {
                rightNum.textContent = line.right.line_num || '';
                rightContent.innerHTML = this.highlightCode(line.right.content, filePath);

                if (line.right.type === 'addition') {
                    rightMarker.textContent = '+';
                    rightMarker.className = 'line-marker text-green-600';
                    element.querySelector('.line-right').classList.add('bg-green-50');
                } else if (line.type === 'context') {
                    rightMarker.innerHTML = '&nbsp;';
                    rightMarker.className = 'line-marker text-gray-400';
                }
            }

            // Mark as highlighted
            lineData.needsHighlighting = false;
        } catch (error) {
            console.warn('Syntax highlighting failed for line:', error);
            // Fallback to plain text
            if (line.left?.content) leftContent.textContent = line.left.content;
            if (line.right?.content) rightContent.textContent = line.right.content;
        }
    }

    highlightCode(content, filePath) {
        if (!content || !window.hljs) return content;

        try {
            const language = this.detectLanguage(filePath);
            if (language === 'plaintext') {
                const result = window.hljs.highlightAuto(content);
                return result.value;
            } else {
                const result = window.hljs.highlight(content, { language });
                return result.value;
            }
        } catch (error) {
            return content;
        }
    }

    detectLanguage(filePath) {
        // Reuse existing language detection logic
        const ext = filePath.split('.').pop()?.toLowerCase();
        const languageMap = {
            js: 'javascript',
            jsx: 'javascript',
            ts: 'typescript',
            tsx: 'typescript',
            py: 'python',
            html: 'html',
            css: 'css',
            json: 'json',
            md: 'markdown',
            sh: 'bash',
            bash: 'bash',
            rb: 'ruby',
            go: 'go',
            rs: 'rust'
        };
        return languageMap[ext] || 'plaintext';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualDiffScroller;
} else {
    window.VirtualDiffScroller = VirtualDiffScroller;
}
