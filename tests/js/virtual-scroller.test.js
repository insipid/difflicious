/**
 * Tests for VirtualDiffScroller
 * Phase 1: Foundation and Data Structures
 */

// Mock DOM environment for testing
Object.defineProperty(window, 'performance', {
    value: {
        now: jest.fn(() => Date.now()),
        mark: jest.fn(),
        measure: jest.fn(),
        getEntriesByName: jest.fn(() => [])
    }
});

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn()
}));

// Import the VirtualDiffScroller
const VirtualDiffScroller = require('../../src/difflicious/static/js/virtual-scroller.js');

// Mock console methods to avoid noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    time: jest.fn(),
    timeEnd: jest.fn(),
    error: jest.fn()
};

describe('VirtualDiffScroller - Phase 1', () => {
    let mockContainer;
    let scroller;

    beforeEach(() => {
        // Setup DOM mock
        document.body.innerHTML = '';
        
        // Create mock container
        mockContainer = document.createElement('div');
        mockContainer.id = 'test-container';
        mockContainer.style.height = '500px';
        document.body.appendChild(mockContainer);
        
        // Mock getBoundingClientRect
        Element.prototype.getBoundingClientRect = jest.fn(() => ({
            width: 800,
            height: 500,
            top: 0,
            left: 0,
            bottom: 500,
            right: 800
        }));
    });

    afterEach(() => {
        if (scroller) {
            scroller = null;
        }
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            scroller = new VirtualDiffScroller({
                container: '#test-container'
            });

            expect(scroller.containerSelector).toBe('#test-container');
            expect(scroller.lineHeight).toBe(22);
            expect(scroller.visibleCount).toBe(50);
            expect(scroller.bufferCount).toBe(15);
            expect(scroller.allLines).toEqual([]);
            expect(scroller.visibleRange).toEqual({ start: 0, end: 0 });
        });

        test('should initialize with custom configuration', () => {
            scroller = new VirtualDiffScroller({
                container: '#test-container',
                lineHeight: 25,
                visibleCount: 40,
                bufferCount: 10
            });

            expect(scroller.lineHeight).toBe(25);
            expect(scroller.visibleCount).toBe(40);
            expect(scroller.bufferCount).toBe(10);
        });

        test('should setup DOM structure correctly', () => {
            scroller = new VirtualDiffScroller({
                container: '#test-container'
            });

            expect(scroller.isInitialized()).toBe(true);
            expect(scroller.container).toBeTruthy();
            expect(scroller.viewport).toBeTruthy();
            expect(scroller.spacer).toBeTruthy();

            // Check DOM structure
            expect(scroller.container.children.length).toBe(1);
            expect(scroller.container.children[0]).toBe(scroller.viewport);
            expect(scroller.viewport.children.length).toBe(1);
            expect(scroller.viewport.children[0]).toBe(scroller.spacer);
        });

        test('should handle missing container gracefully', () => {
            scroller = new VirtualDiffScroller({
                container: '#non-existent-container'
            });

            expect(scroller.container).toBe(null);
            expect(scroller.isInitialized()).toBe(false);
            expect(console.error).toHaveBeenCalledWith(
                'Virtual scroll container not found:',
                '#non-existent-container'
            );
        });
    });

    describe('Data Processing', () => {
        beforeEach(() => {
            scroller = new VirtualDiffScroller({
                container: '#test-container'
            });
        });

        test('should flatten empty diff data', () => {
            const emptyData = { groups: {} };
            const flattened = scroller.flattenDiffData(emptyData);

            expect(flattened).toEqual([]);
        });

        test('should flatten simple diff data with file headers', () => {
            const mockData = {
                groups: {
                    unstaged: {
                        files: [
                            {
                                path: 'test.js',
                                expanded: false,
                                hunks: []
                            },
                            {
                                path: 'test2.py',
                                expanded: false,
                                hunks: []
                            }
                        ]
                    }
                }
            };

            const flattened = scroller.flattenDiffData(mockData);

            expect(flattened).toHaveLength(2);
            expect(flattened[0]).toEqual({
                type: 'file-header',
                globalIndex: 0,
                groupKey: 'unstaged',
                fileIndex: 0,
                filePath: 'test.js',
                fileData: mockData.groups.unstaged.files[0],
                isExpanded: false
            });
            expect(flattened[1]).toEqual({
                type: 'file-header',
                globalIndex: 1,
                groupKey: 'unstaged',
                fileIndex: 1,
                filePath: 'test2.py',
                fileData: mockData.groups.unstaged.files[1],
                isExpanded: false
            });
        });

        test('should flatten expanded file with hunks and lines', () => {
            const mockData = {
                groups: {
                    unstaged: {
                        files: [
                            {
                                path: 'test.js',
                                expanded: true,
                                hunks: [
                                    {
                                        section_header: '@@ -1,3 +1,4 @@',
                                        lines: [
                                            { type: 'context', content: 'line 1' },
                                            { type: 'deletion', content: 'old line' },
                                            { type: 'addition', content: 'new line' }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                }
            };

            const flattened = scroller.flattenDiffData(mockData);

            expect(flattened).toHaveLength(5); // 1 file header + 1 hunk header + 3 lines
            
            // Check file header
            expect(flattened[0].type).toBe('file-header');
            expect(flattened[0].filePath).toBe('test.js');
            
            // Check hunk header
            expect(flattened[1].type).toBe('hunk-header');
            expect(flattened[1].sectionHeader).toBe('@@ -1,3 +1,4 @@');
            
            // Check diff lines
            expect(flattened[2].type).toBe('diff-line');
            expect(flattened[2].lineData.type).toBe('context');
            expect(flattened[3].type).toBe('diff-line');
            expect(flattened[3].lineData.type).toBe('deletion');
            expect(flattened[4].type).toBe('diff-line');
            expect(flattened[4].lineData.type).toBe('addition');
        });

        test('should handle multiple groups correctly', () => {
            const mockData = {
                groups: {
                    unstaged: {
                        files: [{ path: 'unstaged.js', expanded: false, hunks: [] }]
                    },
                    staged: {
                        files: [{ path: 'staged.js', expanded: false, hunks: [] }]
                    }
                }
            };

            const flattened = scroller.flattenDiffData(mockData);

            expect(flattened).toHaveLength(2);
            expect(flattened[0].groupKey).toBe('unstaged');
            expect(flattened[1].groupKey).toBe('staged');
        });
    });

    describe('Data Loading', () => {
        beforeEach(() => {
            scroller = new VirtualDiffScroller({
                container: '#test-container'
            });
        });

        test('should load diff data and update spacer height', () => {
            const mockData = {
                groups: {
                    unstaged: {
                        files: [
                            { path: 'test1.js', expanded: false, hunks: [] },
                            { path: 'test2.js', expanded: false, hunks: [] }
                        ]
                    }
                }
            };

            scroller.loadDiffData(mockData);

            expect(scroller.getTotalLines()).toBe(2);
            expect(scroller.spacer.style.height).toBe('44px'); // 2 lines * 22px line height
        });

        test('should recalculate viewport after loading data', () => {
            const mockData = {
                groups: {
                    unstaged: {
                        files: [{ path: 'test.js', expanded: false, hunks: [] }]
                    }
                }
            };

            scroller.loadDiffData(mockData);

            // Should have called recalculateViewport and renderVisibleRange
            expect(scroller.visibleRange.start).toBe(0);
            expect(scroller.visibleRange.end).toBeGreaterThan(0);
        });
    });

    describe('Viewport Management', () => {
        beforeEach(() => {
            scroller = new VirtualDiffScroller({
                container: '#test-container',
                lineHeight: 20,
                visibleCount: 10,
                bufferCount: 5
            });
        });

        test('should calculate viewport correctly', () => {
            scroller.recalculateViewport();

            // Container height (500px) / line height (20px) + buffer (5) = 30
            expect(scroller.visibleCount).toBe(30);
        });

        test('should handle scroll events and update visible range', () => {
            // Load some test data first
            const mockData = {
                groups: {
                    unstaged: {
                        files: Array.from({ length: 100 }, (_, i) => ({
                            path: `test${i}.js`,
                            expanded: false,
                            hunks: []
                        }))
                    }
                }
            };
            scroller.loadDiffData(mockData);

            // Mock scroll event
            const mockScrollEvent = {
                target: { scrollTop: 400 } // Scroll down 400px
            };

            const initialRange = { ...scroller.visibleRange };
            scroller.handleScroll(mockScrollEvent);

            // Should update visible range based on scroll position
            expect(scroller.visibleRange.start).toBeGreaterThan(initialRange.start);
            expect(scroller.lastScrollTime).toBeGreaterThan(0);
        });

        test('should only update range when scroll change is significant', () => {
            const mockData = {
                groups: {
                    unstaged: {
                        files: Array.from({ length: 100 }, (_, i) => ({
                            path: `test${i}.js`,
                            expanded: false,
                            hunks: []
                        }))
                    }
                }
            };
            scroller.loadDiffData(mockData);

            const initialRange = { ...scroller.visibleRange };
            
            // Small scroll change (should not update - less than 5 lines difference)
            // 10px scroll / 20px line height = 0.5 lines, which is < 5 threshold
            scroller.handleScroll({ target: { scrollTop: 10 } });
            expect(scroller.visibleRange.start).toBe(initialRange.start);

            // Large scroll change (should update)
            scroller.handleScroll({ target: { scrollTop: 200 } });
            expect(scroller.visibleRange.start).toBeGreaterThan(initialRange.start);
        });
    });

    describe('Rendering Management', () => {
        beforeEach(() => {
            scroller = new VirtualDiffScroller({
                container: '#test-container'
            });
        });

        test('should track rendered elements', () => {
            const mockData = {
                groups: {
                    unstaged: {
                        files: [
                            { path: 'test1.js', expanded: false, hunks: [] },
                            { path: 'test2.js', expanded: false, hunks: [] },
                            { path: 'test3.js', expanded: false, hunks: [] }
                        ]
                    }
                }
            };

            scroller.loadDiffData(mockData);

            // Should have rendered elements in the visible range
            expect(scroller.getRenderedElementCount()).toBeGreaterThan(0);
            expect(scroller.getRenderedElementCount()).toBeLessThanOrEqual(scroller.getTotalLines());
        });

        test('should cleanup invisible elements', () => {
            // Render some lines into the DOM
            scroller.allLines = [
                { type: 'file-header', filePath: 'a.js', globalIndex: 0 },
                { type: 'file-header', filePath: 'b.js', globalIndex: 1 },
                { type: 'file-header', filePath: 'c.js', globalIndex: 2 }
            ];
            scroller.renderLine(scroller.allLines[0], 0);
            scroller.renderLine(scroller.allLines[1], 1);
            scroller.renderLine(scroller.allLines[2], 2);

            expect(scroller.lineToElement.size).toBe(3);
            expect(scroller.viewport.children.length).toBe(4); // 3 lines + spacer

            // Now, cleanup, keeping only line 1 visible
            scroller.cleanupInvisibleElements(1, 2);

            expect(scroller.lineToElement.size).toBe(1);
            expect(scroller.lineToElement.has(1)).toBe(true);
            expect(scroller.viewport.children.length).toBe(2); // 1 line + spacer
            expect(scroller.domPool['file-header-pool']).toHaveLength(2);
        });

        test('should handle empty lines array gracefully', () => {
            scroller.allLines = [];
            
            expect(() => {
                scroller.renderVisibleRange();
            }).not.toThrow();
            
            expect(scroller.getRenderedElementCount()).toBe(0);
        });
    });

    describe('Utility Methods', () => {
        beforeEach(() => {
            scroller = new VirtualDiffScroller({
                container: '#test-container'
            });
        });

        test('should return correct total lines', () => {
            expect(scroller.getTotalLines()).toBe(0);

            scroller.allLines = [
                { type: 'file-header' },
                { type: 'diff-line' },
                { type: 'diff-line' }
            ];

            expect(scroller.getTotalLines()).toBe(3);
        });

        test('should return copies of ranges to prevent external modification', () => {
            scroller.visibleRange = { start: 10, end: 50 };
            scroller.renderedRange = { start: 5, end: 55 };

            const visibleRange = scroller.getVisibleRange();
            const renderedRange = scroller.getRenderedRange();

            // Should be copies, not references
            expect(visibleRange).toEqual({ start: 10, end: 50 });
            expect(renderedRange).toEqual({ start: 5, end: 55 });

            // Modifying returned objects should not affect internal state
            visibleRange.start = 999;
            renderedRange.start = 999;

            expect(scroller.visibleRange.start).toBe(10);
            expect(scroller.renderedRange.start).toBe(5);
        });

        test('should correctly report initialization status', () => {
            // Should be initialized after constructor
            expect(scroller.isInitialized()).toBe(true);

            // Should be false if container is missing
            const badScroller = new VirtualDiffScroller({
                container: '#non-existent'
            });
            expect(badScroller.isInitialized()).toBe(false);
        });
    });

    describe('Performance Tracking', () => {
        beforeEach(() => {
            scroller = new VirtualDiffScroller({
                container: '#test-container'
            });
        });

        test('should track scroll timing', () => {
            scroller.simulateScroll(100);
            
            expect(scroller.lastScrollTime).toBeGreaterThan(0);
            expect(scroller.isScrolling).toBe(true);
        });

        test('should reset scrolling state after timeout', (done) => {
            scroller.simulateScroll(100);
            expect(scroller.isScrolling).toBe(true);

            // Wait for timeout to clear scrolling state
            setTimeout(() => {
                expect(scroller.isScrolling).toBe(false);
                done();
            }, 200);
        });
    });
});

describe('VirtualDiffScroller - Phase 2', () => {
    let mockContainer;
    let scroller;

    beforeEach(() => {
        // Setup DOM mock
        document.body.innerHTML = '';
        
        // Create mock container
        mockContainer = document.createElement('div');
        mockContainer.id = 'test-container';
        mockContainer.style.height = '500px';
        document.body.appendChild(mockContainer);
        
        // Mock getBoundingClientRect
        Element.prototype.getBoundingClientRect = jest.fn(() => ({
            width: 800,
            height: 500,
            top: 0,
            left: 0,
            bottom: 500,
            right: 800
        }));

        scroller = new VirtualDiffScroller({
            container: '#test-container',
            lineHeight: 20,
            visibleCount: 10,
            bufferCount: 5
        });
    });

    afterEach(() => {
        if (scroller) {
            scroller = null;
        }
        document.body.innerHTML = '';
        jest.clearAllMocks();
    });

    describe('DOM Element Creation and Pooling', () => {
        test('should create a new element if pool is empty', () => {
            const element = scroller.getDOMElement('diff-line');
            expect(element).toBeInstanceOf(HTMLElement);
            expect(element.className).toContain('virtual-diff-line');
            expect(scroller.domPool['diff-line-pool']).toBeUndefined();
        });

        test('should reuse an element from the pool', () => {
            const element1 = scroller.createNewElement('diff-line');
            scroller.returnElementToPool(element1, 'diff-line');
            
            expect(scroller.domPool['diff-line-pool']).toHaveLength(1);

            const element2 = scroller.getDOMElement('diff-line');
            expect(element2).toBe(element1);
            expect(scroller.domPool['diff-line-pool']).toHaveLength(0);
        });

        test('should create different element types', () => {
            const fileHeader = scroller.createNewElement('file-header');
            expect(fileHeader.className).toContain('virtual-file-header');

            const hunkHeader = scroller.createNewElement('hunk-header');
            expect(hunkHeader.className).toContain('virtual-hunk-header');

            const diffLine = scroller.createNewElement('diff-line');
            expect(diffLine.className).toContain('virtual-diff-line');
        });

        test('should return element to the correct pool', () => {
            const fileHeader = scroller.createNewElement('file-header');
            scroller.returnElementToPool(fileHeader, 'file-header');
            expect(scroller.domPool['file-header-pool']).toHaveLength(1);
            expect(scroller.domPool['diff-line-pool']).toBeUndefined();
        });
    });

    describe('Rendering Logic', () => {
        test('should render a line and add it to the DOM', () => {
            const lineData = {
                type: 'file-header',
                filePath: 'test.js',
                globalIndex: 0
            };

            scroller.renderLine(lineData, 0);

            const element = scroller.lineToElement.get(0);
            expect(element).toBeInstanceOf(HTMLElement);
            expect(element.style.top).toBe('0px');
            expect(element.dataset.globalIndex).toBe('0');
            expect(scroller.viewport.contains(element)).toBe(true);
        });

        test('should configure file header correctly', () => {
            const lineData = {
                type: 'file-header',
                filePath: 'src/app.js',
                globalIndex: 0
            };
            const element = scroller.createNewElement('file-header');
            scroller.configureFileHeader(element, lineData);
            expect(element.querySelector('.file-path').textContent).toBe('src/app.js');
        });

        test('should configure hunk header correctly', () => {
            const lineData = {
                type: 'hunk-header',
                sectionHeader: '@@ -1,1 +1,1 @@',
                globalIndex: 1
            };
            const element = scroller.createNewElement('hunk-header');
            scroller.configureHunkHeader(element, lineData);
            expect(element.querySelector('.section-header').textContent).toBe('@@ -1,1 +1,1 @@');
        });
    });

    describe('Element Cleanup', () => {
        test('should remove invisible elements from DOM and return to pool', () => {
            // Render some lines
            scroller.allLines = [
                { type: 'file-header', filePath: 'a.js', globalIndex: 0 },
                { type: 'file-header', filePath: 'b.js', globalIndex: 1 },
                { type: 'file-header', filePath: 'c.js', globalIndex: 2 }
            ];
            scroller.renderLine(scroller.allLines[0], 0);
            scroller.renderLine(scroller.allLines[1], 1);
            scroller.renderLine(scroller.allLines[2], 2);

            expect(scroller.lineToElement.size).toBe(3);
            expect(scroller.viewport.children.length).toBe(4); // 3 lines + spacer

            // Now, cleanup, keeping only line 1 visible
            scroller.cleanupInvisibleElements(1, 2);

            expect(scroller.lineToElement.size).toBe(1);
            expect(scroller.lineToElement.has(1)).toBe(true);
            expect(scroller.viewport.children.length).toBe(2); // 1 line + spacer
            expect(scroller.domPool['file-header-pool']).toHaveLength(2);
        });
    });
});

describe('VirtualDiffScroller - Phase 3', () => {
    let scroller;
    let mockElement;

    beforeEach(() => {
        document.body.innerHTML = '<div id="test-container" style="height: 500px;"></div>';
        scroller = new VirtualDiffScroller({ container: '#test-container' });

        // Mock hljs
        window.hljs = {
            highlight: jest.fn((content, options) => ({ value: `highlighted ${content}` })),
            highlightAuto: jest.fn(content => ({ value: `auto-highlighted ${content}` }))
        };

        // Mock requestIdleCallback
        window.requestIdleCallback = jest.fn((callback) => callback());

        // Create a mock element to work with
        mockElement = scroller.createNewElement('diff-line');
        // Mock isConnected property
        Object.defineProperty(mockElement, 'isConnected', { get: () => true });
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete window.hljs;
        delete window.requestIdleCallback;
    });

    describe('Language Detection', () => {
        test('should detect common languages by extension', () => {
            expect(scroller.detectLanguage('test.js')).toBe('javascript');
            expect(scroller.detectLanguage('test.py')).toBe('python');
            expect(scroller.detectLanguage('test.css')).toBe('css');
            expect(scroller.detectLanguage('test.html')).toBe('html');
            expect(scroller.detectLanguage('test.rs')).toBe('rust');
        });

        test('should fallback to plaintext for unknown extensions', () => {
            expect(scroller.detectLanguage('test.unknown')).toBe('plaintext');
            expect(scroller.detectLanguage('README')).toBe('plaintext');
        });
    });

    describe('Code Highlighting', () => {
        test('should call hljs.highlight for known languages', () => {
            const result = scroller.highlightCode('let x = 1;', 'test.js');
            expect(window.hljs.highlight).toHaveBeenCalledWith('let x = 1;', { language: 'javascript' });
            expect(result).toBe('highlighted let x = 1;');
        });

        test('should call hljs.highlightAuto for plaintext', () => {
            const result = scroller.highlightCode('some text', 'test.txt');
            expect(window.hljs.highlightAuto).toHaveBeenCalledWith('some text');
            expect(result).toBe('auto-highlighted some text');
        });

        test('should handle missing hljs gracefully', () => {
            delete window.hljs;
            const result = scroller.highlightCode('let x = 1;', 'test.js');
            expect(result).toBe('let x = 1;');
        });
    });

    describe('Highlight Scheduling', () => {
        test('should use requestIdleCallback when available', () => {
            const lineData = { type: 'diff-line', needsHighlighting: true };
            jest.spyOn(scroller, 'highlightLine');
            scroller.scheduleHighlighting(mockElement, lineData);
            expect(window.requestIdleCallback).toHaveBeenCalled();
            expect(scroller.highlightLine).toHaveBeenCalledWith(mockElement, lineData);
        });

        test('should use setTimeout as a fallback', (done) => {
            delete window.requestIdleCallback;
            jest.spyOn(global, 'setTimeout');
            jest.spyOn(scroller, 'highlightLine');

            const lineData = { type: 'diff-line', needsHighlighting: true };
            scroller.scheduleHighlighting(mockElement, lineData);
            
            expect(setTimeout).toHaveBeenCalled();
            
            // Allow setTimeout to run
            setTimeout(() => {
                expect(scroller.highlightLine).toHaveBeenCalledWith(mockElement, lineData);
                done();
            }, 10);
        });
    });

    describe('Line Highlighting Logic', () => {
        test('should highlight an addition line correctly', () => {
            const lineData = {
                filePath: 'test.js',
                lineData: {
                    right: { type: 'addition', content: 'new line', line_num: 5 }
                },
                needsHighlighting: true
            };

            scroller.highlightLine(mockElement, lineData);

            const rightContent = mockElement.querySelector('.line-right .line-text');
            const rightMarker = mockElement.querySelector('.line-right .line-marker');
            const rightNum = mockElement.querySelector('.line-right .line-num');

            expect(rightContent.innerHTML).toBe('highlighted new line');
            expect(rightMarker.textContent).toBe('+');
            expect(rightNum.textContent).toBe('5');
            expect(mockElement.querySelector('.line-right').classList.contains('bg-green-50')).toBe(true);
            expect(lineData.needsHighlighting).toBe(false);
        });

        test('should highlight a deletion line correctly', () => {
            const lineData = {
                filePath: 'test.py',
                lineData: {
                    left: { type: 'deletion', content: 'old line', line_num: 2 }
                },
                needsHighlighting: true
            };

            scroller.highlightLine(mockElement, lineData);

            const leftContent = mockElement.querySelector('.line-left .line-text');
            const leftMarker = mockElement.querySelector('.line-left .line-marker');
            const leftNum = mockElement.querySelector('.line-left .line-num');

            expect(leftContent.innerHTML).toBe('highlighted old line');
            expect(leftMarker.textContent).toBe('-');
            expect(leftNum.textContent).toBe('2');
            expect(mockElement.querySelector('.line-left').classList.contains('bg-red-50')).toBe(true);
        });

        test('should handle context lines', () => {
            const lineData = {
                filePath: 'test.css',
                lineData: {
                    type: 'context',
                    left: { content: 'same line', line_num: 10 },
                    right: { content: 'same line', line_num: 11 }
                },
                needsHighlighting: true
            };

            scroller.highlightLine(mockElement, lineData);

            const leftMarker = mockElement.querySelector('.line-left .line-marker');
            const rightMarker = mockElement.querySelector('.line-right .line-marker');

            expect(leftMarker.innerHTML).toBe('&nbsp;');
            expect(rightMarker.innerHTML).toBe('&nbsp;');
            expect(mockElement.querySelector('.line-left').classList.contains('bg-red-50')).toBe(false);
            expect(mockElement.querySelector('.line-right').classList.contains('bg-green-50')).toBe(false);
        });
    });
});