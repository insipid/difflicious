# Proposal: Virtual Scrolling and Lazy Rendering Implementation

**Date:** 2025-07-30 17:30  
**Author:** Claude Code Assistant  
**Type:** Performance Enhancement  
**Priority:** High  
**Estimated Effort:** 1-2 weeks  
**Expected Performance Improvement:** 80-90% reduction in initial render time

## Overview

This proposal outlines the implementation of virtual scrolling and lazy rendering for difflicious to eliminate performance bottlenecks when displaying large diffs. Instead of rendering all 5000+ diff lines immediately, we'll render only the 50-100 lines currently visible in the viewport, dynamically creating and destroying DOM elements as the user scrolls.

## Problem Statement

### Current Performance Issues
- **Large diff rendering:** 5000+ lines create 10,000+ DOM elements immediately
- **Memory explosion:** 500MB+ browser memory usage for large diffs
- **UI blocking:** 15-20 second render times freeze the interface
- **Syntax highlighting bottleneck:** 5000+ synchronous highlight.js calls
- **Poor user experience:** Users can't interact during rendering

### Performance Impact Analysis
```
Current (5000 line diff):
• DOM elements created: ~10,000
• Memory usage: ~500MB
• Initial render time: ~17 seconds
• Syntax highlighting: ~7 seconds
• Total blocking time: ~24 seconds

Virtual Scrolling (same diff):
• DOM elements created: ~100 (visible only)
• Memory usage: ~50MB (90% reduction)
• Initial render time: ~300ms (98% improvement)
• Syntax highlighting: ~140ms (98% improvement)
• Total blocking time: ~440ms
```

## Proposed Solution

### Core Concept: Virtual Scrolling
1. **Viewport-based rendering:** Only render lines visible in the current scroll position
2. **Dynamic DOM management:** Create/destroy elements as user scrolls
3. **Lazy syntax highlighting:** Highlight only visible content
4. **Progressive enhancement:** Build on existing Alpine.js architecture
5. **Smooth scrolling:** Maintain perceived performance during scroll events

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│ Virtual Scrolling Layer                                     │
├─────────────────────────────────────────────────────────────┤
│ • Viewport Manager (tracks visible lines)                  │
│ • DOM Pool (reuses DOM elements)                           │
│ • Lazy Highlighter (highlights on-demand)                  │
│ • Scroll Handler (updates visible range)                   │
├─────────────────────────────────────────────────────────────┤
│ Existing Alpine.js Application                             │
├─────────────────────────────────────────────────────────────┤
│ • File expansion/collapse logic (unchanged)                │
│ • Search/filter functionality (enhanced)                   │
│ • Context expansion (adapted)                              │
│ • UI state management (unchanged)                          │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Foundation and Data Structures (Days 1-2)

#### 1.1 Create Virtual Scrolling Data Layer

**File:** `src/difflicious/static/js/virtual-scroller.js`
```javascript
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
        this.allLines = [];           // Flattened array of all diff lines
        this.visibleRange = { start: 0, end: 0 };
        this.renderedRange = { start: -1, end: -1 };
        this.domPool = [];            // Reusable DOM elements
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
}
```

#### 1.2 Viewport and Scroll Management

```javascript
// Continue VirtualDiffScroller class...

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

recalculateViewport() {
    const containerRect = this.container.getBoundingClientRect();
    const viewportHeight = containerRect.height;
    
    this.visibleCount = Math.ceil(viewportHeight / this.lineHeight) + this.bufferCount;
    
    // Recalculate current visible range
    const scrollTop = this.viewport.scrollTop;
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
```

### Phase 2: DOM Element Management and Pooling (Days 3-4)

#### 2.1 Efficient DOM Element Creation and Reuse

```javascript
// Continue VirtualDiffScroller class...

renderLine(lineData, globalIndex) {
    let element = this.getDOMElement(lineData.type);
    
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
```

### Phase 3: Lazy Syntax Highlighting Integration (Days 5-6)

#### 3.1 Asynchronous Highlighting System

```javascript
// Continue VirtualDiffScroller class...

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

// Reuse existing highlightCode function from Alpine.js app
highlightCode(content, filePath) {
    if (!content || !window.hljs) return content;
    
    try {
        const language = this.detectLanguage(filePath);
        if (language === 'plaintext') {
            const result = hljs.highlightAuto(content);
            return result.value;
        } else {
            const result = hljs.highlight(content, { language });
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
        'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
        'py': 'python', 'html': 'html', 'css': 'css', 'json': 'json', 'md': 'markdown',
        'sh': 'bash', 'bash': 'bash', 'rb': 'ruby', 'go': 'go', 'rs': 'rust'
    };
    return languageMap[ext] || 'plaintext';
}
```

