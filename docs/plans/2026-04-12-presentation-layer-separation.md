# Presentation Layer Separation — Implementation Plan

**Goal:** Enforce four explicit contracts between the data, service, template, CSS, and JS layers so each layer can be changed independently without touching the others.

**Architecture:** Server renders structure and data as HTML with `data-*` attributes; client owns all interactivity via Alpine stores (single state system). Templates use only semantic CSS class names; all colour lives in `styles.css` variables.

**Tech Stack:** Python/Flask, Jinja2, Alpine.js, Tailwind CSS, vanilla ES6 modules, pytest, Jest

**Spec:** `docs/presentation-layer-separation.md`

**Verification command (run after every PR):** `./cilicious.sh`

---

## PR 1 — Add semantic CSS classes

Purely additive. No other files change. Establishes the vocabulary used by later PRs.

### Task 1: Add diff-line semantic classes to styles.css

**Files:**
- Modify: `src/difflicious/static/css/styles.css`

- [ ] **Step 1: Add semantic diff-line classes after the existing `.status-badge` block**

Find the end of the existing component classes section in `styles.css` (search for `.file-stat`) and append the following block after it:

```css
/* ============================================
 * SEMANTIC DIFF COMPONENT CLASSES (PR1)
 * ============================================
 * Use these in templates instead of raw Tailwind colour utilities.
 * All colours come from CSS variables — never hardcode hex values here.
 */

/* Diff line: deletion (left side, red) */
.diff-line-deleted {
    background: var(--diff-deletion-bg);
}
.diff-line-deleted-num {
    background: var(--diff-deletion-linenum-bg);
    color: var(--text-tertiary);
}
.diff-line-deleted-gutter {
    color: var(--diff-deletion-text);
}

/* Diff line: addition (right side, green) */
.diff-line-added {
    background: var(--diff-addition-bg);
}
.diff-line-added-num {
    background: var(--diff-addition-linenum-bg);
    color: var(--text-tertiary);
}
.diff-line-added-gutter {
    color: var(--diff-addition-text);
}

/* Hunk expansion strip (the blue ▲▼ bar between hunks) */
.hunk-expansion-strip {
    background: var(--info-bg-50);
    color: var(--info-text-800);
    border-color: var(--border-default);
}
.hunk-expansion-linenum {
    background: var(--info-bg-100);
    border-color: var(--border-default);
}
.hunk-expansion-btn {
    background: var(--info-bg-200);
    color: var(--info-text-800);
}
.hunk-expansion-btn:hover {
    background: var(--info-bg-300);
}

/* File card (the rounded container per file) */
.file-card {
    background: var(--surface-secondary);
    border: 1px solid var(--border-default);
    border-radius: 0.5rem;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
}
.file-card-header {
    color: var(--text-primary);
}
.file-card-header:hover {
    background: var(--surface-secondary);
}
.file-card-nav-btn {
    color: var(--text-tertiary);
    border-radius: 0.25rem;
    transition: color 0.15s, background 0.15s;
}
.file-card-nav-btn:hover {
    color: var(--text-secondary);
    background: var(--surface-tertiary);
}

/* Global controls (expand all / collapse all) */
.global-controls-btn {
    background: var(--surface-tertiary);
    color: var(--text-secondary);
    border-radius: 0.375rem;
    transition: background 0.15s;
}
.global-controls-btn:hover {
    background: var(--surface-tertiary);
    filter: brightness(0.95);
}
.global-controls-btn:disabled {
    background: var(--surface-secondary);
    color: var(--text-disabled);
    cursor: not-allowed;
}

/* Diff group header */
.diff-group-header {
    color: var(--text-secondary);
    border-color: var(--border-default);
}
.diff-group-header:hover {
    background: var(--surface-tertiary);
}
.diff-group-header-label {
    color: var(--text-primary);
}
.diff-group-header-count {
    background: var(--surface-tertiary);
    color: var(--text-secondary);
    border-radius: 9999px;
    font-size: 0.75rem;
    padding: 0.1rem 0.5rem;
}

/* Moved-file expansion strip */
.moved-file-strip {
    background: var(--info-bg-50);
    color: var(--info-text-800);
}
```

- [ ] **Step 2: Verify CSS variables referenced above exist**

Run a quick grep to confirm the variable names are defined:

```bash
grep -E "^\s+--diff-deletion-bg|--diff-addition-bg|--info-bg-50|--info-text-800|--surface-secondary|--text-tertiary|--border-default" src/difflicious/static/css/styles.css | head -20
```

Expected: at least 8 matches. If a variable name is missing, adjust the class definition to use a variable that IS present (check `styles.css` lines 18–250 for the full list).

- [ ] **Step 3: Rebuild Tailwind**

```bash
pnpm run tailwind:build
```

Expected: exits 0, `src/difflicious/static/css/tailwind.css` updated.

- [ ] **Step 4: Run quality checks**

```bash
./cilicious.sh
```

Expected: all checks pass. CSS changes are additive so no existing tests should break.

- [ ] **Step 5: Commit**

```bash
git add src/difflicious/static/css/styles.css src/difflicious/static/css/tailwind.css
git commit -m "style: add semantic CSS component classes (Contract 3 vocab)"
```

---

## PR 2 — Clean up template_service.py

Removes server-side UI state computation. Adds file_id to service output.

### Task 2: Remove UI flags from template_service.py

**Files:**
- Modify: `src/difflicious/services/template_service.py`
- Modify: `src/difflicious/templates/diff_file.html`
- Modify: `tests/services/test_template_service.py`

- [ ] **Step 1: Write failing tests first**

Add these tests to `tests/services/test_template_service.py` (append to the class body):

```python
def test_enhanced_file_has_no_hidden_by_search_flag(self):
    """Service must not produce hidden_by_search — that is a client concern."""
    service = TemplateRenderingService()
    result = service._enhance_diff_data_for_template(
        {
            "unstaged": {
                "files": [{"path": "foo.py", "status": "modified", "hunks": []}],
                "count": 1,
            }
        },
        search_filter="bar",  # does NOT match "foo.py"
    )
    files = result["unstaged"]["files"]
    assert len(files) == 1
    assert "hidden_by_search" not in files[0]

def test_enhanced_file_has_no_expanded_flag(self):
    """Service must not produce expanded — initial UI state is a client concern."""
    service = TemplateRenderingService()
    result = service._enhance_diff_data_for_template(
        {
            "unstaged": {
                "files": [{"path": "foo.py", "status": "modified", "hunks": []}],
                "count": 1,
            }
        },
    )
    files = result["unstaged"]["files"]
    assert "expanded" not in files[0]

def test_enhanced_file_has_file_id(self):
    """Service must compute file_id for each file."""
    service = TemplateRenderingService()
    result = service._enhance_diff_data_for_template(
        {
            "unstaged": {
                "files": [{"path": "src/foo.py", "status": "modified", "hunks": []}],
                "count": 1,
            }
        },
    )
    files = result["unstaged"]["files"]
    assert files[0]["file_id"] == "unstaged:src/foo.py"

def test_group_has_no_hidden_by_search_flag(self):
    """Group-level hidden_by_search must not be produced."""
    service = TemplateRenderingService()
    result = service._enhance_diff_data_for_template(
        {
            "unstaged": {
                "files": [{"path": "foo.py", "status": "modified", "hunks": []}],
                "count": 1,
            }
        },
        search_filter="zzz",
    )
    assert "hidden_by_search" not in result["unstaged"]
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
uv run pytest tests/services/test_template_service.py -k "no_hidden_by_search or no_expanded or has_file_id or group_has_no" -v
```

