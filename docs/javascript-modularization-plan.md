# JavaScript Modularization Plan

**Date:** 2025-11-17
**Status:** Implemented (2026-02-06)
**Objective:** Split `diff-interactions.js` (1,661 lines) into focused, testable modules
**Reference:** Section 3.1 of `docs/reports/2025-11-17-codebase-improvements-analysis.md`

## Status Update (2026-02-06)

- The modularization has been completed with ES6 modules in
  `src/difflicious/static/js/modules/`.
- The legacy monolithic file was archived to
  `docs/reference/diff-interactions.js.reference`.
- `src/difflicious/static/js/main.js` coordinates module initialization.

## Current State Analysis (Historical)

The original `diff-interactions.js` file contained multiple responsibilities:
- State management (DiffState object - 226 lines)
- File/group toggle operations (141 lines)
- Navigation functions (19 lines)
- Context expansion logic (~710 lines - **COMPLEX**)
- Search and filtering (102 lines)
- Full diff loading and rendering (321 lines)
- Theme switching (75 lines)
- DOM initialization and global exports (67 lines)

**Total:** 1,661 lines in a single file

## Proposed Module Structure

### 1. `state.js` - State Management
**Lines:** ~150
**Responsibilities:**
- DiffState object definition
- Repository initialization
- State restoration from localStorage
- State saving to localStorage
- Search hotkey installation
- Live search filter installation

**Exports:**
```javascript
export const DiffState = {
    expandedFiles: Set,
    expandedGroups: Set,
    repositoryName: string,
    storageKey: string,
    theme: string,
    init(): Promise<void>,
    initializeRepository(): Promise<void>,
    restoreState(): void,
    saveState(): void,
    installSearchHotkeys(): void,
    installLiveSearchFilter(): void,
    bindEventListeners(): void
}
```

**Tests:** `tests/js/state.test.js`
- Repository initialization
- State persistence
- State restoration
- Repository-specific isolation (existing tests can be migrated)

---

### 2. `dom-utils.js` - DOM Manipulation Helpers
**Lines:** ~30
**Responsibilities:**
- Common DOM query functions
- HTML escaping utilities
- Element visibility helpers

**Exports:**
```javascript
export const $ = (selector) => HTMLElement | null
export const $$ = (selector) => NodeList
export function escapeHtml(text: string): string
export function escapeRegExp(text: string): string
```

**Tests:** `tests/js/dom-utils.test.js`
- Element selection
- HTML escaping
- RegExp escaping

---

### 3. `file-operations.js` - File and Group Toggle Operations
**Lines:** ~140
**Responsibilities:**
- Toggle individual files
- Toggle groups
- Expand all files
- Collapse all files

**Exports:**
```javascript
export function toggleFile(filePath: string): void
export function toggleGroup(groupKey: string): void
export function expandAllFiles(): void
export function collapseAllFiles(): void
```

**Tests:** `tests/js/file-operations.test.js`
- File toggle functionality
- Group toggle functionality
- Expand/collapse all
- Integration with state persistence

---

### 4. `navigation.js` - File Navigation
**Lines:** ~20
**Responsibilities:**
- Navigate to previous file
- Navigate to next file

**Exports:**
```javascript
export function navigateToPreviousFile(currentFilePath: string): void
export function navigateToNextFile(currentFilePath: string): void
```

**Tests:** `tests/js/navigation.test.js`
- Previous file navigation
- Next file navigation
- Edge cases (first/last file)

---

### 5. `context-expansion.js` - Context Expansion Logic (COMPLEX)
**Lines:** ~400
**Responsibilities:**
- Main context expansion function
- Post-expansion logic handling
- Hunk context retrieval
- Data attribute updates

**Exports:**
```javascript
export async function expandContext(
    button: HTMLElement,
    filePath: string,
    hunkIndex: number,
    direction: 'before' | 'after',
    contextLines?: number,
    format?: string
): Promise<void>

export function hunkContext(button: HTMLElement): HunkContext | null
export function updateHunkLinesDataAttributes(button, direction, linesAdded): void
export function updateHunkRangeAfterExpansion(button, targetStart, targetEnd): void
```