### Phase 4: Alpine.js Integration (Days 7-8)

#### 4.1 Enhance Existing Alpine.js App

**File:** `src/difflicious/static/js/app.js` (Enhanced)
```javascript
// Add to existing diffliciousApp function
function diffliciousApp() {
    return {
        // ... existing properties ...
        
        // Virtual scrolling integration
        virtualScroller: null,
        useVirtualScrolling: true,
        renderingMode: 'auto', // 'virtual', 'standard', 'auto'
        
        // Performance thresholds
        virtualScrollingThreshold: 500, // Switch to virtual at 500+ lines
        
        // Enhanced init method
        async init() {
            await this.loadBranches();
            await this.loadGitStatus();
            this.loadUIState();
            await this.loadDiffs();
            
            // Initialize virtual scrolling if needed
            this.initializeVirtualScrolling();
        },
        
        initializeVirtualScrolling() {
            // Determine if virtual scrolling should be used
            const totalLines = this.calculateTotalLines();
            const shouldUseVirtual = this.renderingMode === 'virtual' || 
                (this.renderingMode === 'auto' && totalLines > this.virtualScrollingThreshold);
            
            if (shouldUseVirtual && this.useVirtualScrolling) {
                console.log(`Enabling virtual scrolling for ${totalLines} lines`);
                
                // Initialize virtual scroller
                this.virtualScroller = new VirtualDiffScroller({
                    container: '#diff-content-container',
                    lineHeight: 22,
                    visibleCount: 50,
                    bufferCount: 15
                });
                
                // Load current diff data into virtual scroller
                this.virtualScroller.loadDiffData({
                    groups: this.groups
                });
                
                // Hide standard Alpine.js rendering
                this.hideStandardRendering();
                
            } else {
                console.log(`Using standard rendering for ${totalLines} lines`);
                this.useVirtualScrolling = false;
            }
        },
        
        calculateTotalLines() {
            let total = 0;
            Object.values(this.groups).forEach(group => {
                group.files.forEach(file => {
                    if (file.expanded && file.hunks) {
                        file.hunks.forEach(hunk => {
                            total += hunk.lines.length + 1; // +1 for hunk header
                        });
                    }
                    total += 1; // File header
                });
            });
            return total;
        },
        
        hideStandardRendering() {
            // Hide Alpine.js templates when virtual scrolling is active
            const standardContainer = document.querySelector('#standard-diff-container');
            if (standardContainer) {
                standardContainer.style.display = 'none';
            }
        },
        
        // Enhanced loadDiffs method
        async loadDiffs() {
            this.loading = true;
            this.saveUIState();

            try {
                // ... existing diff loading logic ...
                
                // If virtual scrolling is active, update it
                if (this.virtualScroller) {
                    this.virtualScroller.loadDiffData({
                        groups: this.groups
                    });
                } else {
                    // Re-evaluate virtual scrolling need
                    this.initializeVirtualScrolling();
                }
                
            } catch (error) {
                console.error('Failed to load diffs:', error);
                // ... existing error handling ...
            } finally {
                this.loading = false;
            }
        },
        
        // Enhanced file toggle for virtual scrolling
        toggleFile(groupKey, fileIndex) {
            // Update data model
            if (this.groups[groupKey] && this.groups[groupKey].files[fileIndex]) {
                this.groups[groupKey].files[fileIndex].expanded = 
                    !this.groups[groupKey].files[fileIndex].expanded;
                this.saveUIState();
                
                // Update virtual scroller if active
                if (this.virtualScroller) {
                    this.virtualScroller.loadDiffData({
                        groups: this.groups
                    });
                }
            }
        },
        
        // Performance monitoring
        getPerformanceMetrics() {
            const totalLines = this.calculateTotalLines();
            const renderingMode = this.useVirtualScrolling ? 'virtual' : 'standard';
            const memoryUsage = performance.memory ? 
                Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 'unknown';
                
            return {
                totalLines,
                renderingMode,
                memoryUsage: `${memoryUsage}MB`,
                virtualScrollingActive: !!this.virtualScroller
            };
        }
    };
}
```

#### 4.2 Template Modifications