Expected: 4 FAILs.

- [ ] **Step 3: Update `_enhance_diff_data_for_template` in template_service.py**

Replace the method signature and body. The key changes:
- Remove `search_filter` parameter (it still lives in `prepare_diff_data_for_template` for URL preservation, just never used for filtering now)
- Remove `expand_files` parameter
- Remove `matches_search` / `hidden_by_search` logic
- Remove `all_files_hidden` logic from groups
- Add `file_id` to each enhanced file

Current signature (line 148):
```python
def _enhance_diff_data_for_template(
    self,
    grouped_diffs: dict[str, Any],
    search_filter: Optional[str] = None,
    expand_files: bool = False,
) -> dict[str, Any]:
```

Replace with:
```python
def _enhance_diff_data_for_template(
    self,
    grouped_diffs: dict[str, Any],
    search_filter: Optional[str] = None,
) -> dict[str, Any]:
```

Replace the loop body (lines 158–201) with:
```python
enhanced_groups: dict[str, Any] = {}

for group_key, group_data in grouped_diffs.items():
    enhanced_files: list[dict[str, Any]] = []

    for file_data in group_data.get("files", []):
        enhanced_file = {
            **file_data,
            "file_id": f"{group_key}:{file_data.get('path', '')}",
        }

        if file_data.get("hunks"):
            enhanced_file["hunks"] = self._process_hunks_for_template(
                file_data["hunks"],
                file_data.get("path", ""),
                file_data.get("line_count"),
            )

        enhanced_files.append(enhanced_file)

    enhanced_groups[group_key] = {
        "files": enhanced_files,
        "count": len(enhanced_files),
    }

return enhanced_groups
```

Also update the call site in `prepare_diff_data_for_template` (line 111) — remove `expand_files`:
```python
enhanced_groups = self._enhance_diff_data_for_template(
    grouped_diffs, search_filter
)
```

And remove the `expand_files: bool = False` parameter from `prepare_diff_data_for_template`'s signature (line 42).

- [ ] **Step 4: Run the new tests to confirm they pass**

```bash
uv run pytest tests/services/test_template_service.py -k "no_hidden_by_search or no_expanded or has_file_id or group_has_no" -v
```

Expected: 4 PASSes.

- [ ] **Step 5: Update diff_file.html to use service-provided file_id**

In `src/difflicious/templates/diff_file.html`, remove line 2 (`{% set file_id = ... %}`):

**Remove:**
```jinja
{% set file_id = group_name + ":" + file.path %}
```

The template now receives `file.file_id` from the service. Replace every use of `file_id` with `file.file_id` in the template. There are four occurrences:

```jinja
{# line 4 - data-file attribute #}
data-file="{{ file.file_id }}"

{# line 6 - x-data Alpine component init #}
x-data="fileComponent('{{ file.file_id }}')"

{# line 7 - hidden_by_search style: REMOVE this attribute entirely #}
{# DELETE: {% if file.hidden_by_search %}style="display: none;"{% endif %} #}

{# line 23 - expand icon onclick (will be replaced in PR 5, but update the id now) #}
id="expand-icon-{{ file.file_id }}"

{# line 66 - navigate previous #}
onclick="navigateToPreviousFile('{{ file.file_id }}')"

{# line 71 - navigate next #}
onclick="navigateToNextFile('{{ file.file_id }}')"

{# line 82 - file content data attribute #}
data-file-content="{{ file.file_id }}"
```