**Tests:** `tests/js/context-expansion.test.js`
- Context expansion API call
- Direction handling (before/after)
- Button state updates
- Data attribute updates
- Error handling

---

### 6. `context-expansion-ui.js` - Context Expansion UI Logic
**Lines:** ~300
**Responsibilities:**
- HTML creation for expanded context (Pygments and plain)
- DOM insertion logic
- Button visibility management
- Expansion bar management

**Exports:**
```javascript
export function createExpandedContextHtml(result, expansionId, triggerButton, direction): string
export function createPlainContextHtml(result, expansionId, triggerButton, direction): string
export function insertExpandedContext(button, filePath, hunkIndex, direction, expandedHtml): void
export function injectPygmentsCss(cssStyles: string): void
export function hideExpansionBarIfAllButtonsHidden(triggerButton): void
export function hideAllExpansionButtonsInHunk(triggerButton): void
```

**Tests:** `tests/js/context-expansion-ui.test.js`
- HTML generation for Pygments format
- HTML generation for plain format
- DOM insertion
- Button hiding logic
- CSS injection

---

### 7. `hunk-operations.js` - Hunk Management
**Lines:** ~150
**Responsibilities:**
- Hunk adjacency checking
- Button update logic for next expansion
- Hunk merging detection and execution

**Exports:**
```javascript
export function checkHunkAdjacency(button, direction, targetStart, targetEnd): boolean
export function handleButtonHiding(button, direction, targetStart, targetEnd): void
export function updateButtonForNextExpansion(button, direction, targetStart, targetEnd, contextLines, originalText): void
export function checkAndMergeHunks(triggerButton): void
export function mergeHunks(firstHunk, secondHunk): void
export function handlePostExpansionLogic(button, result, contextLines, targetStart, targetEnd, direction, originalText): void
```

**Tests:** `tests/js/hunk-operations.test.js`
- Adjacency detection
- Button hiding logic
- Hunk merging
- Edge cases (file boundaries)

---

### 8. `search.js` - File Search and Filtering
**Lines:** ~100
**Responsibilities:**
- Build search regex
- Apply filename filter
- Manage hidden files banner

**Exports:**
```javascript
export function buildSearchRegex(query: string): RegExp | null
export function applyFilenameFilter(query: string): void
export function upsertHiddenBanner(hiddenCount: number): void
```

**Tests:** `tests/js/search.test.js`
- Regex building (case sensitivity, token splitting)
- File filtering
- Hidden count banner
- Group visibility updates

---

### 9. `full-diff.js` - Full Diff Loading and Rendering
**Lines:** ~320
**Responsibilities:**
- Load full diff from API
- Render full diff content
- Side-by-side hunk rendering
- Side-by-side line rendering

**Exports:**
```javascript
export async function loadFullDiff(filePath: string, fileId: string): Promise<void>
export async function renderFullDiff(contentElement, diffData, fileId): Promise<void>
export function renderSideBySideHunk(hunk, filePath, hunkIndex): string
export function renderSideBySideLine(line): string
export function isHighlightedContent(content: string): boolean
```

**Tests:** `tests/js/full-diff.test.js`
- Full diff API call
- Diff rendering (parsed data)
- Diff rendering (raw fallback)
- Side-by-side format
- Error handling
- Loading states

---

### 10. `theme.js` - Theme Management
**Lines:** ~75
**Responsibilities:**
- Theme toggling
- Theme initialization
- System preference detection
- Theme persistence

**Exports:**
```javascript
export function toggleTheme(): boolean
export function initializeTheme(): void
```

**Tests:** `tests/js/theme.test.js`
- Theme toggle
- Theme persistence
- System preference detection
- Theme initialization

---

### 11. `main.js` - Application Entry Point
**Lines:** ~80
**Responsibilities:**
- Initialize all modules
- Set up DOM event listeners
- Export global functions for HTML onclick handlers
- Coordinate module initialization