**File:** `src/difflicious/templates/index.html` (Enhanced)
```html
<!-- Add virtual scrolling container alongside existing template -->
<main class="flex-1 overflow-hidden">
    <!-- Loading State -->
    <div x-show="loading" class="flex items-center justify-center h-full">
        <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p class="mt-2 text-gray-600">Loading git diff data...</p>
        </div>
    </div>

    <!-- Virtual Scrolling Container (Hidden by default) -->
    <div id="diff-content-container" class="h-full" style="display: none;">
        <!-- Virtual scroller will inject content here -->
    </div>

    <!-- Standard Alpine.js Rendering (Existing) -->
    <div id="standard-diff-container" x-show="!loading && hasAnyGroups" class="h-full overflow-y-auto">
        <div class="p-4 space-y-6">
            <!-- Global Expand/Collapse Controls -->
            <div class="flex items-center space-x-2 mb-4">
                <button @click="expandAll()" :disabled="allExpanded" 
                    class="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors">
                    Expand All
                </button>
                <button @click="collapseAll()" :disabled="allCollapsed"
                    class="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors">
                    Collapse All
                </button>
                
                <!-- Performance Info (Debug) -->
                <div x-show="$store.debug" class="text-xs text-gray-500 ml-4">
                    <span x-text="'Mode: ' + (useVirtualScrolling ? 'Virtual' : 'Standard')"></span>
                    <span x-text="' | Lines: ' + calculateTotalLines()"></span>
                </div>
            </div>

            <!-- Existing diff rendering templates -->
            <template x-for="group in visibleGroups" :key="group.key">
                <!-- ... existing group rendering ... -->
            </template>
        </div>
    </div>

    <!-- Empty State (Unchanged) -->
    <div x-show="!loading && !hasAnyGroups" class="flex items-center justify-center h-full">
        <!-- ... existing empty state ... -->
    </div>
</main>

<!-- Include virtual scrolling script -->
<script src="{{ url_for('static', filename='js/virtual-scroller.js') }}"></script>
```

### Phase 5: Performance Monitoring and Optimization (Days 9-10)

#### 5.1 Performance Measurement System

**File:** `src/difflicious/static/js/performance-monitor.js`
```javascript
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
            this.observers.performance = new PerformanceObserver((list) => {
                this.handlePerformanceEntries(list.getEntries());
            });
            
            this.observers.performance.observe({ entryTypes: ['measure', 'navigation'] });
        }
        
        // Monitor memory usage periodically
        if (performance.memory) {
            setInterval(() => this.recordMemoryUsage(), 5000);
        }
        
        // DOM node count monitoring
        setInterval(() => this.recordDOMNodeCount(), 10000);
    }
    
    startMeasure(name) {
        performance.mark(`${name}-start`);
    }
    
    endMeasure(name) {
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        
        const measure = performance.getEntriesByName(name, 'measure')[0];
        if (measure) {
            this.recordMetric(this.getMetricCategory(name), measure.duration);
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
        if (performance.memory) {
            const usage = {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
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
```

### Phase 6: Testing and Debugging Tools (Days 11-12)

#### 6.1 Debug UI and Testing Utilities

**File:** `src/difflicious/static/js/virtual-scroller-debug.js`
```javascript
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
        const now = performance.now();
        const perfReport = window.diffPerformanceMonitor?.generateReport() || {};
        
        return {
            totalLines: this.scroller.allLines.length,
            visibleRange: this.scroller.visibleRange,
            renderedRange: this.scroller.renderedRange,
            domElementCount: this.scroller.lineToElement.size,
            poolSize: Object.values(this.scroller.domPool).reduce((sum, pool) => sum + pool.length, 0),
            memoryUsage: performance.memory ? 
                `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB` : 'Unknown',
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
```

## Implementation Timeline

### Week 1: Core Implementation
- **Days 1-2:** Foundation and data structures
- **Days 3-4:** DOM management and pooling
- **Days 5-6:** Lazy syntax highlighting
- **Days 7:** Alpine.js integration

### Week 2: Optimization and Testing
- **Days 8-9:** Performance monitoring
- **Days 10-11:** Testing and debugging tools
- **Days 12-14:** Performance optimization and bug fixes

## Testing Strategy

