/**
 * Tests for state persistence functionality in diff-interactions.js
 */

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => store[key] = value,
        removeItem: (key) => delete store[key],
        clear: () => store = {},
        get length() { return Object.keys(store).length; },
        key: (index) => Object.keys(store)[index] || null
    };
})();

global.localStorage = localStorageMock;

// Mock console to suppress debug output in tests
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// Set up DOM environment first
document.body.innerHTML = '';

// Set up global functions that the code expects
global.$ = (selector) => document.querySelector(selector);
global.$$ = (selector) => document.querySelectorAll(selector);

// Load the diff-interactions.js file
const fs = require('fs');
const path = require('path');
const diffInteractionsPath = path.join(__dirname, '../../src/difflicious/static/js/diff-interactions.js');
let diffInteractionsCode = fs.readFileSync(diffInteractionsPath, 'utf8');

// Modify the code to expose DiffState and other functions globally
diffInteractionsCode += `
// Expose functions for testing
if (typeof module !== 'undefined' && module.exports) {
    global.DiffState = DiffState;
    global.toggleFile = toggleFile;
    global.toggleGroup = toggleGroup;
} else {
    window.DiffState = DiffState;
    window.toggleFile = toggleFile;
    window.toggleGroup = toggleGroup;
}
`;

// Execute the code in the test environment
eval(diffInteractionsCode);

