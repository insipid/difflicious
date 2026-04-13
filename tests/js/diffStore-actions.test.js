/**
 * Tests for diffStore action methods added in PR5.
 */

const mockExpandContext = jest.fn();
const mockLoadFullDiff = jest.fn();
const mockLoadMovedFileContent = jest.fn();
const mockNavigateToPreviousFile = jest.fn();
const mockNavigateToNextFile = jest.fn();

jest.unstable_mockModule('../../src/difflicious/static/js/modules/context-expansion.js', () => ({
    expandContext: mockExpandContext,
    setDebug: jest.fn(),
    updateHunkRangeAfterExpansion: jest.fn(),
}));
jest.unstable_mockModule('../../src/difflicious/static/js/modules/full-diff.js', () => ({
    loadFullDiff: mockLoadFullDiff,
    loadMovedFileContent: mockLoadMovedFileContent,
    renderFullDiff: jest.fn(),
    renderSideBySideHunk: jest.fn(),
    renderSideBySideLine: jest.fn(),
}));
jest.unstable_mockModule('../../src/difflicious/static/js/modules/navigation.js', () => ({
    navigateToPreviousFile: mockNavigateToPreviousFile,
    navigateToNextFile: mockNavigateToNextFile,
}));

const { default: diffStore } = await import('../../src/difflicious/static/js/stores/diffStore.js');

describe('diffStore action methods', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('expandContext reads data-* from element and delegates', () => {
        const el = document.createElement('button');
        el.dataset.filePath = 'src/foo.py';
        el.dataset.hunkIndex = '2';
        el.dataset.direction = 'before';

        diffStore.expandContext(el);

        expect(mockExpandContext).toHaveBeenCalledWith(
            el, 'src/foo.py', 2, 'before', 10, 'pygments'
        );
    });

    test('loadFullDiff reads data-* from element and delegates', () => {
        const el = document.createElement('span');
        el.dataset.filePath = 'src/foo.py';
        el.dataset.fileId = 'unstaged:src/foo.py';

        diffStore.loadFullDiff(el);

        expect(mockLoadFullDiff).toHaveBeenCalledWith('src/foo.py', 'unstaged:src/foo.py');
    });

    test('loadMovedFileContent passes element directly', () => {
        const el = document.createElement('button');

        diffStore.loadMovedFileContent(el);

        expect(mockLoadMovedFileContent).toHaveBeenCalledWith(el);
    });

    test('navigateToPreviousFile reads data-file-id from element', () => {
        const el = document.createElement('button');
        el.dataset.fileId = 'unstaged:src/foo.py';

        diffStore.navigateToPreviousFile(el);

        expect(mockNavigateToPreviousFile).toHaveBeenCalledWith('unstaged:src/foo.py');
    });

    test('navigateToNextFile reads data-file-id from element', () => {
        const el = document.createElement('button');
        el.dataset.fileId = 'unstaged:src/foo.py';

        diffStore.navigateToNextFile(el);

        expect(mockNavigateToNextFile).toHaveBeenCalledWith('unstaged:src/foo.py');
    });
});
