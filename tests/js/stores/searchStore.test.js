/**
 * Tests for searchStore
 *
 * Note: These tests focus on state management. The applyFilenameFilter
 * function calls are tested in search.test.js. We avoid testing
 * implementation details here to keep tests maintainable.
 */

import searchStore from '../../../src/difflicious/static/js/stores/searchStore.js';

describe('searchStore', () => {
    beforeEach(() => {
        // Reset store state
        searchStore.query = '';
        searchStore.hiddenFilesCount = 0;

        // Mock DOM for hidden files counting
        document.querySelectorAll = jest.fn().mockReturnValue([]);
    });

    describe('initialization', () => {
        it('should have correct initial state', () => {
            expect(searchStore.query).toBe('');
            expect(searchStore.hiddenFilesCount).toBe(0);
        });

        it('should initialize without errors', () => {
            expect(() => searchStore.init()).not.toThrow();
        });
    });

    describe('query management', () => {
        it('should set query', () => {
            // Mock applyFilter to avoid DOM operations
            searchStore.applyFilter = jest.fn();

            searchStore.setQuery('test');
            expect(searchStore.query).toBe('test');
            expect(searchStore.applyFilter).toHaveBeenCalled();
        });

        it('should clear query and reset hidden count', () => {
            searchStore.query = 'test';
            searchStore.hiddenFilesCount = 5;

            // Mock DOM to prevent errors during clear
            document.querySelectorAll = jest.fn().mockReturnValue([]);

            searchStore.clear();

            expect(searchStore.query).toBe('');
            expect(searchStore.hiddenFilesCount).toBe(0);
        });
    });

    describe('hidden files count', () => {
        it('should set hidden count', () => {
            searchStore.setHiddenCount(3);
            expect(searchStore.hiddenFilesCount).toBe(3);
        });

        it('should return empty text when no files hidden', () => {
            searchStore.hiddenFilesCount = 0;
            expect(searchStore.hiddenCountText).toBe('');
        });

        it('should return singular text for one file', () => {
            searchStore.hiddenFilesCount = 1;
            expect(searchStore.hiddenCountText).toBe('1 file hidden by search');
        });

        it('should return plural text for multiple files', () => {
            searchStore.hiddenFilesCount = 5;
            expect(searchStore.hiddenCountText).toBe('5 files hidden by search');
        });
    });

    describe('computed properties', () => {
        it('should return false when search is not active', () => {
            searchStore.query = '';
            expect(searchStore.isActive).toBe(false);
        });

        it('should return true when search is active', () => {
            searchStore.query = 'test';
            expect(searchStore.isActive).toBe(true);
        });
    });
});
