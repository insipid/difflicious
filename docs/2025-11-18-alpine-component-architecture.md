# Alpine.js Component Architecture for Difflicious

**Date:** 2025-11-18
**Status:** Implemented (Hybrid Alpine + ES modules)

## Current Status

Difflicious now uses Alpine component factories in
`src/difflicious/static/js/components/` with shared state in
`src/difflicious/static/js/stores/`. Diff behavior and data fetching live in
ES modules under `src/difflicious/static/js/modules/`, so the architecture is
hybrid rather than Alpine-only.

## Overview

This document describes the Alpine.js component architecture for Difflicious, including component hierarchy, interfaces, and patterns.

## Component Hierarchy

```
App Root (x-data="diffApp()")
├── Global Controls
│   ├── Search Component (x-data="searchComponent()")
│   ├── Theme Toggle (uses themeStore)
│   └── Expand/Collapse All Buttons
│
├── Diff Groups
│   ├── Group Component (x-data="groupComponent(groupKey)")
│   │   └── Group Content (collapsible)
│   │       └── File Component (x-data="fileComponent(filePath)")
│   │           ├── File Header (clickable toggle)
│   │           └── File Content (collapsible)
│   │               └── Hunk Components (x-data="hunkComponent(file, hunkIndex)")
│   │                   ├── Hunk Expansion Controls
│   │                   └── Hunk Lines
│   │
│   └── ... more groups
│
└── Full Diff Component (x-data="fullDiffComponent(filePath)")
    └── Lazy-loaded complete diff
```

## Component Patterns

### 1. Component Factory Pattern

All components use the factory pattern, which returns an object with:
- **State**: Local reactive state
- **Computed Properties**: Derived values (use getters)
- **Methods**: Component actions
- **Lifecycle Hooks**: Initialization logic

**Example:**
```javascript
export function fileComponent(filePath) {
    return {
        // State
        filePath,

        // Computed properties
        get isExpanded() {
            return Alpine.store('diff').isFileExpanded(this.filePath);
        },

        get toggleIcon() {
            return this.isExpanded ? '▼' : '▶';
        },

        // Methods
        toggle() {
            Alpine.store('diff').toggleFile(this.filePath);
        }
    };
}
```

### 2. Store Integration Pattern

Components interact with global stores using `Alpine.store()`:

```javascript
// Reading from store
get value() {
    return Alpine.store('diff').someValue;
}

// Writing to store
updateValue() {
    Alpine.store('diff').setValue(newValue);
}

// Reacting to store changes
// Alpine handles this automatically through reactivity
```

### 3. Template Directives Pattern

Components use Alpine directives in templates:

```html
<div x-data="componentFactory(param)">
    <!-- Display reactive data -->
    <span x-text="someValue"></span>

    <!-- Conditional rendering -->
    <div x-show="isVisible" x-transition>...</div>

    <!-- Event handling -->
    <button @click="handleClick()">Click</button>

    <!-- Attribute binding -->
    <div :class="{ active: isActive }">...</div>

    <!-- Two-way binding -->
    <input x-model="query">
</div>
```

## Component Interfaces

### FileComponent

**Purpose:** Manages individual file expansion/collapse state

**Factory:** `fileComponent(filePath)`

**Interface:**
```typescript
{
    // Props
    filePath: string

    // Computed
    isExpanded: boolean
    toggleIcon: string ('▼' | '▶')

    // Methods
    toggle(): void
}
```

**Usage:**
```html
<div x-data="fileComponent('src/app.js')" class="diff-file">
    <div class="file-header" @click="toggle()">
        <span class="toggle-icon" x-text="toggleIcon"></span>
        <span>src/app.js</span>
    </div>
    <div x-show="isExpanded" x-transition>
        <!-- File content -->
    </div>
</div>
```

### GroupComponent

**Purpose:** Manages diff group (staged/unstaged/untracked) expansion state

**Factory:** `groupComponent(groupKey)`

**Interface:**
```typescript
{
    // Props
    groupKey: string

    // Computed
    isExpanded: boolean
    toggleIcon: string ('▼' | '▶')

    // Methods
    toggle(): void
}
```

**Usage:**
```html
<div x-data="groupComponent('staged')" class="diff-group">
    <div class="group-header" @click="toggle()">
        <span class="toggle-icon" x-text="toggleIcon"></span>
        <span>Staged Changes</span>
    </div>
    <div x-show="isExpanded" x-transition>
        <!-- Group content -->
    </div>
</div>
```

### SearchComponent

**Purpose:** Manages file search and filtering

**Factory:** `searchComponent()`

**Interface:**
```typescript
{
    // Computed
    query: string (from searchStore)
    hiddenCount: number (from searchStore)
    hiddenCountText: string

    // Methods
    updateQuery(query: string): void
    clear(): void
    handleSlashKey(event: KeyboardEvent): void
    handleEscapeKey(event: KeyboardEvent): void
}
```

