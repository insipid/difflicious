# Presentation Layer Separation — Design Spec

**Date:** 2026-04-08
**Status:** Approved for planning

---

## Goal

Difflicious has a working presentation stack, but the layers have grown entangled in ways that make individual changes harder than they should be: styling changes require touching both CSS and templates, adding JS behaviour requires knowing which global functions templates expect, and state logic is duplicated between the server and the client. This spec defines four explicit contracts between the layers and describes what must change in each file to honour them.

The guiding principle is **the server renders structure and content; the client owns all interactivity**. Because this is a local developer tool with no production or SEO constraints, simplicity of the client model takes priority over everything else.

---

## The Four Contracts

### Contract 1 — Data → Service

**What it means:**
The service layer transforms raw git data into presentation-ready data structures. It does not know or decide anything about UI state: which files are expanded, what the user has searched for, or how much context to show around a hunk. Those are runtime client decisions. The service's output is a plain description of what the diff *contains*, not how it should be *displayed*.

**Current violations:**
- `template_service.py` computes `hidden_by_search` (a client UI flag) and passes it to templates.
- `template_service.py` computes `expanded` (initial expansion state) and passes it to templates.
- `template_service.py` pre-calculates hunk context expansion ranges (`expand_before_start`, `expand_before_end`) — these are UI interaction hints, not data.
- File ID construction (`group_name + ":" + file.path`) is done inside the Jinja template rather than the service.

**Target state:**
- `template_service.py` removes all three UI flags. It returns only what the diff *is*.
- File ID construction moves into `template_service.py` and is passed to the template as a plain string field.
- The service does not filter files by search. It returns all files every time.

**Files changed:** `template_service.py`

---

### Contract 2 — Service → Template

**What it means:**
Templates are responsible for rendering data as HTML. They have no knowledge of JavaScript: no function names, no call signatures, no global namespace. Their only mechanism for triggering client behaviour is Alpine directives (`@click`, `x-on`, `x-data`) and `data-*` attributes. The template treats the DOM as its output format, not as a place to wire up application logic.

**Current violations:**
- `diff_hunk.html` embeds JS function names and call signatures directly in `onclick` strings:
  `onclick="expandContext(this, '{{ file.path }}', {{ hunk.index }}, 'before', 10, 'pygments')"`
- `diff_file.html` does the same for `loadFullDiff`, `loadMovedFileContent`, `navigateToPreviousFile`, `navigateToNextFile`.
- `global_controls.html` calls `window.expandAllFiles()` / `window.collapseAllFiles()` via Alpine `@click`.
- `toolbar.html` contains a 120-line inline `<script>` block defining a `ToggleState` object, form submission logic, and checkbox management.
- `diff_file.html` constructs `file_id` via a Jinja `{% set %}` expression (logic that belongs in the service).

**Target state:**
- All `onclick="functionName(…)"` attributes are replaced. The element carries `data-*` attributes that describe its context (file path, hunk index, direction, etc.), and the click handler is an Alpine directive that calls a store method: e.g. `@click="$store.diff.expandContext($el)"`.
- `global_controls.html` uses `@click="$store.diff.expandAll()"` and `@click="$store.diff.collapseAll()"` directly, with no `window.*` calls.
- The inline `<script>` in `toolbar.html` is extracted to a new file `static/js/modules/toolbar.js`, which exports a `toolbarComponent()` Alpine component factory. The toolbar element uses `x-data="toolbarComponent()"`.
- `diff_file.html` receives `file_id` as a template variable; the Jinja `{% set %}` is removed.

**Files changed:** `diff_hunk.html`, `diff_file.html`, `global_controls.html`, `toolbar.html`
**Files created:** `static/js/modules/toolbar.js`
**Files changed (JS):** `main.js` (remove `window.*` function exports; the functions either become store methods or are called via event delegation), `diffStore.js` (add methods: `expandContext`, `loadFullDiff`, `loadMovedFileContent`, `navigateToPreviousFile`, `navigateToNextFile`, `expandAll`, `collapseAll`)

**Note on Alpine component instantiation:**
`x-data="fileComponent('{{ file_id }}')"` and `x-data="groupComponent('{{ group_key }}')"` are *not* violations of this contract. Passing a data value to initialise an Alpine component is the same as a `data-*` attribute — it's passing data, not invoking logic. These remain as-is.

---

### Contract 3 — Template → CSS

**What it means:**
Templates describe the *purpose* of an element, not its appearance. A diff line that was added is annotated as `.diff-line-added`. The CSS file decides what that looks like in light and dark modes. No colour, no visual style, flows from template to CSS — only semantic intent. Tailwind utility classes are permitted in templates for layout, spacing, and typography only.