describe('DiffState persistence', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        
        // Reset fetch mock
        fetch.mockClear();
        
        // Reset DiffState
        DiffState.expandedFiles = new Set();
        DiffState.expandedGroups = new Set(['untracked', 'unstaged', 'staged']);
        DiffState.repositoryName = null;
        DiffState.storageKey = 'difflicious-state';
        
        // Mock DOM
        document.body.innerHTML = '';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Repository initialization', () => {
        it('should initialize with repository name from API', async () => {
            // Mock successful API response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'ok',
                    repository_name: 'test-repo'
                })
            });

            await DiffState.initializeRepository();

            expect(fetch).toHaveBeenCalledWith('/api/status');
            expect(DiffState.repositoryName).toBe('test-repo');
            expect(DiffState.storageKey).toBe('difflicious-test-repo');
        });

        it('should use fallback storage key when API fails', async () => {
            // Mock failed API response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'error'
                })
            });

            await DiffState.initializeRepository();

            expect(DiffState.repositoryName).toBeNull();
            expect(DiffState.storageKey).toBe('difflicious-state');
        });

        it('should handle API network errors gracefully', async () => {
            // Mock network error
            fetch.mockRejectedValueOnce(new Error('Network error'));

            await DiffState.initializeRepository();

            expect(DiffState.repositoryName).toBeNull();
            expect(DiffState.storageKey).toBe('difflicious-state');
        });
    });

    describe('State persistence', () => {
        beforeEach(async () => {
            // Set up initialized repository
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'ok',
                    repository_name: 'test-repo'
                })
            });
            await DiffState.initializeRepository();
        });

        it('should save expanded files and groups to localStorage', () => {
            DiffState.expandedFiles.add('file1.txt');
            DiffState.expandedFiles.add('file2.js');
            DiffState.expandedGroups.add('staged');
            DiffState.expandedGroups.delete('unstaged');

            DiffState.saveState();

            const savedData = JSON.parse(localStorage.getItem('difflicious-test-repo'));
            expect(savedData).toMatchObject({
                expandedFiles: ['file1.txt', 'file2.js'],
                expandedGroups: expect.arrayContaining(['staged']),
                repositoryName: 'test-repo'
            });
            expect(savedData.expandedGroups).not.toContain('unstaged');
            expect(savedData.lastUpdated).toBeDefined();
        });

        it('should restore state from localStorage', () => {
            // Set up saved state
            const savedState = {
                expandedFiles: ['restored-file1.py', 'restored-file2.html'],
                expandedGroups: ['untracked', 'staged'],
                repositoryName: 'test-repo',
                lastUpdated: '2023-01-01T00:00:00.000Z'
            };
            localStorage.setItem('difflicious-test-repo', JSON.stringify(savedState));

            // Mock complete DOM elements for restored files (including file elements with toggle icons)
            document.body.innerHTML = `
                <div data-file="restored-file1.py">
                    <span class="toggle-icon" data-expanded="false">▶</span>
                </div>
                <div data-file-content="restored-file1.py" style="display: none;"></div>
                <div data-file="restored-file2.html">
                    <span class="toggle-icon" data-expanded="false">▶</span>
                </div>
                <div data-file-content="restored-file2.html" style="display: none;"></div>
                <div data-file-content="other-file.txt" style="display: block;"></div>
                <div data-group="untracked">
                    <span class="toggle-icon" data-expanded="false">▶</span>
                </div>
                <div data-group-content="untracked" style="display: none;"></div>
                <div data-group="staged">
                    <span class="toggle-icon" data-expanded="false">▶</span>
                </div>
                <div data-group-content="staged" style="display: none;"></div>
            `;

            DiffState.restoreState();

            expect(DiffState.expandedFiles.has('restored-file1.py')).toBe(true);
            expect(DiffState.expandedFiles.has('restored-file2.html')).toBe(true);
            expect(DiffState.expandedFiles.has('other-file.txt')).toBe(true); // From server state
            expect(DiffState.expandedGroups).toEqual(new Set(['untracked', 'staged']));
            
            // Check that visual state was applied
            expect(document.querySelector('[data-file-content="restored-file1.py"]').style.display).toBe('block');
            expect(document.querySelector('[data-file="restored-file1.py"] .toggle-icon').textContent).toBe('▼');
        });

        it('should handle corrupted localStorage data gracefully', () => {
            // Set corrupted data
            localStorage.setItem('difflicious-test-repo', 'invalid-json');

            // Should not throw and should use defaults
            expect(() => DiffState.restoreState()).not.toThrow();
            
            expect(DiffState.expandedGroups).toEqual(new Set(['untracked', 'unstaged', 'staged']));
        });

        it('should prioritize server state over localStorage for visible files', () => {
            // Set up saved state
            const savedState = {
                expandedFiles: ['file1.txt'],
                expandedGroups: ['staged'],
                repositoryName: 'test-repo'
            };
            localStorage.setItem('difflicious-test-repo', JSON.stringify(savedState));

            // Mock DOM where server shows file2 as visible, not file1
            // Include complete DOM structure for file1 so it can be restored from localStorage
            document.body.innerHTML = `
                <div data-file="file1.txt">
                    <span class="toggle-icon" data-expanded="false">▶</span>
                </div>
                <div data-file-content="file1.txt" style="display: none;"></div>
                <div data-file-content="file2.txt" style="display: block;"></div>
            `;

            DiffState.restoreState();

            // file2 should be marked expanded due to server state
            // file1 should be added from localStorage (if DOM elements exist)
            expect(DiffState.expandedFiles.has('file1.txt')).toBe(true);
            expect(DiffState.expandedFiles.has('file2.txt')).toBe(true);
        });
    });

    describe('Repository-specific isolation', () => {
        it('should maintain separate state for different repositories', async () => {
            // Set up first repository
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'ok',
                    repository_name: 'repo1'
                })
            });
            await DiffState.initializeRepository();
            
            DiffState.expandedFiles.add('repo1-file.txt');
            DiffState.saveState();

            // Switch to second repository
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'ok',
                    repository_name: 'repo2'
                })
            });
            await DiffState.initializeRepository();
            
            DiffState.expandedFiles.add('repo2-file.txt');
            DiffState.saveState();

            // Check that both states are stored separately
            const repo1State = JSON.parse(localStorage.getItem('difflicious-repo1'));
            const repo2State = JSON.parse(localStorage.getItem('difflicious-repo2'));

            expect(repo1State.expandedFiles).toContain('repo1-file.txt');
            expect(repo1State.expandedFiles).not.toContain('repo2-file.txt');
            
            expect(repo2State.expandedFiles).toContain('repo2-file.txt');
            expect(repo2State.expandedFiles).toContain('repo1-file.txt'); // From before switching
        });
    });

    describe('Integration with toggle functions', () => {
        beforeEach(async () => {
            // Set up initialized repository
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    status: 'ok',
                    repository_name: 'test-repo'
                })
            });
            await DiffState.initializeRepository();
        });

        it('should save state when file is toggled', () => {
            // Mock DOM elements for file toggle
            document.body.innerHTML = `
                <div data-file="test-file.js">
                    <span class="toggle-icon" data-expanded="false">▶</span>
                </div>
                <div data-file-content="test-file.js" style="display: none;"></div>
            `;

            // Ensure we can find elements with $ function
            const fileElement = document.querySelector('[data-file="test-file.js"]');
            const contentElement = document.querySelector('[data-file-content="test-file.js"]');
            const toggleIcon = fileElement.querySelector('.toggle-icon');

            expect(fileElement).toBeTruthy();
            expect(contentElement).toBeTruthy();
            expect(toggleIcon).toBeTruthy();

            // Call toggleFile
            toggleFile('test-file.js');

            // Check that state was updated and saved
            expect(DiffState.expandedFiles.has('test-file.js')).toBe(true);
            
            const savedState = JSON.parse(localStorage.getItem('difflicious-test-repo'));
            expect(savedState.expandedFiles).toContain('test-file.js');
        });

        it('should save state when group is toggled', () => {
            // Mock DOM elements for group toggle
            document.body.innerHTML = `
                <div data-group="staged">
                    <span class="toggle-icon" data-expanded="true">▼</span>
                </div>
                <div data-group-content="staged" style="display: block;"></div>
            `;

            // Call toggleGroup
            toggleGroup('staged');

            // Check that state was updated and saved
            expect(DiffState.expandedGroups.has('staged')).toBe(false);
            
            const savedState = JSON.parse(localStorage.getItem('difflicious-test-repo'));
            expect(savedState.expandedGroups).not.toContain('staged');
        });
    });
});