**Exports:**
```javascript
// Window exports for HTML onclick handlers
window.toggleFile
window.toggleGroup
window.expandAllFiles
window.collapseAllFiles
window.navigateToPreviousFile
window.navigateToNextFile
window.expandContext
window.toggleTheme
window.loadFullDiff
```

**Tests:** `tests/js/main.test.js`
- Application initialization
- Global function registration
- DOMContentLoaded handling

---

## Implementation Strategy

### Phase 1: Create Module Structure
1. Create all module files with basic structure
2. Extract utility functions first (dom-utils.js)
3. Move simple modules (navigation.js, theme.js)
4. Extract state management (state.js)

### Phase 2: Split Complex Logic
5. Extract search functionality (search.js)
6. Extract file operations (file-operations.js)
7. Extract full diff logic (full-diff.js)
8. Split context expansion into two modules:
   - context-expansion.js (API and core logic)
   - context-expansion-ui.js (HTML generation and DOM manipulation)
9. Extract hunk operations (hunk-operations.js)

### Phase 3: Create Entry Point
10. Create main.js to coordinate everything
11. Update HTML template script tags

### Phase 4: Testing
12. Migrate existing tests from diff-state-persistence.test.js to state.test.js
13. Create new test files for each module
14. Ensure minimum 80% test coverage

### Phase 5: Integration
15. Update HTML templates to load modules instead of monolithic file
16. Run manual testing
17. Run ci-licious to ensure CI passes

---

## Module Dependencies

```
main.js
├── dom-utils.js (no dependencies)
├── state.js
│   └── dom-utils.js
├── file-operations.js
│   ├── dom-utils.js
│   └── state.js
├── navigation.js
│   └── dom-utils.js
├── theme.js
│   ├── dom-utils.js
│   └── state.js
├── search.js
│   └── dom-utils.js
├── context-expansion.js
│   ├── dom-utils.js
│   ├── context-expansion-ui.js
│   └── hunk-operations.js
├── context-expansion-ui.js
│   ├── dom-utils.js
│   └── hunk-operations.js
├── hunk-operations.js
│   └── dom-utils.js
└── full-diff.js
    └── dom-utils.js
```

---

## Breaking Changes

### None Expected
- All window.* exports will remain the same
- HTML onclick handlers will continue to work
- State persistence will be maintained

---

## Testing Strategy

### Unit Tests (Per Module)
Each module will have comprehensive unit tests covering:
- All exported functions
- Edge cases and error conditions
- Integration with dependencies

### Integration Tests
- Test full workflow: state initialization → file toggle → context expansion
- Test theme switching with state persistence
- Test search with file operations

### Test Coverage Goals
- Overall: >80%
- Per module: >75%
- Critical modules (context-expansion, state): >90%

---

## Success Criteria

1. ✅ All 1,661 lines split into <400 line modules
2. ✅ Each module has single, clear responsibility
3. ✅ Comprehensive test suite (>80% coverage)
4. ✅ All existing functionality preserved
5. ✅ CI passes (ci-licious script)
6. ✅ No breaking changes to HTML templates
7. ✅ Improved maintainability and readability

---

## Timeline Estimate

- **Phase 1:** 3-4 hours (module structure + utilities)
- **Phase 2:** 5-6 hours (complex logic extraction)
- **Phase 3:** 1-2 hours (entry point creation)
- **Phase 4:** 6-8 hours (comprehensive testing)
- **Phase 5:** 2-3 hours (integration and CI verification)

**Total:** 17-23 hours

---

## Rollback Plan

If any issues arise:
1. All changes are on feature branch
2. Original diff-interactions.js is preserved
3. Can revert HTML template changes
4. No database or backend changes required

---

## Future Enhancements (Post-Refactoring)

1. Convert modules to TypeScript for better type safety
2. Add JSDoc comments for better IDE support
3. Consider using a module bundler (Rollup/esbuild) for production
4. Implement proper state management library (Alpine.js properly or lightweight Redux)
5. Add E2E tests with Playwright/Cypress
