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
            // Create elements in the lineToElement map
            scroller.lineToElement.set(0, { type: 'file-header' });
            scroller.lineToElement.set(1, { type: 'file-header' });
            scroller.lineToElement.set(10, { type: 'file-header' });
            scroller.lineToElement.set(20, { type: 'file-header' });

            const initialCount = scroller.lineToElement.size;
            expect(initialCount).toBe(4);

            // Cleanup elements outside range 5-15
            scroller.cleanupInvisibleElements(5, 15);

            // Should have removed elements 0, 1, and 20 (outside range)
            expect(scroller.lineToElement.size).toBe(1);
            expect(scroller.lineToElement.has(10)).toBe(true);
            expect(scroller.lineToElement.has(0)).toBe(false);
            expect(scroller.lineToElement.has(1)).toBe(false);
            expect(scroller.lineToElement.has(20)).toBe(false);
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