**Usage:**
```html
<div x-data="searchComponent()">
    <input
        type="text"
        x-model="query"
        @keyup.escape="clear()"
        placeholder="Search files (/)">

    <span x-show="hiddenCount > 0" x-text="hiddenCountText"></span>
</div>
```

### HunkComponent

**Purpose:** Manages hunk context expansion (before/after)

**Factory:** `hunkComponent(file, hunkIndex)`

**Interface:**
```typescript
{
    // Props
    file: FileObject
    hunkIndex: number

    // State
    expandedLines: Array<Line>
    loading: { before: boolean, after: boolean }
    targetRanges: {
        before: { start: number, end: number },
        after: { start: number, end: number }
    }

    // Computed
    canExpandBefore: boolean
    canExpandAfter: boolean

    // Methods
    expandBefore(): Promise<void>
    expandAfter(): Promise<void>
    fetchContext(direction: 'before' | 'after'): Promise<ContextResult>
    lineClasses(line: Line): object
}
```

**Usage:**
```html
<div x-data="hunkComponent(file, 0)">
    <div class="hunk-expansion">
        <button
            @click="expandBefore()"
            :disabled="loading.before"
            x-show="canExpandBefore">
            <span x-text="loading.before ? '...' : '↑ Expand 10 lines'"></span>
        </button>
    </div>

    <!-- Hunk lines -->
</div>
```

### FullDiffComponent

**Purpose:** Loads complete diff for a file on demand

**Factory:** `fullDiffComponent(filePath, fileId)`

**Interface:**
```typescript
{
    // Props
    filePath: string
    fileId: string

    // State
    loading: boolean
    error: string | null
    diffData: object | null

    // Methods
    load(): Promise<void>
    retry(): void
}
```

## Reactivity Rules

1. **Store Changes Trigger Updates:** When a store value changes, all components watching that value automatically re-render
2. **Computed Properties:** Use JavaScript getters for computed values
3. **Set Reassignment:** When modifying Sets/Maps in stores, reassign to trigger reactivity:
   ```javascript
   // Good
   this.expandedFiles.add(filePath);
   this.expandedFiles = new Set(this.expandedFiles);

   // Won't trigger reactivity
   this.expandedFiles.add(filePath);
   ```

## Event Handling Patterns

### DOM Events
```html
<!-- Click events -->
<button @click="handleClick()">

<!-- Keyboard events -->
<input @keyup.enter="handleEnter()">
<input @keyup.escape="handleEscape()">

<!-- Window/global events -->
<div @click.window="handleGlobalClick()">
```

### Custom Events
```javascript
// Dispatch custom event
this.$dispatch('file-expanded', { filePath: this.filePath });

// Listen for custom event
<div @file-expanded="handleFileExpanded($event.detail)">
```

## Performance Considerations

1. **Debouncing:** For search input, consider debouncing:
   ```javascript
   // Use Alpine's $watch with debounce
   init() {
       this.$watch('query', debounce((value) => {
           this.applyFilter(value);
       }, 300));
   }
   ```

2. **Lazy Rendering:** For large file lists, consider using `x-show` instead of `x-if`:
   - `x-show`: Keeps element in DOM, toggles display (faster for frequently toggled items)
   - `x-if`: Removes/adds element from DOM (better for rarely shown items)

3. **Transition Performance:** Use `x-transition` for smooth animations

## Testing Strategy

### Component Testing
1. **Unit Tests:** Test component factories in isolation
2. **Integration Tests:** Test component + store interactions
3. **Template Tests:** Verify Alpine directives work as expected

### Example Test
```javascript
test('fileComponent toggles expansion', () => {
    const component = fileComponent('src/test.js');
    const store = Alpine.store('diff');

    expect(component.isExpanded).toBe(false);

    component.toggle();

    expect(store.isFileExpanded('src/test.js')).toBe(true);
});
```

## Migration Path

1. **Phase 1:** Create component factories (this document)
2. **Phase 2:** Update templates with Alpine directives
3. **Phase 3:** Remove old vanilla JS event handlers
4. **Phase 4:** Test and refine

## Best Practices

1. **Keep Components Small:** Each component should have a single responsibility
2. **Use Stores for Shared State:** Don't duplicate state across components
3. **Descriptive Names:** Component methods and properties should be self-documenting
4. **Error Handling:** Always handle async errors gracefully
5. **Accessibility:** Ensure components work with keyboard navigation

## References

- [Alpine.js Documentation](https://alpinejs.dev)
- [Alpine.js Cheatsheet](https://alpinejs.dev/cheatsheet)
- Difflicious Implementation Plan:
  `docs/internal/proposals/2025-11-18-0130-alpine-js-dom-manipulation.md`