A secondary part of this contract covers JavaScript that generates HTML strings (currently `full-diff.js`): generated markup must also follow the same rule — semantic class names only, no inline colour utilities.

**Current violations in templates:**
- `diff_hunk.html` uses `bg-red-50 dark:bg-red-900/20` and `bg-green-50 dark:bg-green-900/20` for diff line backgrounds.
- `diff_hunk.html`, `diff_file.html`, `diff_groups.html`, `global_controls.html`, and the partials all contain `text-neutral-*`, `bg-neutral-*`, `border-neutral-*`, `text-danger-text-*`, `text-info-text-*`, `bg-info-bg-*` etc. — presentation values that should live in CSS.
- `full-diff.js` generates HTML strings with hardcoded Tailwind colour classes (`bg-red-50`, `dark:bg-red-900/20`, `text-danger-text-600`, `bg-success-bg-50`, etc.).

**Target state:**
- `styles.css` gains a catalogue of semantic component classes that cover all the cases currently expressed as inline utilities. Examples:
  - `.diff-line-added` — addition background and text colour
  - `.diff-line-deleted` — deletion background and text colour
  - `.diff-hunk-header` — hunk separator appearance
  - `.diff-context-expander` — the expand-context button strip
  - `.file-card` — file header container
  - `.file-card-actions` — navigation/action buttons on a file header
  - `.global-controls-button` — the expand/collapse all buttons
  - All colours expressed exclusively via the existing CSS variable system.
- Templates reference only these semantic names plus Tailwind layout/spacing/typography utilities.
- `full-diff.js` uses the same semantic class names when generating HTML fragments.

**The rule (to be documented in `CLAUDE.md` and `CSS-STYLE-GUIDE.md`):**
Templates and JS-generated HTML must not contain Tailwind classes matching `bg-{colour}-{n}`, `text-{colour}-{n}`, or `border-{colour}-{n}`. Violations are visible at a glance — semantic names make intent legible; raw utility names do not.

**Files changed:** `styles.css`, `diff_hunk.html`, `diff_file.html`, `diff_groups.html`, `toolbar.html`, `global_controls.html`, `loading_state.html`, `empty_state.html`, `full-diff.js`

---

### Contract 4 — Template → JS

**What it means:**
The DOM is the API. JavaScript discovers context — file paths, hunk indices, line numbers — by reading `data-*` attributes on elements. It does not need information passed as function arguments from HTML strings. There is exactly one client-side state system: the Alpine stores. No parallel vanilla-JS state object shadows the store.

A secondary part of this contract covers CSS class names used as JS selectors. These *structural* class names (`.hunk`, `.expansion-btn`, `.hunk-lines`, `.file-content`, etc.) are an implicit contract between the HTML and JS. They should be treated as stable identifiers: never renamed in HTML without updating JS, and never used for styling. To make this contract explicit, structural selectors are prefixed `js-` (e.g. `.js-hunk`, `.js-expansion-btn`). This makes them immediately recognisable and prevents accidental styling via them.

**Current violations:**
- `modules/state.js` maintains `DiffState.expandedFiles` and `DiffState.expandedGroups` Sets — a parallel expansion state system that shadows `diffStore.js`.
- `file-operations.js` maintains both: it writes to `DiffState` *and* syncs to the Alpine store, manually bridging two systems (lines 114–121).
- `template_service.py` computes and sends search filter state; `search.js` recomputes it client-side. The server version is redundant and less capable (no regex).
- `base.html` contains an inline script that reads localStorage and sets `data-theme`; `themeStore.js` also reads localStorage on init, duplicating the source of truth.
- Six functions are exposed globally via `window.*` in `main.js` solely to be callable from template `onclick` strings. Once Contract 2 is honoured, this mechanism is no longer needed.

**Target state:**
- `modules/state.js` is deleted. `diffStore.js` absorbs `expandedFiles`, `expandedGroups`, and their localStorage persistence.
- `file-operations.js` calls Alpine store methods directly. The dual-write bridge is removed.
- Server-side search filtering is removed from `template_service.py`. `search.js` + `searchStore.js` are the sole implementation.
- `themeStore.js` reads its initial value from the `data-theme` attribute already set on `<html>` by the inline script in `base.html`, rather than independently re-reading localStorage. The inline script in `base.html` is kept (it prevents flash-of-wrong-theme before CSS loads) but is now the single writer of initial theme state.
- The `window.*` function exports in `main.js` are removed once Contract 2 is implemented and the template onclick strings are gone.
- Structural class names used as JS selectors are renamed with a `js-` prefix in both templates and JS. Example: `.hunk` → `.js-hunk`, `.expansion-btn` → `.js-expansion-btn`.

