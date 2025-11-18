/**
 * Tests for diffStore
 */

import diffStore from '../../../src/difflicious/static/js/stores/diffStore.js';

describe('diffStore', () => {
    beforeEach(() => {
        // Reset store state
        diffStore.repositoryName = '';
        diffStore.expandedFiles = new Set();
        diffStore.expandedGroups = new Set(['untracked', 'unstaged', 'staged']);
        // Clear localStorage
        localStorage.clear();
        // Clear fetch mocks
        global.fetch = jest.fn();
    });

    describe('initialization', () => {
        it('should have correct initial state', () => {
            expect(diffStore.repositoryName).toBe('');
            expect(diffStore.expandedFiles).toBeInstanceOf(Set);
            expect(diffStore.expandedGroups).toBeInstanceOf(Set);
            expect(diffStore.expandedGroups.has('untracked')).toBe(true);
            expect(diffStore.expandedGroups.has('unstaged')).toBe(true);
            expect(diffStore.expandedGroups.has('staged')).toBe(true);
        });

        it('should compute storage key correctly', () => {
            diffStore.repositoryName = 'test-repo';
            expect(diffStore.storageKey).toBe('difflicious-test-repo');
        });

        it('should use default storage key when repository name is empty', () => {
            diffStore.repositoryName = '';
            expect(diffStore.storageKey).toBe('difflicious-default');
        });
    });

    describe('file expansion', () => {
        it('should check if file is expanded', () => {
            diffStore.expandedFiles.add('src/test.js');
            expect(diffStore.isFileExpanded('src/test.js')).toBe(true);
            expect(diffStore.isFileExpanded('src/other.js')).toBe(false);
        });

        it('should toggle file expansion', () => {
            const filePath = 'src/test.js';

            // Toggle on
            diffStore.toggleFile(filePath);
            expect(diffStore.expandedFiles.has(filePath)).toBe(true);

            // Toggle off
            diffStore.toggleFile(filePath);
            expect(diffStore.expandedFiles.has(filePath)).toBe(false);
        });

        it('should set file expanded state', () => {
            const filePath = 'src/test.js';

            diffStore.setFileExpanded(filePath, true);
            expect(diffStore.expandedFiles.has(filePath)).toBe(true);

            diffStore.setFileExpanded(filePath, false);
            expect(diffStore.expandedFiles.has(filePath)).toBe(false);
        });
    });

    describe('group expansion', () => {
        it('should check if group is expanded', () => {
            expect(diffStore.isGroupExpanded('staged')).toBe(true);
            expect(diffStore.isGroupExpanded('nonexistent')).toBe(false);
        });

        it('should toggle group expansion', () => {
            const groupKey = 'staged';

            // Toggle off
            diffStore.toggleGroup(groupKey);
            expect(diffStore.expandedGroups.has(groupKey)).toBe(false);

            // Toggle on
            diffStore.toggleGroup(groupKey);
            expect(diffStore.expandedGroups.has(groupKey)).toBe(true);
        });
    });

    describe('bulk operations', () => {
        it('should expand all files', () => {
            const files = ['src/test1.js', 'src/test2.js', 'src/test3.js'];

            diffStore.expandAll(files);

            files.forEach(file => {
                expect(diffStore.expandedFiles.has(file)).toBe(true);
            });
        });

        it('should collapse all files', () => {
            diffStore.expandedFiles.add('src/test1.js');
            diffStore.expandedFiles.add('src/test2.js');

            diffStore.collapseAll();

            expect(diffStore.expandedFiles.size).toBe(0);
        });
    });

    describe('persistence', () => {
        it('should save state to localStorage', () => {
            diffStore.repositoryName = 'test-repo';
            diffStore.expandedFiles.add('src/test.js');
            diffStore.expandedGroups.delete('untracked');

            diffStore.saveState();

            const saved = JSON.parse(localStorage.getItem('difflicious-test-repo'));
            expect(saved.repositoryName).toBe('test-repo');
            expect(saved.expandedFiles).toEqual(['src/test.js']);
            expect(saved.expandedGroups).toContain('unstaged');
            expect(saved.expandedGroups).toContain('staged');
            expect(saved.expandedGroups).not.toContain('untracked');
        });

        it('should restore state from localStorage', () => {
            const savedState = {
                repositoryName: 'test-repo',
                expandedFiles: ['src/test1.js', 'src/test2.js'],
                expandedGroups: ['staged'],
                lastUpdated: new Date().toISOString()
            };

            localStorage.setItem('difflicious-default', JSON.stringify(savedState));

            diffStore.restoreState();

            expect(diffStore.expandedFiles.has('src/test1.js')).toBe(true);
            expect(diffStore.expandedFiles.has('src/test2.js')).toBe(true);
            expect(diffStore.expandedGroups.has('staged')).toBe(true);
            expect(diffStore.expandedGroups.has('unstaged')).toBe(false);
        });

        it('should handle corrupt localStorage data gracefully', () => {
            localStorage.setItem('difflicious-default', 'invalid json');

            // Should not throw
            expect(() => diffStore.restoreState()).not.toThrow();

            // Should maintain default state
            expect(diffStore.expandedFiles.size).toBe(0);
        });
    });

    describe('initializeRepository', () => {
        it('should fetch repository name from API', async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve({
                        status: 'ok',
                        repository_name: 'my-repo'
                    })
                })
            );

            await diffStore.initializeRepository();

            expect(diffStore.repositoryName).toBe('my-repo');
            expect(fetch).toHaveBeenCalledWith('/api/status');
        });

        it('should handle API errors gracefully', async () => {
            global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

            // Should not throw
            await expect(diffStore.initializeRepository()).resolves.not.toThrow();

            // Repository name should remain empty
            expect(diffStore.repositoryName).toBe('');
        });

        it('should handle invalid API response', async () => {
            global.fetch = jest.fn(() =>
                Promise.resolve({
                    json: () => Promise.resolve({
                        status: 'error'
                    })
                })
            );

            await diffStore.initializeRepository();

            expect(diffStore.repositoryName).toBe('');
        });
    });
});
