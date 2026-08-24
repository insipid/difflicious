import navStore from '../../../src/difflicious/static/js/stores/navStore.js';

/**
 * jsdom lays nothing out, so offsetParent is null for every element. The store
 * uses it to skip files hidden by the group toggles or the search filter, so
 * these tests stub it per element to describe visibility explicitly.
 */
function addToolbar(height = 52) {
    const bar = document.createElement('header');
    bar.className = 'app-toolbar';
    bar.getBoundingClientRect = () => ({ height });
    document.body.appendChild(bar);
    return bar;
}

/**
 * Wrap files in a rendered group, the way diff_groups.html does.
 * @param {string} label - Heading text, e.g. "Staged" or "Changes vs trunk"
 * @returns {HTMLElement} The group element to add files into
 */
function addGroup(label) {
    const group = document.createElement('div');
    group.className = 'diff-group';
    group.innerHTML = `<h3 class="diff-group-header-label">${label}</h3>`;
    document.body.appendChild(group);
    return group;
}

function addFile(id, { visible = true, headerTop = 500, parent = null } = {}) {
    const el = document.createElement('div');
    el.dataset.file = id;
    el.innerHTML = '<div class="file-header-wrapper"></div>';
    (parent || document.body).appendChild(el);

    const header = el.querySelector('.file-header-wrapper');
    Object.defineProperty(el, 'offsetParent', { value: visible ? document.body : null });
    Object.defineProperty(header, 'offsetParent', { value: visible ? document.body : null });
    header.getBoundingClientRect = () => ({ top: headerTop });
    el.scrollIntoView = jest.fn();
    return el;
}

describe('navStore', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        navStore.files = [];
        navStore.fileGroups = [];
        navStore.currentFile = '';
        window.matchMedia = jest.fn(() => ({ matches: false }));
        window.scrollTo = jest.fn();
    });

    describe('rebuild', () => {
        test('lists the visible files in document order', () => {
            addFile('staged:one.py');
            addFile('staged:two.py');

            navStore.rebuild();

            expect(navStore.files.map((f) => f.id)).toEqual(['staged:one.py', 'staged:two.py']);
        });

        test('omits files hidden by a filter or a collapsed group', () => {
            addFile('staged:shown.py');
            addFile('staged:hidden.py', { visible: false });

            navStore.rebuild();

            expect(navStore.files.map((f) => f.id)).toEqual(['staged:shown.py']);
        });

        test('strips the group prefix for the label', () => {
            addFile('untracked:src/deep/file.py');

            navStore.rebuild();

            expect(navStore.files[0].label).toBe('src/deep/file.py');
        });

        test('mirrors the page grouping, keeping same-named files apart', () => {
            const staged = addGroup('Staged');
            const unstaged = addGroup('Unstaged');
            addFile('staged:same.py', { parent: staged });
            addFile('unstaged:same.py', { parent: unstaged });

            navStore.rebuild();

            expect(navStore.fileGroups.map((g) => g.label)).toEqual(['Staged', 'Unstaged']);
            expect(navStore.fileGroups[0].files.map((f) => f.id)).toEqual(['staged:same.py']);
            expect(navStore.fileGroups[1].files.map((f) => f.id)).toEqual(['unstaged:same.py']);
        });

        test('uses the rendered heading, so the compared ref shows through', () => {
            const changes = addGroup('Changes vs trunk');
            addFile('changes:a.py', { parent: changes });

            navStore.rebuild();

            expect(navStore.fileGroups[0].label).toBe('Changes vs trunk');
        });

        test('falls back to a single unlabelled group when files are not grouped', () => {
            addFile('changes:a.py');

            navStore.rebuild();

            expect(navStore.fileGroups).toHaveLength(1);
            expect(navStore.fileGroups[0].label).toBe('');
        });

        test('drops a selection that has been filtered away', () => {
            addFile('staged:gone.py');
            navStore.rebuild();
            navStore.currentFile = 'staged:gone.py';

            document.body.innerHTML = '';
            addFile('staged:other.py');
            navStore.rebuild();

            expect(navStore.currentFile).toBe('staged:other.py');
        });
    });

    describe('updateCurrentFile', () => {
        test('selects the last header that has reached the toolbar', () => {
            addToolbar(52);
            addFile('staged:above.py', { headerTop: -200 });
            addFile('staged:pinned.py', { headerTop: 40 }); // under the 52px bar
            addFile('staged:below.py', { headerTop: 600 });

            navStore.updateCurrentFile();

            expect(navStore.currentFile).toBe('staged:pinned.py');
        });

        test('falls back to the first file when none has reached the top', () => {
            addToolbar(52);
            addFile('staged:first.py', { headerTop: 400 });
            addFile('staged:second.py', { headerTop: 900 });

            navStore.updateCurrentFile();

            expect(navStore.currentFile).toBe('staged:first.py');
        });

        test('does nothing when no files are rendered', () => {
            navStore.currentFile = 'kept';

            navStore.updateCurrentFile();

            expect(navStore.currentFile).toBe('kept');
        });
    });

    describe('jumping', () => {
        test('jumpToFile scrolls the matching file into view', () => {
            const el = addFile('staged:target.py');

            navStore.jumpToFile('staged:target.py');

            expect(el.scrollIntoView).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'start'
            });
        });

        test('jumpToFile ignores an unknown id', () => {
            addFile('staged:target.py');

            expect(() => navStore.jumpToFile('staged:missing.py')).not.toThrow();
        });

        test('jumpToTop scrolls to the document start', () => {
            navStore.jumpToTop();

            expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
        });

        test('honours reduced motion', () => {
            window.matchMedia = jest.fn(() => ({ matches: true }));

            navStore.jumpToTop();

            expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
        });
    });
});