**Files changed:** `modules/state.js` (deleted), `diffStore.js`, `file-operations.js`, `main.js`, `themeStore.js`, `template_service.py`, and all templates that use structural class names.

---

## What Does Not Change

- The Flask blueprint architecture and all API routes.
- The DTO layer and diff parsing pipeline.
- The syntax highlighting service (Pygments output is untouched).
- `search.js` and `searchStore.js` — already the correct implementation.
- Alpine component factories `fileComponent`, `groupComponent`, `hunkComponent`, `searchComponent` — their structure is sound; they receive minor updates only where they call `window.Alpine.store()` directly instead of via `$store`.
- The `data-*` attribute names themselves (except structural class renames) — these are already a reasonable DOM contract and changing them would widen the diff unnecessarily.
- The existing CSS variable definitions in `styles.css` — the foundation is good; we are adding to it, not changing it.

---

## Complete File Inventory

### Deleted
| File | Reason |
|------|--------|
| `static/js/modules/state.js` | Replaced by `diffStore.js` |

### Created
| File | Purpose |
|------|---------|
| `static/js/modules/toolbar.js` | Alpine `toolbarComponent()` factory, extracted from `toolbar.html` inline script |

### Modified
| File | Contract | Summary of changes |
|------|----------|--------------------|
| `services/template_service.py` | 1, 4 | Remove UI flags; move file ID construction here; remove search filtering |
| `templates/diff_hunk.html` | 2, 3 | Replace onclick strings with data-* + Alpine; replace colour utilities with semantic classes; rename structural class names |
| `templates/diff_file.html` | 2, 3 | Remove file_id Jinja construction; replace onclick strings; replace colour utilities with semantic classes; rename structural class names |
| `templates/diff_groups.html` | 3 | Replace colour utilities with semantic classes; rename structural class names |
| `templates/partials/toolbar.html` | 2, 3 | Remove 120-line inline script; add `x-data="toolbarComponent()"`; replace colour utilities |
| `templates/partials/global_controls.html` | 2, 3 | Replace `window.*` calls with store directives; replace colour utilities |
| `templates/partials/loading_state.html` | 3 | Replace colour utilities |
| `templates/partials/empty_state.html` | 3 | Replace colour utilities |
| `static/css/styles.css` | 3 | Add semantic component classes for all cases currently expressed as inline utilities |
| `static/js/main.js` | 2, 4 | Remove `window.*` function exports; remove `DiffState` import |
| `static/js/alpine-init.js` | 2 | Register `toolbarComponent` |
| `static/js/stores/diffStore.js` | 4 | Absorb `expandedFiles`/`expandedGroups` from state.js; add store methods for actions currently invoked from templates (`expandContext`, `loadFullDiff`, `loadMovedFileContent`, `navigateToPreviousFile`, `navigateToNextFile`, `expandAll`, `collapseAll`) |
| `static/js/stores/themeStore.js` | 4 | Read initial theme from DOM attribute, not localStorage |
| `static/js/modules/file-operations.js` | 4 | Remove dual-write bridge; call store methods directly |
| `static/js/modules/full-diff.js` | 3 | Replace hardcoded Tailwind colour classes in generated HTML strings with semantic class names |
| `static/js/modules/context-expansion.js` | 2 | No logic change; called by `diffStore.expandContext()` instead of directly from template onclick. Verify all `data-*` attribute reads still match template output. |
| `static/js/modules/navigation.js` | 4 | Update structural class name selectors to `js-` prefix |
| `static/js/modules/hunk-operations.js` | 4 | Update structural class name selectors to `js-` prefix |
| `static/js/components/fileComponent.js` | 4 | Replace `window.Alpine.store('diff')` calls with `this.$store.diff` |
| `static/js/components/groupComponent.js` | 4 | Replace `window.Alpine.store('diff')` calls with `this.$store.diff` |
| `tests/services/test_template_service.py` | 1 | Update tests to reflect removed UI flags |
| `docs/CSS-STYLE-GUIDE.md` | 3 | Document the no-colour-utilities-in-templates rule and the new semantic class catalogue |
| `CLAUDE.md` | all | Update CSS guidelines and Important Notes sections |

---

## Non-Goals

- No change to the diff parsing or syntax highlighting pipeline.
- No change to the Flask API surface.
- No introduction of new frontend dependencies.
- No change to the Alpine store *names* (`$store.diff`, `$store.search`, `$store.theme`).
- No visual changes to the application — this is a structural refactor only.
- Word-level diffs and keyboard shortcuts remain out of scope.
