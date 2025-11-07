# CSS Style Guide - Difflicious

**Last Updated:** 2025-11-05 (After CSS Rationalization)

This guide explains the CSS architecture and provides guidelines for maintaining and extending styles in Difflicious.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Color System](#color-system)
3. [Component Classes](#component-classes)
4. [Tailwind Usage](#tailwind-usage)
5. [Best Practices](#best-practices)
6. [Common Patterns](#common-patterns)
7. [Dark Mode](#dark-mode)

---

## Architecture Overview

Difflicious uses a **hybrid CSS approach** combining:

1. **Semantic CSS Variables** - Single source of truth for all colors and theming
2. **Tailwind Utilities** - Layout, spacing, and typography utilities only
3. **Custom Component Classes** - Reusable semantic classes for UI components

### Key Principles

✅ **Colors come from CSS variables** - Never hardcode hex values
✅ **Tailwind for utilities only** - Layout, spacing, typography
✅ **Semantic class names** - Describe purpose, not appearance
✅ **No !important unless necessary** - Let the cascade work
✅ **Themes use CSS variables** - No separate stylesheets

---

## Color System

### Variable Categories

All colors are defined as CSS variables in `styles.css`. They fall into 6 categories:

#### 1. Surfaces (Backgrounds)

```css
--surface-primary: #ffffff           /* Main page background */
--surface-secondary: #f8fafc         /* Cards, panels */
--surface-tertiary: #f1f5f9          /* Hover states */
--surface-raised: #ffffff            /* Elevated elements */
--surface-sunken: #f9fafb            /* Depressed areas */
```

**When to use:**
- `--surface-primary` - Page background, main content area
- `--surface-secondary` - File diff containers, panels, cards
- `--surface-tertiary` - Hover states, wells
- `--surface-raised` - Modals, dropdowns (elevated UI)
- `--surface-sunken` - Input fields, depressed areas

#### 2. Text Colors

```css
--text-primary: #1e293b              /* Main body text */
--text-secondary: #cbd5e1            /* Labels, secondary text */
--text-tertiary: #94a3b8             /* Deemphasized text */
--text-disabled: #cbd5e1             /* Disabled state */
```

**When to use:**
- `--text-primary` - Main content, file paths, code
- `--text-secondary` - Labels, helper text
- `--text-tertiary` - Placeholders, deemphasized content
- `--text-disabled` - Disabled buttons, inactive elements

#### 3. Borders

```css
--border-default: #e2e8f0            /* Standard borders */
--border-strong: #cbd5e1             /* Emphasized borders */
--border-subtle: #f1f5f9             /* Subtle dividers */
```

**When to use:**
- `--border-default` - Most borders (file containers, panels)
- `--border-strong` - Important dividers, focus states
- `--border-subtle` - Very light dividers, section separators

#### 4. Interactive Elements

```css
--interactive-primary: #2563eb       /* Primary buttons */
--interactive-primary-hover: #1d4ed8 /* Hover state */
--interactive-primary-active: #1e40af/* Pressed state */
--interactive-disabled: #cbd5e1      /* Disabled state */
```

**When to use:**
- `--interactive-primary` - Default state for primary actions
- `--interactive-primary-hover` - Hover state
- `--interactive-primary-active` - Active/pressed state
- `--interactive-disabled` - Disabled buttons/controls

#### 5. Diff-Specific Colors

```css
/* Additions (Green) */
--diff-addition-bg: #bbf7d0
--diff-addition-text: #059669
--diff-addition-linenum-bg: #86efac
--diff-addition-linenum-text: #065f46

/* Deletions (Red) */
--diff-deletion-bg: #fecaca
--diff-deletion-text: #dc2626
--diff-deletion-linenum-bg: #fca5a5
--diff-deletion-linenum-text: #b91c1c

/* Context (Unchanged) */
--diff-context-bg: #ffffff
--diff-context-text: #64748b
--diff-context-linenum-bg: #f3f4f6
--diff-context-linenum-text: #9ca3af

/* Expanded Areas */
--diff-expanded-bg: #f9fafb
--diff-hunk-expansion-bg: #eff6ff
--diff-hunk-expansion-border: #bfdbfe
```

**When to use:**
- Use the specific variable for each diff element
- These ensure consistency across all diff views

#### 6. Semantic Colors

```css
/* Success (Green) */
--semantic-success-bg-subtle: #bbf7d0
--semantic-success-bg-medium: #86efac
--semantic-success-bg-strong: #4ade80
--semantic-success-text: #059669
--semantic-success-text-strong: #065f46

/* Danger (Red) */
--semantic-danger-bg-subtle: #fecaca
--semantic-danger-bg-medium: #fca5a5
--semantic-danger-bg-strong: #f87171
--semantic-danger-text: #dc2626
--semantic-danger-text-strong: #b91c1c

/* Warning (Yellow/Amber) */
--semantic-warning-bg-subtle: #fef3c7
--semantic-warning-text: #d97706
--semantic-warning-text-strong: #92400e

/* Info (Blue) */
--semantic-info-bg-subtle: #eff6ff
--semantic-info-text: #1e40af
```

**When to use:**
- Success messages, added file badges, positive actions
- Error messages, deleted file badges, destructive actions
- Warnings, renamed file badges, caution states
- Informational messages, help text, neutral notifications

### Using Colors

**✅ DO:**
```css
.my-component {
    background: var(--surface-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
}
```

**❌ DON'T:**
```css
.my-component {
    background: #f8fafc;  /* Hardcoded! */
    color: #1e293b;        /* Won't respect theme! */
}
```

---

## Component Classes

Use semantic component classes for common UI patterns.

### Status Badges

```html
<span class="status-badge status-badge-added">added</span>
<span class="status-badge status-badge-deleted">deleted</span>
<span class="status-badge status-badge-renamed">moved</span>
<span class="status-badge status-badge-modified">modified</span>
```

**CSS:**
```css
.status-badge {
    display: inline-block;
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    flex-shrink: 0;
}

.status-badge-added {
    background-color: var(--semantic-success-bg-subtle);
    color: var(--semantic-success-text-strong);
}
```

### File Stats

```html
<span class="file-stat file-stat-addition">+5</span>
<span class="file-stat file-stat-deletion">-3</span>
```

**CSS:**
```css
.file-stat {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
}

.file-stat-addition {
    background-color: var(--semantic-success-bg-medium);
    color: var(--semantic-success-text-strong);
}
```

### Creating New Component Classes

When creating new component classes:

1. **Choose a semantic name** - Describe what it is, not how it looks
2. **Use CSS variables** - Never hardcode colors
3. **Keep it simple** - One component, one responsibility
4. **Document it** - Add to this guide

**Example:**
```css
/* Button component */
.btn-primary {
    background: var(--interactive-primary);
    color: var(--text-inverted);
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    border: none;
    cursor: pointer;
}

.btn-primary:hover {
    background: var(--interactive-primary-hover);
}

.btn-primary:disabled {
    background: var(--interactive-disabled);
    cursor: not-allowed;
}
```

---

## Tailwind Usage

Tailwind provides **utility classes only**. It does NOT handle theming.

### What Tailwind IS for:

✅ **Layout:** `flex`, `grid`, `space-x-4`, `gap-2`
✅ **Spacing:** `p-4`, `m-2`, `px-3`, `py-1`
✅ **Typography:** `text-sm`, `text-xs`, `font-semibold`, `font-mono`
✅ **Display:** `block`, `hidden`, `inline-block`
✅ **Positioning:** `relative`, `absolute`, `top-0`
✅ **Borders:** `rounded`, `rounded-lg`, `border`
✅ **Flexbox/Grid:** `items-center`, `justify-between`, `flex-1`

### What Tailwind is NOT for:

❌ **Colors** - Use CSS variables
❌ **Theming** - Use `[data-theme="dark"]`
❌ **Complex components** - Use semantic classes

### Example Usage

**✅ GOOD:**
```html
<div class="flex items-center space-x-2 p-4">
    <span class="status-badge status-badge-added">added</span>
    <span class="text-sm font-mono">file.txt</span>
</div>
```

**❌ BAD:**
```html
<div class="bg-green-100 text-green-800 p-2">
    <!-- Don't use Tailwind color utilities! -->
</div>
```

---

## Best Practices

### 1. Always Use CSS Variables for Colors

**✅ DO:**
```css
.component {
    color: var(--text-primary);
}
```

**❌ DON'T:**
```css
.component {
    color: #1e293b;
}
```

### 2. Avoid !important

Only use `!important` when absolutely necessary to override third-party CSS or fix cascade issues. Document why it's needed.

**✅ Acceptable:**
```css
/* Override Highlight.js default background */
.hljs {
    background: var(--diff-context-bg) !important;  /* Needed to override library default */
}
```

**❌ Avoid:**
```css
.component {
    color: var(--text-primary) !important;  /* Unnecessary */
}
```

### 3. Semantic Class Names

**✅ DO:**
```css
.status-badge-added { }
.file-stat-deletion { }
.diff-line-addition { }
```

**❌ DON'T:**
```css
.green-badge { }
.red-text { }
.bg-light-gray { }
```

### 4. Component Organization

Group related styles together and add comments:

```css
/* === FILE DIFF CONTAINER === */
.file-diff {
    background: var(--surface-secondary);
    border: 1px solid var(--border-default);
    border-radius: 0.5rem;
}

.file-header {
    padding: 1rem;
    cursor: pointer;
}

.file-header:hover {
    background: var(--surface-tertiary);
}

/* === DIFF LINES === */
.diff-line {
    display: grid;
    grid-template-columns: 4rem 4rem 1fr;
}
```

---

## Common Patterns

### Pattern 1: Status Indicators

```html
<!-- Use semantic badge classes -->
<span class="status-badge status-badge-added">added</span>
<span class="status-badge status-badge-deleted">deleted</span>
```

### Pattern 2: Interactive Elements

```css
.interactive-element {
    color: var(--text-secondary);
    cursor: pointer;
}

.interactive-element:hover {
    color: var(--text-primary);
    background: var(--surface-tertiary);
}
```

### Pattern 3: Cards/Panels

```css
.panel {
    background: var(--surface-secondary);
    border: 1px solid var(--border-default);
    border-radius: 0.5rem;
    padding: 1rem;
}
```

---

## Dark Mode

Dark mode is handled entirely through CSS variables.

### How It Works

1. Light theme variables defined in `:root`
2. Dark theme variables override in `[data-theme="dark"]`
3. Components use variables, themes switch automatically
4. JavaScript toggles `data-theme` attribute on `<html>`

### Example

```css
/* Light theme (default) */
:root {
    --surface-primary: #ffffff;
    --text-primary: #1e293b;
}

/* Dark theme (override) */
[data-theme="dark"] {
    --surface-primary: #0f172a;
    --text-primary: #f1f5f9;
}

/* Component uses variables */
body {
    background: var(--surface-primary);
    color: var(--text-primary);
}
/* Works in both themes automatically! */
```

### Testing Dark Mode

When creating new components, always test both themes:

1. Load page in light mode
2. Toggle to dark mode
3. Verify colors, contrast, readability
4. Check hover states, focus states
5. Verify no hardcoded colors

---

## Quick Reference

### Most Common Variables

| Purpose | Variable | Light | Dark |
|---------|----------|-------|------|
| Page background | `--surface-primary` | White | Very dark |
| Card background | `--surface-secondary` | Light gray | Dark gray |
| Main text | `--text-primary` | Dark | Light |
| Secondary text | `--text-secondary` | Gray | Light gray |
| Border | `--border-default` | Light gray | Medium gray |
| Primary button | `--interactive-primary` | Blue | Brighter blue |

### Component Classes

| Component | Classes | Example |
|-----------|---------|---------|
| Status badge | `.status-badge .status-badge-added` | `<span class="status-badge status-badge-added">` |
| File stat | `.file-stat .file-stat-addition` | `<span class="file-stat file-stat-addition">` |

### Tailwind Utilities (Most Used)

| Category | Examples |
|----------|----------|
| Layout | `flex`, `grid`, `block`, `inline` |
| Spacing | `p-4`, `m-2`, `space-x-2`, `gap-4` |
| Typography | `text-sm`, `font-mono`, `font-semibold` |
| Flexbox | `items-center`, `justify-between`, `flex-1` |
| Borders | `rounded`, `rounded-lg`, `border` |

---

## Migration from Old System

If you find old code:

**Old (hardcoded colors):**
```css
background: #f8fafc;
color: #1e293b;
```

**New (CSS variables):**
```css
background: var(--surface-secondary);
color: var(--text-primary);
```

**Old (Tailwind color utilities):**
```html
<div class="bg-green-100 text-green-800">
```

**New (semantic classes):**
```html
<div class="status-badge status-badge-added">
```

---

## Contributing

When adding new styles:

1. **Check if a variable exists** - Browse `styles.css` variables section
2. **Use existing patterns** - Look for similar components
3. **Create semantic classes** - Not one-off inline styles
4. **Test both themes** - Light and dark
5. **Document new patterns** - Update this guide

### Checklist for New CSS

- [ ] Uses CSS variables (no hardcoded colors)
- [ ] Semantic class name
- [ ] Tested in light theme
- [ ] Tested in dark theme
- [ ] No unnecessary `!important`
- [ ] Commented if complex
- [ ] Added to this style guide (if new pattern)

---

## Resources

- **Color Variables:** See `src/difflicious/static/css/styles.css` (lines 19-397)
- **Component Classes:** See `src/difflicious/static/css/styles.css` (lines 399-463)
- **Tailwind Config:** See `tailwind.config.cjs`
- **CSS Rationalization:** See `docs/reports/2025-11-05-css-rationalization-analysis.md`

---

**Questions?** Check the CSS rationalization analysis document or ask in issues/discussions.
