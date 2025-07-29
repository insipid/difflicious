/**
 * Unit Tests for Context Manager
 * Tests the extracted context expansion functionality
 */

// Mock global fetch for testing
global.fetch = jest.fn();

// Import or mock the context manager
// Note: In a real environment, you'd import this from the actual file
// For now, we'll assume createContextManager is available globally

describe('ContextManager', () => {
    let contextManager;
    let mockGroups;
    let mockSaveState;

    beforeEach(() => {
        // Reset mocks
        fetch.mockClear();
        
        // Create fresh context manager
        contextManager = createContextManager();
        
        // Mock groups data structure
        mockGroups = {
            unstaged: {
                files: [
                    {
                        path: 'test.js',
                        hunks: [
                            {
                                old_start: 10,
                                old_count: 5,
                                new_start: 10, 
                                new_count: 5,
                                lines: [
                                    { type: 'context', left: { content: 'line 10', line_num: 10 }, right: { content: 'line 10', line_num: 10 } },
                                    { type: 'remove', left: { content: 'old line 11', line_num: 11 }, right: null },
                                    { type: 'add', left: null, right: { content: 'new line 11', line_num: 11 } },
                                    { type: 'context', left: { content: 'line 12', line_num: 12 }, right: { content: 'line 12', line_num: 12 } },
                                    { type: 'context', left: { content: 'line 13', line_num: 13 }, right: { content: 'line 13', line_num: 13 } }
                                ]
                            },
                            {
                                old_start: 20,
                                old_count: 3,
                                new_start: 20,
                                new_count: 3,
                                lines: [
                                    { type: 'context', left: { content: 'line 20', line_num: 20 }, right: { content: 'line 20', line_num: 20 } },
                                    { type: 'add', left: null, right: { content: 'new line 21', line_num: 21 } },
                                    { type: 'context', left: { content: 'line 22', line_num: 22 }, right: { content: 'line 22', line_num: 22 } }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        // Mock save state callback
        mockSaveState = jest.fn();

        // Setup dependencies
        contextManager._setGroupsReference(mockGroups);
        contextManager._setSaveStateCallback(mockSaveState);
    });

    describe('canExpandContext', () => {
        test('should return true for first hunk expand up when not starting at line 1', () => {
            const result = contextManager.canExpandContext('test.js', 0, 'before');
            expect(result).toBe(true); // hunk starts at line 10, not 1
        });

        test('should return false for first hunk expand up when starting at line 1', () => {
            // Modify first hunk to start at line 1
            mockGroups.unstaged.files[0].hunks[0].old_start = 1;
            
            const result = contextManager.canExpandContext('test.js', 0, 'before');
            expect(result).toBe(false);
        });

        test('should return false for first hunk expand down', () => {
            const result = contextManager.canExpandContext('test.js', 0, 'after');
            expect(result).toBe(false);
        });

        test('should return true for non-first hunk expand up', () => {
            const result = contextManager.canExpandContext('test.js', 1, 'before');
            expect(result).toBe(true);
        });

        test('should return true for non-first hunk expand down', () => {
            const result = contextManager.canExpandContext('test.js', 1, 'after');
            expect(result).toBe(true);
        });

        test('should return false for non-existent file', () => {
            const result = contextManager.canExpandContext('nonexistent.js', 0, 'before');
            expect(result).toBe(false);
        });

        test('should return false for non-existent hunk', () => {
            const result = contextManager.canExpandContext('test.js', 99, 'before');
            expect(result).toBe(false);
        });
    });

    describe('isContextLoading', () => {
        test('should return false when loading state not initialized', () => {
            const result = contextManager.isContextLoading('test.js', 0, 'before');
            expect(result).toBe(false);
        });

        test('should return true when loading state is set to true', () => {
            // Initialize loading state
            contextManager.contextLoading['test.js'] = {
                0: { before: true, after: false }
            };

            const result = contextManager.isContextLoading('test.js', 0, 'before');
            expect(result).toBe(true);
        });

        test('should return false when loading state is set to false', () => {
            // Initialize loading state
            contextManager.contextLoading['test.js'] = {
                0: { before: false, after: false }
            };

            const result = contextManager.isContextLoading('test.js', 0, 'before');
            expect(result).toBe(false);
        });
    });

    describe('_fetchFileLines', () => {
        test('should make correct API call and return response', async () => {
            const mockResponse = {
                status: 'ok',
                lines: ['line 8', 'line 9']
            };

            fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockResponse)
            });

            const result = await contextManager._fetchFileLines('test.js', 8, 9);

            expect(fetch).toHaveBeenCalledWith('/api/file/lines?file_path=test.js&start_line=8&end_line=9');
            expect(result).toEqual(mockResponse);
        });

        test('should handle fetch errors gracefully', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(contextManager._fetchFileLines('test.js', 8, 9)).rejects.toThrow('Network error');
        });
    });

    describe('expandContext', () => {
        test('should expand context before first hunk correctly', async () => {
            const mockResponse = {
                status: 'ok',
                lines: ['line 8', 'line 9']
            };

            fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockResponse)
            });

            await contextManager.expandContext('test.js', 0, 'before', 2);

            // Verify fetch was called with correct parameters
            expect(fetch).toHaveBeenCalledWith('/api/file/lines?file_path=test.js&start_line=8&end_line=9');

            // Verify context expansion state was updated
            expect(contextManager.contextExpansions['test.js'][0].beforeExpanded).toBe(2);

            // Verify save state callback was called
            expect(mockSaveState).toHaveBeenCalled();

            // Verify hunk was modified correctly
            const targetHunk = mockGroups.unstaged.files[0].hunks[0];
            expect(targetHunk.lines.length).toBe(7); // 5 original + 2 expanded
            expect(targetHunk.old_start).toBe(8);
            expect(targetHunk.new_start).toBe(8);
            expect(targetHunk.old_count).toBe(7);
            expect(targetHunk.new_count).toBe(7);
        });

        test('should expand context after hunk correctly', async () => {
            const mockResponse = {
                status: 'ok',
                lines: ['line 15', 'line 16']
            };

            fetch.mockResolvedValueOnce({
                json: () => Promise.resolve(mockResponse)
            });

            await contextManager.expandContext('test.js', 1, 'after', 2);

            // Should expand after the previous hunk (hunk 0)
            expect(fetch).toHaveBeenCalledWith('/api/file/lines?file_path=test.js&start_line=15&end_line=16');

            // Verify context expansion state was updated for hunk 0
            expect(contextManager.contextExpansions['test.js'][0].afterExpanded).toBe(2);

            // Verify first hunk was modified
            const targetHunk = mockGroups.unstaged.files[0].hunks[0];
            expect(targetHunk.lines.length).toBe(7); // 5 original + 2 expanded
            expect(targetHunk.old_count).toBe(7);
            expect(targetHunk.new_count).toBe(7);
        });

        test('should handle API errors gracefully', async () => {
            fetch.mockRejectedValueOnce(new Error('API Error'));

            // Should not throw, but handle error gracefully
            await contextManager.expandContext('test.js', 0, 'before', 2);

            // Loading state should be reset even on error
            expect(contextManager.contextLoading['test.js'][0].before).toBe(false);

            // Save state should not be called on error
            expect(mockSaveState).not.toHaveBeenCalled();
        });

        test('should handle invalid file gracefully', async () => {
            await contextManager.expandContext('nonexistent.js', 0, 'before', 2);

            // Should not make API call
            expect(fetch).not.toHaveBeenCalled();
            expect(mockSaveState).not.toHaveBeenCalled();
        });
    });

    describe('_insertContextLines', () => {
        test('should insert context lines before hunk correctly', () => {
            const lines = ['line 8', 'line 9'];
            contextManager._insertContextLines('test.js', 0, 'before', lines, 8);

            const targetHunk = mockGroups.unstaged.files[0].hunks[0];
            
            // Should have 2 additional lines at the beginning
            expect(targetHunk.lines.length).toBe(7);
            expect(targetHunk.lines[0].left.content).toBe('line 8');
            expect(targetHunk.lines[0].left.line_num).toBe(8);
            expect(targetHunk.lines[1].left.content).toBe('line 9');
            expect(targetHunk.lines[1].left.line_num).toBe(9);

            // Hunk start positions should be updated
            expect(targetHunk.old_start).toBe(8);
            expect(targetHunk.new_start).toBe(8);
            expect(targetHunk.old_count).toBe(7);
            expect(targetHunk.new_count).toBe(7);
        });

        test('should insert context lines after hunk correctly', () => {
            const lines = ['line 15', 'line 16'];
            contextManager._insertContextLines('test.js', 0, 'after', lines, 15);

            const targetHunk = mockGroups.unstaged.files[0].hunks[0];
            
            // Should have 2 additional lines at the end
            expect(targetHunk.lines.length).toBe(7);
            const lastIndex = targetHunk.lines.length - 1;
            expect(targetHunk.lines[lastIndex].left.content).toBe('line 16');
            expect(targetHunk.lines[lastIndex].left.line_num).toBe(16);

            // Hunk counts should be updated
            expect(targetHunk.old_count).toBe(7);
            expect(targetHunk.new_count).toBe(7);
        });
    });

    describe('_checkAndMergeHunks', () => {
        test('should merge adjacent hunks', () => {
            // Set up hunks that are adjacent (no gap)
            mockGroups.unstaged.files[0].hunks[0].old_count = 5;
            mockGroups.unstaged.files[0].hunks[0].new_count = 5;
            // First hunk ends at line 14 (10 + 5 - 1)
            
            mockGroups.unstaged.files[0].hunks[1].old_start = 15; // Adjacent
            mockGroups.unstaged.files[0].hunks[1].new_start = 15;

            const originalHunkCount = mockGroups.unstaged.files[0].hunks.length;
            
            contextManager._checkAndMergeHunks(mockGroups.unstaged.files[0], 0);

            // Should have one less hunk after merging
            expect(mockGroups.unstaged.files[0].hunks.length).toBe(originalHunkCount - 1);
            
            // First hunk should contain merged content
            const mergedHunk = mockGroups.unstaged.files[0].hunks[0];
            expect(mergedHunk.old_count).toBe(8); // Combined counts
            expect(mergedHunk.new_count).toBe(8);
        });

        test('should not merge hunks with large gaps', () => {
            // Keep default hunk positions (large gap between hunks)
            const originalHunkCount = mockGroups.unstaged.files[0].hunks.length;
            
            contextManager._checkAndMergeHunks(mockGroups.unstaged.files[0], 0);

            // Should not merge hunks with large gaps
            expect(mockGroups.unstaged.files[0].hunks.length).toBe(originalHunkCount);
        });
    });

    describe('State Management', () => {
        test('should initialize context expansion state correctly', () => {
            // State should be empty initially
            expect(Object.keys(contextManager.contextExpansions)).toHaveLength(0);
            expect(Object.keys(contextManager.contextLoading)).toHaveLength(0);
        });

        test('should track expansion state per file and hunk', async () => {
            const mockResponse = { status: 'ok', lines: ['line 8'] };
            fetch.mockResolvedValueOnce({ json: () => Promise.resolve(mockResponse) });

            await contextManager.expandContext('test.js', 0, 'before', 1);

            expect(contextManager.contextExpansions['test.js']).toBeDefined();
            expect(contextManager.contextExpansions['test.js'][0]).toBeDefined();
            expect(contextManager.contextExpansions['test.js'][0].beforeExpanded).toBe(1);
        });

        test('should track loading state correctly', async () => {
            let loadingStateDuringCall;
            
            // Mock fetch to capture loading state during call
            fetch.mockImplementationOnce(() => {
                loadingStateDuringCall = contextManager.isContextLoading('test.js', 0, 'before');
                return Promise.resolve({ json: () => Promise.resolve({ status: 'ok', lines: [] }) });
            });

            await contextManager.expandContext('test.js', 0, 'before', 1);

            // Should have been true during the call
            expect(loadingStateDuringCall).toBe(true);
            
            // Should be false after the call completes
            expect(contextManager.isContextLoading('test.js', 0, 'before')).toBe(false);
        });
    });
});

// Integration tests with dependency injection
describe('ContextManager Integration', () => {
    test('should work correctly with dependency injection setup', () => {
        const contextManager = createContextManager();
        const mockGroups = { test: { files: [] } };
        const mockSaveCallback = jest.fn();

        contextManager._setGroupsReference(mockGroups);
        contextManager._setSaveStateCallback(mockSaveCallback);

        // These should not throw errors
        expect(() => contextManager.canExpandContext('test.js', 0, 'before')).not.toThrow();
        expect(() => contextManager.isContextLoading('test.js', 0, 'before')).not.toThrow();
    });
});