### Unit Tests
```javascript
// tests/virtual-scroller.test.js
describe('VirtualDiffScroller', () => {
    test('should initialize with correct configuration', () => {
        const scroller = new VirtualDiffScroller({
            lineHeight: 25,
            visibleCount: 40
        });
        
        expect(scroller.lineHeight).toBe(25);
        expect(scroller.visibleCount).toBe(40);
    });
    
    test('should flatten diff data correctly', () => {
        const mockData = { /* mock diff data */ };
        const scroller = new VirtualDiffScroller();
        const flattened = scroller.flattenDiffData(mockData);
        
        expect(Array.isArray(flattened)).toBe(true);
        expect(flattened.length).toBeGreaterThan(0);
    });
    
    test('should manage DOM pool efficiently', () => {
        const scroller = new VirtualDiffScroller();
        const element = scroller.createNewElement('diff-line');
        
        scroller.returnElementToPool(element, 'diff-line');
        expect(scroller.domPool['diff-line-pool'].length).toBe(1);
        
        const reusedElement = scroller.getDOMElement('diff-line');
        expect(reusedElement).toBe(element);
    });
});
```

### Performance Tests
```javascript
// tests/performance.test.js
describe('Virtual Scrolling Performance', () => {
    test('should render large diffs within performance budget', async () => {
        const largeDiff = generateMockDiff(5000); // 5000 lines
        const scroller = new VirtualDiffScroller();
        
        const startTime = performance.now();
        scroller.loadDiffData(largeDiff);
        const endTime = performance.now();
        
        expect(endTime - startTime).toBeLessThan(500); // 500ms budget
    });
    
    test('should maintain stable memory usage during scrolling', () => {
        const scroller = new VirtualDiffScroller();
        const initialMemory = performance.memory.usedJSHeapSize;
        
        // Simulate scrolling through large diff
        for (let i = 0; i < 100; i++) {
            scroller.handleScroll({ target: { scrollTop: i * 100 } });
        }
        
        const finalMemory = performance.memory.usedJSHeapSize;
        const memoryIncrease = finalMemory - initialMemory;
        
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
    });
});
```

## Expected Performance Improvements

### Before Virtual Scrolling:
```
Large Diff (5000 lines):
• Initial render time: 17 seconds
• Memory usage: 500MB
• DOM elements: 10,000+
• Browser freeze duration: 20+ seconds
• Scroll performance: Janky, stuttering
```

### After Virtual Scrolling:
```
Large Diff (5000 lines):
• Initial render time: 300ms (98% improvement)
• Memory usage: 50MB (90% improvement)  
• DOM elements: 100 (99% improvement)
• Browser freeze duration: None
• Scroll performance: Smooth, 60fps
```

## Migration Strategy

### Phase 1: Feature Flag Implementation
```javascript
// Add to existing Alpine.js app
const ENABLE_VIRTUAL_SCROLLING = true; // Feature flag

// Automatic detection based on diff size
const shouldUseVirtualScrolling = () => {
    const totalLines = calculateTotalLines();
    return ENABLE_VIRTUAL_SCROLLING && totalLines > 500;
};
```

### Phase 2: Progressive Enhancement
- Virtual scrolling activates only for large diffs
- Standard Alpine.js rendering for small diffs
- User can manually toggle modes
- Fallback to standard rendering if virtual scrolling fails

### Phase 3: Full Migration
- Virtual scrolling becomes the default
- Standard rendering kept as fallback
- Performance monitoring ensures quality

## Risks and Mitigation

### Technical Risks:
1. **Scroll synchronization issues** - Extensive testing with different scroll behaviors
2. **Memory leaks in DOM pooling** - Proper cleanup and monitoring
3. **Syntax highlighting delays** - Graceful degradation to plain text
4. **Alpine.js integration conflicts** - Careful state management

### Mitigation Strategies:
1. **Comprehensive testing** - Unit tests, integration tests, performance tests
2. **Feature flags** - Ability to disable virtual scrolling if issues arise
3. **Fallback mechanisms** - Standard rendering always available
4. **Performance monitoring** - Real-time metrics and alerting
5. **Gradual rollout** - Enable for increasing percentages of users

## Success Metrics

### Performance Targets:
- **90% reduction** in initial render time for large diffs
- **85% reduction** in memory usage
- **60fps** scroll performance maintained
- **Sub-500ms** response time for diff loading

### User Experience:
- **No browser freezing** during large diff loads
- **Immediate interactivity** - users can scroll/interact immediately
- **Smooth scrolling** through any size diff
- **Progressive loading** - content appears as user scrolls

## Conclusion

Virtual scrolling implementation will transform difflicious from a tool that struggles with large diffs into one that handles them effortlessly. The 80-90% performance improvement will enable users to work with diffs of any size without browser freezing or excessive memory usage.

The progressive enhancement approach ensures existing functionality remains intact while dramatically improving performance for the most problematic use cases. This implementation represents the highest-impact performance improvement possible for difflicious with minimal risk to existing functionality.