Also remove the `hidden_by_search` style attribute on line 7 entirely (the client owns initial visibility now; Alpine's `x-show="isExpanded"` on the content div already handles this correctly).

- [ ] **Step 6: Run full quality checks**

```bash
./cilicious.sh
```

Expected: all checks pass. If any existing template_service tests assert on `hidden_by_search` or `expanded` keys, update them to assert those keys are absent.

- [ ] **Step 7: Commit**

```bash
git add src/difflicious/services/template_service.py \
        src/difflicious/templates/diff_file.html \
        tests/services/test_template_service.py
git commit -m "refactor: remove UI state from template_service (Contract 1)"
```

---

## PR 3 — Extract toolbar inline script

Moves the 120-line `<script>` block out of `toolbar.html` into a proper Alpine component module.

### Task 3: Create toolbar.js and wire it up

**Files:**
- Create: `src/difflicious/static/js/modules/toolbar.js`
- Modify: `src/difflicious/static/js/alpine-init.js`
- Modify: `src/difflicious/templates/partials/toolbar.html`

- [ ] **Step 1: Write a Jest test for toolbarComponent**

Create `tests/js/toolbar.test.js`:

```js
import { toolbarComponent } from '../../src/difflicious/static/js/modules/toolbar.js';

describe('toolbarComponent', () => {
    let comp;

    beforeEach(() => {
        document.body.innerHTML = `
            <div data-group="unstaged" style="display:none"></div>
            <div data-group="untracked" style="display:none"></div>
        `;
        comp = toolbarComponent(true, false); // unstaged=true, untracked=false
        comp.init();
    });

    test('init applies initial visibility', () => {
        const unstaged = document.querySelector('[data-group="unstaged"]');
        const untracked = document.querySelector('[data-group="untracked"]');
        expect(unstaged.style.display).toBe('');
        expect(untracked.style.display).toBe('none');
    });

    test('updateToggle changes state and updates DOM', () => {
        comp.updateToggle('untracked', true);
        expect(comp.untracked).toBe(true);
        const el = document.querySelector('[data-group="untracked"]');
        expect(el.style.display).toBe('');
    });

    test('scrubEmptySearch clears field name when blank', () => {
        document.body.innerHTML += '<form><input name="search" value="   "></form>';
        const form = document.querySelector('form');
        comp.scrubEmptySearch(form);
        expect(form.querySelector('[name="search"]')).toBeNull();
    });

    test('scrubEmptySearch leaves field name when value present', () => {
        document.body.innerHTML += '<form><input name="search" value="foo"></form>';
        const form = document.querySelector('form');
        comp.scrubEmptySearch(form);
        expect(form.querySelector('[name="search"]')).not.toBeNull();
    });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm run test:js -- --testPathPattern=toolbar
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create toolbar.js**

Create `src/difflicious/static/js/modules/toolbar.js`:

```js
/**
 * Toolbar Alpine component
 * Manages client-side visibility of unstaged/untracked groups
 * and form submission hygiene. Extracted from toolbar.html inline script.
 */

/**
 * @param {boolean} initialUnstaged - Server-rendered initial unstaged toggle state
 * @param {boolean} initialUntracked - Server-rendered initial untracked toggle state
 * @returns {object} Alpine component object
 */
export function toolbarComponent(initialUnstaged, initialUntracked) {
    return {
        unstaged: initialUnstaged,
        untracked: initialUntracked,

        init() {
            this.updateGroupVisibility();
        },

        updateToggle(name, checked) {
            this[name] = checked;
            this.updateGroupVisibility();
            this.updateURL();
        },

        updateGroupVisibility() {
            const unstagedGroup = document.querySelector('[data-group="unstaged"]');
            const untrackedGroup = document.querySelector('[data-group="untracked"]');
            if (unstagedGroup) unstagedGroup.style.display = this.unstaged ? '' : 'none';
            if (untrackedGroup) untrackedGroup.style.display = this.untracked ? '' : 'none';
        },

        updateURL() {
            const url = new URL(window.location.href);
            url.searchParams.set('unstaged', this.unstaged.toString());
            url.searchParams.set('untracked', this.untracked.toString());
            window.history.replaceState({}, '', url);
        },

        scrubEmptySearch(form) {
            const searchInput = form.querySelector('input[name="search"]');
            if (searchInput && (!searchInput.value || searchInput.value.trim() === '')) {
                searchInput.name = '';
            }
        },
    };
}

if (typeof window !== 'undefined') {
    window.toolbarComponent = toolbarComponent;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
pnpm run test:js -- --testPathPattern=toolbar
```

Expected: 4 PASSes.

- [ ] **Step 5: Register toolbarComponent in alpine-init.js**

Add the import and registration. In `src/difflicious/static/js/alpine-init.js`, add after the existing component imports:

```js
// Add at top with other component imports:
import { toolbarComponent } from './modules/toolbar.js';
```

And after the existing `window.hunkComponent = hunkComponent;` line:

```js
window.toolbarComponent = toolbarComponent;
```

- [ ] **Step 6: Update toolbar.html**

In `src/difflicious/templates/partials/toolbar.html`:

a) Add `x-data` to the `<header>` tag (line 2):
```html
<header x-data="toolbarComponent({{ unstaged|lower }}, {{ untracked|lower }})"
    class="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-600 px-4 py-3">
```

b) Change the form's `onsubmit` from calling the old inline function to the component method:
```html
<form method="GET" action="/" class="flex items-center space-x-2 flex-1"
    @submit="scrubEmptySearch($el)"
    id="diff-toolbar-form">
```

c) On each of the two `checkbox-control` checkboxes, replace the change handler. For the `untracked` checkbox:
```html
<input type="checkbox" name="untracked" value="true" {% if untracked %}checked{% endif %}
    @change.stop="updateToggle('untracked', $event.target.checked)"
    class="h-4 w-4 text-info-text-600 focus:ring-info-text-600 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded">
```

For the `unstaged` checkbox:
```html
<input type="checkbox" name="unstaged" value="true" {% if unstaged %}checked{% endif %}
    @change.stop="updateToggle('unstaged', $event.target.checked)"
    class="h-4 w-4 text-info-text-600 focus:ring-info-text-600 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded">
```

Remove the `checkbox-control` class from both — it was only needed by the old inline event listener.

d) Delete the entire `<script>` block (lines 117–238).

- [ ] **Step 7: Run quality checks**

```bash
./cilicious.sh
```

Expected: all checks pass. Manually verify in browser that unstaged/untracked toggles still work and the URL updates correctly.

- [ ] **Step 8: Commit**

```bash
git add src/difflicious/static/js/modules/toolbar.js \
        src/difflicious/static/js/alpine-init.js \
        src/difflicious/templates/partials/toolbar.html \
        tests/js/toolbar.test.js
git commit -m "refactor: extract toolbar inline script to toolbarComponent (Contract 2)"
```

---

## PR 4 — Replace Tailwind colour utilities with semantic classes

Uses the vocabulary from PR 1. Templates become colour-agnostic.

### Task 4: Swap colour utilities for semantic classes in all templates and full-diff.js

**Files:**
- Modify: `src/difflicious/templates/diff_hunk.html`
- Modify: `src/difflicious/templates/diff_file.html`
- Modify: `src/difflicious/templates/diff_groups.html`
- Modify: `src/difflicious/templates/partials/global_controls.html`
- Modify: `src/difflicious/templates/partials/loading_state.html`
- Modify: `src/difflicious/templates/partials/empty_state.html`
- Modify: `src/difflicious/static/js/modules/full-diff.js`

- [ ] **Step 1: Update diff_hunk.html — deletion line colours**

In `diff_hunk.html`, the line number cell for deletions (line 63):

**Before:**
```html
class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 dark:border-neutral-600 select-none {% if line.left and line.left.type == 'deletion' %}bg-red-50 dark:bg-red-900/20{% endif %}"
```

**After:**
```html
class="line-num w-12 px-2 py-1 text-right border-r select-none {% if line.left and line.left.type == 'deletion' %}diff-line-deleted-num{% else %}text-neutral-400 border-neutral-200 dark:border-neutral-600{% endif %}"
```

The line content cell for deletions (line 69):

**Before:**
```html
class="line-content flex-1 px-2 py-1 overflow-x-auto {% if line.left and line.left.type == 'deletion' %}bg-red-50 dark:bg-red-900/20{% endif %}"
```

**After:**
```html
class="line-content flex-1 px-2 py-1 overflow-x-auto {% if line.left and line.left.type == 'deletion' %}diff-line-deleted{% endif %}"
```

The deletion gutter symbol (line 71):

**Before:**
```html
<span class="text-danger-text-600">-</span>
```

**After:**
```html
<span class="diff-line-deleted-gutter">-</span>
```

- [ ] **Step 2: Update diff_hunk.html — addition line colours**

Addition line number (line 97):

**Before:**
```html
class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 dark:border-neutral-600 select-none {% if line.right and line.right.type == 'addition' %}bg-green-50 dark:bg-green-900/20{% endif %}"
```

**After:**
```html
class="line-num w-12 px-2 py-1 text-right border-r select-none {% if line.right and line.right.type == 'addition' %}diff-line-added-num{% else %}text-neutral-400 border-neutral-200 dark:border-neutral-600{% endif %}"
```

Addition line content (line 103):

**Before:**
```html
class="line-content flex-1 px-2 py-1 overflow-x-auto {% if line.right and line.right.type == 'addition' %}bg-green-50 dark:bg-green-900/20{% endif %}"
```

**After:**
```html
class="line-content flex-1 px-2 py-1 overflow-x-auto {% if line.right and line.right.type == 'addition' %}diff-line-added{% endif %}"
```

Addition gutter symbol (line 105):

**Before:**
```html
<span class="text-success-text-600">+</span>
```

**After:**
```html
<span class="diff-line-added-gutter">+</span>
```

- [ ] **Step 3: Update diff_hunk.html — hunk expansion strips**

The `hunk-expansion` div (lines 8 and 132):

**Before:**
```html
<div class="hunk-expansion bg-info-bg-50 text-xs font-mono text-info-text-800 border-b border-neutral-200 dark:border-neutral-600 flex">
```

**After:**
```html
<div class="hunk-expansion hunk-expansion-strip text-xs font-mono border-b flex">
```

Expansion line-number divs (lines 12, 36, 136, 154) — both `bg-info-bg-100` ones:

**Before:**
```html
<div class="w-12 bg-info-bg-100 border-r border-neutral-200 dark:border-neutral-600 select-none flex flex-col">
```

**After:**
```html
<div class="w-12 hunk-expansion-linenum border-r select-none flex flex-col">
```

Expansion buttons (lines 13, 37, 137, 155) — replace colour utilities:

**Before:**
```html
class="expansion-btn w-full px-2 py-1 text-xs bg-info-bg-200 hover:bg-info-bg-300 text-info-text-800 transition-colors flex items-center justify-center h-full"
```

**After:**
```html
class="expansion-btn w-full px-2 py-1 text-xs hunk-expansion-btn transition-colors flex items-center justify-center h-full"
```

- [ ] **Step 4: Update diff_file.html — deletion lines in full-deletion view**

In the `deleted-file-view` block (around line 156), the deletion line number:

**Before:**
```html
class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 dark:border-neutral-600 select-none bg-red-50 dark:bg-red-900/20"
```

**After:**
```html
class="line-num w-12 px-2 py-1 text-right border-r select-none diff-line-deleted-num"
```

Deletion line content (around line 159):

**Before:**
```html
class="line-content flex-1 px-2 py-1 overflow-x-auto bg-red-50 dark:bg-red-900/20"
```

**After:**
```html
class="line-content flex-1 px-2 py-1 overflow-x-auto diff-line-deleted"
```

- [ ] **Step 5: Update diff_file.html — moved-file strip**

The `moved-file-expansion` div (around line 95):

**Before:**
```html
<div class="moved-file-expansion bg-info-bg-50 text-xs font-mono text-info-text-800 flex">
```

**After:**
```html
<div class="moved-file-expansion moved-file-strip text-xs font-mono flex">
```

- [ ] **Step 6: Update diff_groups.html — group header**

In `src/difflicious/templates/diff_groups.html`, the group header element (around line 13):

**Before:**
```html
class="... hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-400 dark:text-neutral-500 ..."
```

**After:** replace the colour utilities with semantic classes:
```html
class="... diff-group-header ..."
```

The group label span:

**Before:**
```html
class="... text-neutral-700 dark:text-neutral-300 ..."
```

**After:**
```html
class="... diff-group-header-label ..."
```

The file count badge:

**Before:**
```html
class="... bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 ..."
```

**After:**
```html
class="diff-group-header-count"
```

- [ ] **Step 7: Update global_controls.html**

In `src/difflicious/templates/partials/global_controls.html`, replace both button class strings:

**Before:**
```html
class="... bg-neutral-100 ... text-neutral-700 ... hover:bg-neutral-200 ... disabled:bg-neutral-50 disabled:text-neutral-400 ..."
```

**After:**
```html
class="px-3 py-1 text-sm global-controls-btn"
```

- [ ] **Step 8: Update loading_state.html and empty_state.html**

`loading_state.html` — replace `border-info-text-600` and `text-neutral-600` with semantic tokens already in the CSS variable system (use `text-secondary` and `border-interactive` or equivalent — check `styles.css` for the right variable names):

**Before:**
```html
class="... border-info-text-600 ..."
class="... text-neutral-600 ..."
```

**After:**
```html
class="... border-info-text-600 ..."   {# keep — this is already a semantic custom token #}
class="... text-secondary ..."          {# or keep text-neutral-600 if no class exists yet #}
```

Note: `loading_state.html` and `empty_state.html` use a small number of colour tokens. For any token that is already a custom semantic Tailwind token (e.g. `text-danger-text-600`, `border-info-text-600`) — leave them as-is for now; they are mapped to CSS variables in the Tailwind config and are acceptable. Only replace `bg-red-50`, `bg-green-50`, `text-neutral-*`, `bg-neutral-*`, `border-neutral-*` that correspond to raw Tailwind palette colours.

- [ ] **Step 9: Update full-diff.js — generated HTML strings**

In `src/difflicious/static/js/modules/full-diff.js`, the `renderSideBySideLine` function builds HTML strings with hardcoded colour classes. Find and replace:

Search for `bg-red-50` — replace the class string:

**Before (around line 156):**
```js
const deletionClasses = 'bg-red-50 dark:bg-red-900/20';
```
or equivalent inline string.

**After:**
```js
const deletionClasses = 'diff-line-deleted';
```

Search for `bg-success-bg-50` or `bg-green-50` — addition classes:

**After:**
```js
const additionClasses = 'diff-line-added';
```

For any `text-danger-text-600` used as a gutter symbol colour in generated HTML:
```js
// Before:
`<span class="text-danger-text-600">-</span>`
// After:
`<span class="diff-line-deleted-gutter">-</span>`
```

For `text-success-text-600`:
```js
// Before:
`<span class="text-success-text-600">+</span>`
// After:
`<span class="diff-line-added-gutter">+</span>`
```

- [ ] **Step 10: Run quality checks**

```bash
./cilicious.sh
```

Expected: all checks pass. Visually verify the diff view looks identical in both light and dark mode.

- [ ] **Step 11: Commit**

```bash
git add src/difflicious/templates/ \
        src/difflicious/static/js/modules/full-diff.js
git commit -m "style: replace Tailwind colour utilities with semantic classes (Contract 3)"
```

---

## PR 5 — Replace template onclick strings with Alpine store directives

The largest Contract 2 change. Moves all template→JS wiring to `data-*` attributes and store methods.

### Task 5: Add action methods to diffStore.js

**Files:**
- Modify: `src/difflicious/static/js/stores/diffStore.js`

- [ ] **Step 1: Write failing Jest tests**

Create `tests/js/diffStore-actions.test.js`:

```js
/**
 * Tests for diffStore action methods added in PR5.
 * These test that the store methods read data-* attributes
 * and delegate to the right underlying modules.
 */

// Mock the modules that diffStore will delegate to
// jest.mock calls are hoisted — they must appear before the imports they affect
jest.mock('../../src/difflicious/static/js/modules/context-expansion.js', () => ({
    expandContext: jest.fn(),
}));
jest.mock('../../src/difflicious/static/js/modules/full-diff.js', () => ({
    loadFullDiff: jest.fn(),
    loadMovedFileContent: jest.fn(),
}));
jest.mock('../../src/difflicious/static/js/modules/navigation.js', () => ({
    navigateToPreviousFile: jest.fn(),
    navigateToNextFile: jest.fn(),
}));

// These imports happen after mocks are registered
const { default: diffStore } = await import('../../src/difflicious/static/js/stores/diffStore.js');
const { expandContext } = await import('../../src/difflicious/static/js/modules/context-expansion.js');
const { loadFullDiff } = await import('../../src/difflicious/static/js/modules/full-diff.js');
const { navigateToPreviousFile, navigateToNextFile } = await import('../../src/difflicious/static/js/modules/navigation.js');

describe('diffStore action methods', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.Alpine = { store: jest.fn() };
    });

    test('expandContext reads data-* from element and delegates', () => {
        const el = document.createElement('button');
        el.dataset.filePath = 'src/foo.py';
        el.dataset.hunkIndex = '2';
        el.dataset.direction = 'before';

        diffStore.expandContext(el);

        expect(expandContext).toHaveBeenCalledWith(
            el, 'src/foo.py', 2, 'before', 10, 'pygments'
        );
    });

    test('loadFullDiff reads data-* from element and delegates', () => {
        const el = document.createElement('span');
        el.dataset.filePath = 'src/foo.py';
        el.dataset.fileId = 'unstaged:src/foo.py';

        diffStore.loadFullDiff(el);

        expect(loadFullDiff).toHaveBeenCalledWith('src/foo.py', 'unstaged:src/foo.py');
    });

    test('navigateToPreviousFile reads data-file-id from element', () => {
        const el = document.createElement('button');
        el.dataset.fileId = 'unstaged:src/foo.py';

        diffStore.navigateToPreviousFile(el);

        expect(navigateToPreviousFile).toHaveBeenCalledWith('unstaged:src/foo.py');
    });

    test('navigateToNextFile reads data-file-id from element', () => {
        const el = document.createElement('button');
        el.dataset.fileId = 'unstaged:src/foo.py';

        diffStore.navigateToNextFile(el);

        expect(navigateToNextFile).toHaveBeenCalledWith('unstaged:src/foo.py');
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm run test:js -- --testPathPattern=diffStore-actions
```

Expected: FAIL — methods not found on store.

- [ ] **Step 3: Add action methods to diffStore.js**

First, add static imports at the top of `diffStore.js` (after the `const DEBUG` line):

```js
import { expandContext as _expandContext } from '../modules/context-expansion.js';
import { loadFullDiff as _loadFullDiff, loadMovedFileContent as _loadMovedFileContent } from '../modules/full-diff.js';
import { navigateToPreviousFile as _navigateToPrev, navigateToNextFile as _navigateToNext } from '../modules/navigation.js';
```

Then append the following methods to the `export default { ... }` object (before the closing `}`):

```js
/**
 * Expand context lines — called by @click="$store.diff.expandContext($el)"
 * Reads data-file-path, data-hunk-index, data-direction from the button element.
 */
expandContext(el) {
    const filePath = el.dataset.filePath;
    const hunkIndex = parseInt(el.dataset.hunkIndex, 10);
    const direction = el.dataset.direction;
    _expandContext(el, filePath, hunkIndex, direction, 10, 'pygments');
},

/**
 * Load full diff — called by @click="$store.diff.loadFullDiff($el)"
 * Reads data-file-path and data-file-id from the element.
 */
loadFullDiff(el) {
    _loadFullDiff(el.dataset.filePath, el.dataset.fileId);
},

/**
 * Load moved file content — called by @click="$store.diff.loadMovedFileContent($el)"
 * Passes the element directly; full-diff.js reads data-file-path / data-old-path from parent.
 */
loadMovedFileContent(el) {
    _loadMovedFileContent(el);
},

/**
 * Navigate to previous file — called by @click="$store.diff.navigateToPreviousFile($el)"
 */
navigateToPreviousFile(el) {
    _navigateToPrev(el.dataset.fileId);
},

/**
 * Navigate to next file — called by @click="$store.diff.navigateToNextFile($el)"
 */
navigateToNextFile(el) {
    _navigateToNext(el.dataset.fileId);
},
```

Note: `expandAllFiles()` and `collapseAllFiles()` already exist on the store — templates call those directly (see Task 7 Step 4). Do not add new methods with those names as it would shadow the existing `expandAll(filePaths)` method used by `file-operations.js`.

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm run test:js -- --testPathPattern=diffStore-actions
```

Expected: 4 PASSes.

### Task 6: Replace onclick strings in diff_hunk.html

**Files:**
- Modify: `src/difflicious/templates/diff_hunk.html`

- [ ] **Step 1: Add data-* attributes and replace onclick on expansion buttons**

For every expansion button (there are 4: 2 "before" and 2 "after" pairs), the current pattern is:

```html
<button onclick="expandContext(this, '{{ file.path }}', {{ hunk.index }}, 'before', 10, 'pygments')"
    class="expansion-btn ..."
    data-target-start="{{ hunk.expand_before_start }}"
    data-target-end="{{ hunk.expand_before_end }}"
    data-direction="before"
    ...>
```

Replace with (adding `data-file-path` and `data-hunk-index`, using Alpine `@click`):

```html
<button @click="$store.diff.expandContext($el)"
    class="expansion-btn ..."
    data-file-path="{{ file.path }}"
    data-hunk-index="{{ hunk.index }}"
    data-target-start="{{ hunk.expand_before_start }}"
    data-target-end="{{ hunk.expand_before_end }}"
    data-direction="before"
    ...>
```

Apply the same pattern to all 4 expansion buttons (the two "before" ones and the two "after" ones, changing `expand_before_*` to `expand_after_*` and `data-direction="after"` for the after buttons).

- [ ] **Step 2: Run quality checks**

```bash
./cilicious.sh
```

Expected: all pass. Manually verify context expansion still works in the browser (click a ▲ or ▼ button in the diff view).

### Task 7: Replace onclick strings in diff_file.html

**Files:**
- Modify: `src/difflicious/templates/diff_file.html`

- [ ] **Step 1: Replace loadFullDiff onclick**

Current (line ~23):
```html
<span class="expand-icon ..."
    onclick="loadFullDiff('{{ file.path }}', '{{ file_id }}'); event.stopPropagation()"
    id="expand-icon-{{ file.file_id }}">
```

Replace with:
```html
<span class="expand-icon ..."
    @click.stop="$store.diff.loadFullDiff($el)"
    data-file-path="{{ file.path }}"
    data-file-id="{{ file.file_id }}"
    id="expand-icon-{{ file.file_id }}">
```

- [ ] **Step 2: Replace navigation button onclicks**

Previous file button (line ~66):

**Before:**
```html
<button onclick="navigateToPreviousFile('{{ file_id }}')"
```

**After:**
```html
<button @click="$store.diff.navigateToPreviousFile($el)"
    data-file-id="{{ file.file_id }}"
```

Next file button (line ~71):

**Before:**
```html
<button onclick="navigateToNextFile('{{ file_id }}')"
```

**After:**
```html
<button @click="$store.diff.navigateToNextFile($el)"
    data-file-id="{{ file.file_id }}"
```

- [ ] **Step 3: Replace loadMovedFileContent onclicks**

Both `loadMovedFileContent(this)` buttons (lines ~100, ~115):

**Before:**
```html
<button onclick="loadMovedFileContent(this)"
```

**After:**
```html
<button @click="$store.diff.loadMovedFileContent($el)"
```

(The `full-diff.js` `loadMovedFileContent` function already reads `data-file-path` and `data-old-path` from the closest `.moved-file-content` ancestor — no change needed there.)

- [ ] **Step 4: Replace window.* calls in global_controls.html**

`expandAllFiles()` and `collapseAllFiles()` already exist on `diffStore` — call them directly:

Current:
```html
<button @click="window.expandAllFiles()" :disabled="$store.diff.allFilesExpanded" ...>
<button @click="window.collapseAllFiles()" :disabled="$store.diff.allFilesCollapsed" ...>
```

Replace:
```html
<button @click="$store.diff.expandAllFiles()" :disabled="$store.diff.allFilesExpanded" ...>
<button @click="$store.diff.collapseAllFiles()" :disabled="$store.diff.allFilesCollapsed" ...>
```

- [ ] **Step 5: Run full quality checks**

```bash
./cilicious.sh
```

Expected: all pass. Verify in browser: expand/collapse buttons work, navigation arrows work, "load full diff" works, moved-file button works.

- [ ] **Step 6: Commit PRs 5 tasks together**

```bash
git add src/difflicious/static/js/stores/diffStore.js \
        src/difflicious/templates/diff_hunk.html \
        src/difflicious/templates/diff_file.html \
        src/difflicious/templates/partials/global_controls.html \
        tests/js/diffStore-actions.test.js
git commit -m "refactor: replace template onclick strings with Alpine store directives (Contract 2)"
```

---

## PR 6 — Remove window.* function exports from main.js

Safe to remove now that no template references them.

### Task 8: Remove window.* exports and DiffState import from main.js

**Files:**
- Modify: `src/difflicious/static/js/main.js`

- [ ] **Step 1: Grep to verify no remaining onclick= or window.X( references in templates**

```bash
grep -r "onclick=" src/difflicious/templates/
grep -r "window\.expandContext\|window\.loadFullDiff\|window\.navigateTo\|window\.expandAllFiles\|window\.collapseAllFiles" src/difflicious/templates/
```

Expected: zero matches for both. If any matches remain, fix them in their respective templates before continuing.

- [ ] **Step 2: Remove window.* exports from main.js**

Delete lines 76–89 (the window.* assignments block):

```js
// REMOVE these lines entirely:
window.expandContext = expandContext;
window.loadFullDiff = loadFullDiff;
window.__loadFullDiff = loadFullDiff;
window.loadMovedFileContent = loadMovedFileContent;
window.navigateToPreviousFile = navigateToPreviousFile;
window.navigateToNextFile = navigateToNextFile;
window.expandAllFiles = expandAllFiles;
window.collapseAllFiles = collapseAllFiles;
```

Also remove the imports that are now unused at the top of `main.js`. Check which imports are still needed by the remaining code. The `DOMContentLoaded` handler still uses `$$` and `AutoReload`; the `expandContext` etc. imports are now unused since they're no longer assigned to `window`. Remove:

```js
// Remove these unused imports:
import { toggleFile, toggleGroup, expandAllFiles, collapseAllFiles } from './modules/file-operations.js';
import { navigateToPreviousFile, navigateToNextFile } from './modules/navigation.js';
import { toggleTheme, setDebug as setThemeDebug } from './modules/theme.js';
import { expandContext } from './modules/context-expansion.js';
import { loadFullDiff, loadMovedFileContent } from './modules/full-diff.js';
```

Also remove the `DiffState` import and its `setStateDebug` call:
```js
// Remove:
import { DiffState, setDebug as setStateDebug } from './modules/state.js';
// Remove:
setStateDebug(DEBUG);
```

And remove the CJS export block at the bottom (lines 95–109) — it was only needed to expose `DiffState` for testing:
```js
// Remove:
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ... };
}
```

- [ ] **Step 3: Run quality checks**

```bash
./cilicious.sh
```

Expected: all pass. The app should still work fully in the browser.

- [ ] **Step 4: Commit**

```bash
git add src/difflicious/static/js/main.js
git commit -m "refactor: remove window.* function exports from main.js (Contract 2 cleanup)"
```

---

## PR 7 — Consolidate state management: delete state.js

Single state system. `diffStore.js` absorbs `DiffState`.

### Task 9: Update file-operations.js to use Alpine store directly

**Files:**
- Modify: `src/difflicious/static/js/modules/file-operations.js`

- [ ] **Step 1: Write failing Jest tests**

Create `tests/js/file-operations.test.js`:

```js
import { toggleFile, expandAllFiles, collapseAllFiles } from '../../src/difflicious/static/js/modules/file-operations.js';

describe('file-operations without DiffState', () => {
    let mockStore;

    beforeEach(() => {
        mockStore = {
            expandedFiles: {},
            toggleFile: jest.fn(),
            expandAll: jest.fn(),
            collapseAll: jest.fn(),
            saveState: jest.fn(),
        };
        window.Alpine = { store: jest.fn(() => mockStore) };

        document.body.innerHTML = `
            <div data-file="src/foo.py">
                <span class="toggle-icon"></span>
            </div>
            <div data-file-content="src/foo.py" style="display:none"></div>
        `;
    });

    test('toggleFile delegates to store', () => {
        toggleFile('src/foo.py');
        expect(mockStore.toggleFile).toHaveBeenCalledWith('src/foo.py');
    });

    test('expandAllFiles delegates to store', () => {
        expandAllFiles();
        expect(mockStore.expandAll).toHaveBeenCalled();
    });

    test('collapseAllFiles delegates to store', () => {
        collapseAllFiles();
        expect(mockStore.collapseAll).toHaveBeenCalled();
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm run test:js -- --testPathPattern=file-operations
```

Expected: FAILs (DiffState is referenced in file-operations.js).

- [ ] **Step 3: Rewrite file-operations.js**

Replace the entire file. The key change: all state mutations go through the Alpine store; `DiffState` is not imported:

```js
/**
 * File and group toggle operations
 * State is owned exclusively by the Alpine diffStore.
 */

import { $, $$ } from './dom-utils.js';

function getDiffStore() {
    return window.Alpine && window.Alpine.store('diff');
}

/**
 * Toggle the expansion state of a single file
 */
export function toggleFile(filePath) {
    const store = getDiffStore();
    if (store) {
        store.toggleFile(filePath);
    }
}

/**
 * Toggle the expansion state of a file group
 */
export function toggleGroup(groupKey) {
    const store = getDiffStore();
    if (store) {
        store.toggleGroup(groupKey);
    }
}

/**
 * Expand all files in the diff
 */
export function expandAllFiles() {
    const store = getDiffStore();
    if (!store) return;

    const filesToAdd = [];
    $$('[data-file]').forEach(fileElement => {
        const filePath = fileElement.dataset.file;
        const contentElement = $(`[data-file-content="${filePath}"]`);
        const isExpanded = contentElement && contentElement.style.display !== 'none';
        if (!isExpanded && contentElement) {
            filesToAdd.push(filePath);
        }
    });

    if (filesToAdd.length > 0) {
        requestAnimationFrame(() => {
            filesToAdd.forEach(filePath => {
                const contentElement = $(`[data-file-content="${filePath}"]`);
                const fileElement = $(`[data-file="${filePath}"]`);
                const toggleIcon = fileElement?.querySelector('.toggle-icon');
                if (contentElement) contentElement.style.display = 'block';
                if (toggleIcon) {
                    toggleIcon.textContent = '▼';
                    toggleIcon.dataset.expanded = 'true';
                }
            });
        });
        store.expandAll(filesToAdd);
    }
}

/**
 * Collapse all files in the diff
 */
export function collapseAllFiles() {
    const store = getDiffStore();
    if (!store) return;

    requestAnimationFrame(() => {
        $$('[data-file]').forEach(fileElement => {
            const filePath = fileElement.dataset.file;
            const contentElement = $(`[data-file-content="${filePath}"]`);
            const toggleIcon = fileElement?.querySelector('.toggle-icon');
            if (contentElement) contentElement.style.display = 'none';
            if (toggleIcon) {
                toggleIcon.textContent = '▶';
                toggleIcon.dataset.expanded = 'false';
            }
        });
    });
    store.collapseAll();
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm run test:js -- --testPathPattern=file-operations
```

Expected: 3 PASSes.

### Task 10: Update component factories and delete state.js

**Files:**
- Modify: `src/difflicious/static/js/components/fileComponent.js`
- Modify: `src/difflicious/static/js/components/groupComponent.js`
- Delete: `src/difflicious/static/js/modules/state.js`

- [ ] **Step 1: Update fileComponent.js**

Replace `window.Alpine.store('diff')` with `this.$store.diff`:

```js
export function fileComponent(filePath) {
    return {
        filePath,

        get isExpanded() {
            return this.$store.diff.isFileExpanded(this.filePath);
        },

        get toggleIcon() {
            return this.isExpanded ? '▼' : '▶';
        },

        toggle() {
            this.$store.diff.toggleFile(this.filePath);
        },

        init() {}
    };
}

if (typeof window !== 'undefined') {
    window.fileComponent = fileComponent;
}
```

- [ ] **Step 2: Update groupComponent.js**

Same pattern — replace `window.Alpine.store('diff')` with `this.$store.diff`:

```js
export function groupComponent(groupKey) {
    return {
        groupKey,

        get isExpanded() {
            return this.$store.diff.isGroupExpanded(this.groupKey);
        },

        get toggleIcon() {
            return this.isExpanded ? '▼' : '▶';
        },

        toggle() {
            this.$store.diff.toggleGroup(this.groupKey);
        },

        init() {}
    };
}

if (typeof window !== 'undefined') {
    window.groupComponent = groupComponent;
}
```

- [ ] **Step 3: Delete state.js**

```bash
git rm src/difflicious/static/js/modules/state.js
```

- [ ] **Step 4: Run quality checks**

```bash
./cilicious.sh
```

Expected: all pass. Verify in browser that file expand/collapse, expand-all, and collapse-all still work.

- [ ] **Step 5: Commit**

```bash
git add src/difflicious/static/js/modules/file-operations.js \
        src/difflicious/static/js/components/fileComponent.js \
        src/difflicious/static/js/components/groupComponent.js \
        tests/js/file-operations.test.js
git commit -m "refactor: consolidate to single state system, delete state.js (Contract 4)"
```

---

## PR 8 — Simplify theme initialisation

Eliminates the duplicate localStorage read in themeStore.

### Task 11: Simplify themeStore.init()

**Files:**
- Modify: `src/difflicious/static/js/stores/themeStore.js`

- [ ] **Step 1: Write a failing Jest test**

Create `tests/js/themeStore.test.js`:

```js
import themeStore from '../../src/difflicious/static/js/stores/themeStore.js';

describe('themeStore init', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    });

    test('reads initial theme from DOM attribute set by inline script', () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        // localStorage is empty — store must use DOM as source of truth
        themeStore.init();
        expect(themeStore.current).toBe('dark');
    });

    test('defaults to light when no DOM attribute', () => {
        themeStore.init();
        expect(themeStore.current).toBe('light');
    });

    test('does not read localStorage during init', () => {
        localStorage.setItem('difflicious-theme', 'dark');
        document.documentElement.removeAttribute('data-theme');
        // DOM says no theme; localStorage says dark — DOM should win
        themeStore.init();
        // The inline script is authoritative; if DOM has no attr, we default to light
        expect(themeStore.current).toBe('light');
    });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm run test:js -- --testPathPattern=themeStore
```

Expected: test 1 passes (it already does), test 3 FAILs (localStorage currently wins).

- [ ] **Step 3: Update themeStore.init()**

Replace the `init()` method body:

**Before:**
```js
init() {
    const savedTheme = localStorage.getItem('difflicious-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentDomTheme = document.documentElement.getAttribute('data-theme');
    this.current = savedTheme || currentDomTheme || (systemPrefersDark ? 'dark' : 'light');
    this.applyTheme();
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('difflicious-theme')) {
            this.current = e.matches ? 'dark' : 'light';
            this.applyTheme();
        }
    });
},
```

**After:**
```js
init() {
    // The inline script in base.html already set data-theme from localStorage / system preference
    // before CSS loaded (to prevent flash). We read that as the single source of truth.
    const currentDomTheme = document.documentElement.getAttribute('data-theme');
    this.current = currentDomTheme === 'dark' ? 'dark' : 'light';

    if (DEBUG) {
        console.log('[ThemeStore] Theme initialized from DOM:', {
            currentDomTheme,
            current: this.current,
        });
    }

    // Listen for system theme changes only when no explicit preference is stored
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('difflicious-theme')) {
            this.current = e.matches ? 'dark' : 'light';
            this.applyTheme();
        }
    });
},
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm run test:js -- --testPathPattern=themeStore
```

Expected: all pass.

- [ ] **Step 5: Run quality checks**

```bash
./cilicious.sh
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/difflicious/static/js/stores/themeStore.js \
        tests/js/themeStore.test.js
git commit -m "refactor: simplify themeStore init — read from DOM, not localStorage (Contract 4)"
```

---

## PR 9 — Add js- prefix to structural selectors

Makes the Template→JS structural contract explicit and prevents accidental styling of selector classes.

### Task 12: Rename structural CSS selectors with js- prefix

**Files:**
- Modify: `src/difflicious/templates/diff_hunk.html`
- Modify: `src/difflicious/templates/diff_file.html`
- Modify: `src/difflicious/templates/diff_groups.html`
- Modify: `src/difflicious/static/js/modules/file-operations.js`
- Modify: `src/difflicious/static/js/modules/hunk-operations.js`
- Modify: `src/difflicious/static/js/modules/navigation.js`
- Modify: `src/difflicious/static/js/modules/context-expansion.js`
- Modify: `src/difflicious/static/js/modules/context-expansion-ui.js`
- Modify: `src/difflicious/static/js/main.js`

- [ ] **Step 1: Audit the complete list of structural selectors**

Run this to find all class names used as selectors in JS:

```bash
grep -rh "\.\(hunk\|expansion-btn\|hunk-lines\|hunk-expansion\|toggle-icon\|file-content\|moved-file-content\|file-diff\)\b" \
    src/difflicious/static/js/ \
    --include="*.js" | sort -u
```

The expected set (verify against output):
- `.hunk` → `.js-hunk`
- `.expansion-btn` → `.js-expansion-btn`
- `.hunk-lines` → `.js-hunk-lines`
- `.hunk-expansion` → `.js-hunk-expansion`
- `.toggle-icon` → `.js-toggle-icon`
- `.file-content` → `.js-file-content` (if used as JS selector; check grep output)
- `.moved-file-content` → `.js-moved-file-content`

- [ ] **Step 2: Rename in templates**

For each class name in the list above, update every occurrence in HTML templates. Example for `.hunk`:

In `diff_hunk.html` line 2:
```html
{# Before: #}
<div class="hunk border-neutral-200 ...
{# After: #}
<div class="js-hunk border-neutral-200 ...
```

In `diff_hunk.html` line 54:
```html
{# Before: #}
<div class="hunk-lines font-mono ...
{# After: #}
<div class="js-hunk-lines font-mono ...
```

In `diff_hunk.html` line 8 and 132 (`hunk-expansion`):
```html
{# Before: #}
<div class="hunk-expansion hunk-expansion-strip ...
{# After: #}
<div class="js-hunk-expansion hunk-expansion-strip ...
```

For `.expansion-btn` buttons (already updated in PR 5 Task 6 — update class there too):
```html
{# Before: #}
class="expansion-btn w-full ...
{# After: #}
class="js-expansion-btn w-full ...
```

For `.toggle-icon` spans in `diff_file.html` (line 18) and `diff_groups.html`:
```html
{# Before: #}
class="toggle-icon text-neutral-400 ...
{# After: #}
class="js-toggle-icon text-neutral-400 ...
```

- [ ] **Step 3: Rename in JS files**

Update every selector string in JS files. Use global find-and-replace carefully — only change selector strings, not comments or unrelated text.

In `main.js`:
```js
// Before:
const buttons = $$('.expansion-btn');
// After:
const buttons = $$('.js-expansion-btn');
```

In `file-operations.js` (all `.toggle-icon` querySelector calls):
```js
// Before:
const toggleIcon = fileElement?.querySelector('.toggle-icon');
// After:
const toggleIcon = fileElement?.querySelector('.js-toggle-icon');
```

In `hunk-operations.js` — update `.hunk`, `.hunk-lines`, `.hunk-expansion`, `.expansion-btn`:
```js
// Example:
button.closest('.hunk')  →  button.closest('.js-hunk')
button.closest('.hunk-lines')  →  button.closest('.js-hunk-lines')
```

In `context-expansion.js` and `context-expansion-ui.js` — update any `.hunk`, `.hunk-lines` selectors.

In `navigation.js` — update any structural class selectors found in Step 1.

- [ ] **Step 4: Also update styles.css if any rules target old names**

```bash
grep -n "\.hunk\b\|\.expansion-btn\|\.hunk-lines\|\.hunk-expansion\|\.toggle-icon" src/difflicious/static/css/styles.css
```

Any CSS rules targeting these as style hooks (not selector contracts) should be updated to the `js-` prefixed name OR given a separate semantic class name if they do carry styling.

- [ ] **Step 5: Run quality checks**

```bash
./cilicious.sh
```

Expected: all pass. Verify in browser that context expansion, toggle icons, and bulk operations still work correctly.

- [ ] **Step 6: Commit**

```bash
git add src/difflicious/templates/ \
        src/difflicious/static/js/ \
        src/difflicious/static/css/styles.css
git commit -m "refactor: add js- prefix to structural CSS selectors (Contract 4 clarity)"
```

---

## Self-review checklist

### Spec coverage

| Spec requirement | Covered by |
|---|---|
| Remove `hidden_by_search`, `expanded` from service | Task 2 |
| Move file_id construction to service | Task 2 |
| Remove server-side search filtering | Task 2 |
| Extract toolbar inline script | Task 3 |
| Add data-* to expansion buttons, replace onclick | Task 6 |
| Replace onclick in diff_file.html | Task 7 |
| Replace window.* in global_controls.html | Task 7 step 4 |
| Add store action methods | Task 5 |
| Remove window.* from main.js | Task 8 |
| Add semantic CSS classes | Task 1 |
| Replace Tailwind colour utilities in templates | Task 4 |
| Replace colour utilities in full-diff.js | Task 4 step 9 |
| Delete state.js | Task 10 |
| Update file-operations.js | Task 9 |
| Update fileComponent / groupComponent | Task 10 |
| Simplify themeStore init | Task 11 |
| js- prefix for structural selectors | Task 12 |
| Update test_template_service.py | Task 2 |

All spec requirements are covered.
