# Color Audit - Difflicious CSS

**Date:** 2025-11-05
**Purpose:** Complete audit of all colors in use before Phase 2 refactoring

## Summary

- **Total unique hex colors:** 66
- **Current CSS variables:** 80+
- **Hardcoded colors:** 15+ instances
- **Main issue:** Numeric scales (neutral-50 to neutral-900) invert in dark mode, making them confusing

## Current Color System

### Light Theme Base Colors

```css
/* Primary/Interactive */
--color-primary: #2563eb (blue-600)
--color-primary-hover: #1d4ed8 (blue-700)

/* Surfaces */
--color-bg: #ffffff (white)
--color-bg-secondary: #f8fafc (slate-50)
--color-bg-tertiary: #f1f5f9 (slate-100)

/* Text */
--color-text: #1e293b (slate-800)
--color-text-secondary: #64748b (slate-500)

/* Borders */
--color-border: #e2e8f0 (slate-200)
--color-border-hover: #cbd5e1 (slate-300)
```

### Dark Theme Base Colors

```css
/* Surfaces - note values are darker, not lighter! */
--color-bg: #0f172a (slate-900)
--color-bg-secondary: #1e293b (slate-800)
--color-bg-tertiary: #334155 (slate-700)

/* Text - note values are lighter! */
--color-text: #f1f5f9 (slate-100)
--color-text-secondary: #94a3b8 (slate-400)
```

### Problem: Inverted Neutral Scale

The neutral scale gets **inverted** in dark mode:

| Variable | Light Value | Dark Value | Problem |
|----------|-------------|------------|---------|
| `--color-neutral-50` | `#f9fafb` (lightest) | `#1e293b` (dark!) | Inverted! |
| `--color-neutral-100` | `#f3f4f6` (very light) | `#334155` (darker) | Inverted! |
| `--color-neutral-700` | `#374151` (dark) | `#cbd5e1` (light!) | Inverted! |
| `--color-neutral-900` | `#111827` (darkest) | `#f1f5f9` (light!) | Inverted! |

**Why this is confusing:**
- In light mode: `neutral-50` = light
- In dark mode: `neutral-50` = dark
- Developers can't predict what color they'll get
- Numbers have no semantic meaning

## Diff-Specific Colors

### Light Theme Diff Colors
```css
/* Additions (green) */
--color-diff-addition-bg: #bbf7d0 (green-200)
--color-diff-addition-text: #059669 (green-600)

/* Deletions (red) */
--color-diff-deletion-bg: #fecaca (red-200)
--color-diff-deletion-text: #dc2626 (red-600)

/* Context */
--color-diff-context-bg: #ffffff (white)
--color-diff-context-text: #64748b (slate-500)

/* Expanded context */
--color-expanded-context-bg: #f9fafb (slate-50)
```

### Dark Theme Diff Colors
```css
/* Additions */
--color-diff-addition-bg: #2e5e44 (custom dark green)
--color-diff-addition-text: #4ade80 (green-400)

/* Deletions */
--color-diff-deletion-bg: #4e2f44 (custom dark red)
--color-diff-deletion-text: #f87171 (red-400)

/* Context */
--color-diff-context-bg: #020408 (very dark slate)
--color-diff-context-text: #94a3b8 (slate-400)
```

## Hardcoded Colors (Not in Variables)

These colors appear directly in CSS rules with `!important`:

### Dark Theme Only
```css
#1a2332 - Line number background in diff (dark mode)
#2d3748 - Hunk expansion background (dark mode)
#4a5568 - Hunk expansion border (dark mode)
#2a1f24 - Diff line content red background (dark mode)
#2e3f34 - Diff line content green background (dark mode)
#5e2f34 - Diff line number red background (dark mode)
#3e6e54 - Diff line number green background (dark mode)
#0a0f1a - Darker surface for buttons/pills (dark mode)
```

**These need to be converted to variables!**

## Semantic Color Breakdown

### Success Colors (Green)
```css
Light:
--color-success: #059669
--color-success-bg: #bbf7d0
--color-success-bg-50: #bbf7d0 (duplicate!)
--color-success-bg-100: #86efac
--color-success-bg-300: #4ade80
--color-success-text: #059669 (duplicate!)
--color-success-text-600: #059669 (duplicate!)
--color-success-text-800: #065f46

Dark:
--color-success: #10b981
--color-success-bg: #2e5e44
--color-success-text: #10b981
--color-success-text-600: #10b981
--color-success-text-800: #34d399
```

**Issue:** Lots of duplicates (-bg and -bg-50, -text and -text-600)

### Danger Colors (Red)
```css
Light:
--color-danger: #dc2626
--color-danger-bg: #fecaca
--color-danger-bg-50: #fecaca (duplicate!)
--color-danger-bg-100: #fca5a5
--color-danger-bg-200: #f87171
--color-danger-bg-300: #ef4444
--color-danger-text: #ef4444
--color-danger-text-strong: #dc2626
--color-danger-text-600: #dc2626
--color-danger-text-500: #ef4444 (duplicate with -text!)
--color-danger-text-700: #b91c1c

Dark:
--color-danger: #ef4444
--color-danger-bg: #4e2f44
--color-danger-text: #f87171
--color-danger-text-strong: #fca5a5
```

**Issue:** Too many shades, unclear which to use when

### Warning Colors (Yellow/Orange)
```css
Light:
--color-warning: #d97706
--color-warning-bg-100: #fef3c7
--color-warning-text-800: #92400e

Dark:
--color-warning: #f59e0b
--color-warning-bg-100: #fef3c7 (SAME as light!)
--color-warning-text-800: #ca8a04
```

**Issue:** Light mode warning-bg leaked into dark mode

### Info Colors (Blue)
```css
Light:
--color-info-bg: #eff6ff
--color-info-bg-50: #eff6ff (duplicate!)
--color-info-bg-100: #dbeafe
--color-info-bg-200: #bfdbfe
--color-info-bg-300: #93c5fd
--color-info-text: #1e40af
--color-info-text-600: #2563eb
--color-info-text-800: #1e40af (duplicate!)

Dark:
--color-info-bg: #1e293b
--color-info-text: #60a5fa
```

## Complete Color Mapping

### Slate/Neutral Colors (Gray Scale)

| Hex | Tailwind Name | Used For |
|-----|---------------|----------|
| #f9fafb | slate-50 | Light: neutral-50, expanded context |
| #f8fafc | slate-50 (alt) | Light: bg-secondary |
| #f3f4f6 | gray-100 | Light: neutral-100 |
| #f1f5f9 | slate-100 | Light: bg-tertiary, Dark: text primary |
| #e5e7eb | gray-200 | Light: neutral-200 |
| #e2e8f0 | slate-200 | Light: borders |
| #d1d5db | gray-300 | Light: neutral-300 |
| #cbd5e1 | slate-300 | Light: border-hover, Dark: neutral-700 |
| #9ca3af | gray-400 | Light: neutral-400 |
| #94a3b8 | slate-400 | Light: text-secondary, Dark: text-secondary |
| #6b7280 | gray-500 | Light: neutral-500 |
| #64748b | slate-500 | Light/Dark: context text, Dark: neutral-500 |
| #4b5563 | gray-600 | Light: neutral-600 |
| #475569 | slate-600 | Dark: borders, neutral-600 |
| #374151 | gray-700 | Light: neutral-700 |
| #334155 | slate-700 | Dark: bg-tertiary, neutral-100 |
| #1f2937 | gray-800 | Light: neutral-800 |
| #1e293b | slate-800 | Light: text, Dark: bg-secondary, neutral-50 |
| #111827 | gray-900 | Light: neutral-900 |
| #0f172a | slate-900 | Dark: bg primary |

### Green Colors (Success/Addition)

| Hex | Tailwind Name | Used For |
|-----|---------------|----------|
| #bbf7d0 | green-200 | Light: success-bg, diff-addition-bg |
| #86efac | green-300 | Light: success-bg-100 |
| #4ade80 | green-400 | Light: success-bg-300, Dark: diff-addition-text |
| #34d399 | green-400 (alt) | Dark: success-text-800 |
| #10b981 | green-500 | Dark: success colors |
| #059669 | green-600 | Light: success colors, diff-addition-text |
| #065f46 | green-800 | Light: success-text-800 |
| #2e5e44 | custom | Dark: diff-addition-bg |
| #2e3f34 | custom | Dark: line content green |
| #3e6e54 | custom | Dark: line num green, success-bg-100 |
| #4e7e64 | custom | Dark: success-bg-300 |

### Red Colors (Danger/Deletion)

| Hex | Tailwind Name | Used For |
|-----|---------------|----------|
| #fecaca | red-200 | Light: danger-bg, diff-deletion-bg |
| #fca5a5 | red-300 | Light: danger-bg-100, Dark: danger-text-strong |
| #f87171 | red-400 | Light: danger-bg-200, Dark: danger/deletion text |
| #ef4444 | red-500 | Light: danger-text, danger-bg-300, Dark: danger |
| #dc2626 | red-600 | Light: danger, diff-deletion-text |
| #b91c1c | red-700 | Light: danger-text-700 |
| #4e2f44 | custom | Dark: diff-deletion-bg |
| #2a1f24 | custom | Dark: line content red |
| #5e2f34 | custom | Dark: line num red |
| #5e3f54 | custom | Dark: danger-bg-100 |
| #6e4f64 | custom | Dark: danger-bg-200 |
| #7e5f74 | custom | Dark: danger-bg-300 |

### Blue Colors (Primary/Info)

| Hex | Tailwind Name | Used For |
|-----|---------------|----------|
| #eff6ff | blue-50 | Light: info-bg |
| #dbeafe | blue-100 | Light: info-bg-100 |
| #bfdbfe | blue-200 | Light: info-bg-200 |
| #93c5fd | blue-300 | Light: info-bg-300 |
| #60a5fa | blue-400 | Dark: info-text, focus-ring |
| #3b82f6 | blue-500 | Dark: primary, focus colors |
| #2563eb | blue-600 | Light: primary, info-text-600 |
| #1e40af | blue-800 | Light: info-text |
| #1d4ed8 | blue-700 | Light: primary-hover, Dark: primary-hover |

### Yellow/Orange Colors (Warning)

| Hex | Tailwind Name | Used For |
|-----|---------------|----------|
| #fef3c7 | amber-100 | Light/Dark: warning-bg-100 |
| #fbbf24 | amber-400 | Dark: numbers in syntax highlighting |
| #f59e0b | amber-500 | Dark: warning |
| #d97706 | amber-600 | Light: warning |
| #ca8a04 | amber-700 | Dark: warning-text-800 |
| #92400e | amber-900 | Light: warning-text-800 |

### Pink Colors (Syntax Highlighting)

| Hex | Tailwind Name | Used For |
|-----|---------------|----------|
| #f472b6 | pink-400 | Dark: keywords in syntax highlighting |

### Cyan Colors (Syntax Highlighting)

| Hex | Tailwind Name | Used For |
|-----|---------------|----------|
| #a5f3fc | cyan-200 | Dark: strings in syntax highlighting |

### Custom Dark Colors (Not in Tailwind)

| Hex | Purpose |
|-----|---------|
| #020408 | Very dark diff context background |
| #0a0f1a | Darker than slate-900, for buttons/pills |
| #1a2332 | Line numbers in diff (darker than slate-800) |
| #2d3748 | Hunk expansion background (gray-700 alt) |
| #4a5568 | Hunk expansion border (gray-600 alt) |

## Problems Identified

### 1. Redundant Variables
- `--color-danger-bg` and `--color-danger-bg-50` are identical
- `--color-success-text` and `--color-success-text-600` are identical
- `--color-info-bg` and `--color-info-bg-50` are identical
- Many `-text` and `-text-{number}` variants that point to same color

### 2. Inconsistent Naming
- Some variables use semantic names: `--color-success`
- Some use numeric scales: `--color-neutral-50`
- Some use both: `--color-danger-bg-100`

### 3. Inverted Scales
- Neutral scale numbers flip meaning in dark mode
- `neutral-50` = light in light mode, dark in dark mode
- Impossible to reason about without checking both themes

### 4. Hardcoded Values
- 8+ custom colors only exist as hex codes with `!important`
- No way to reference them elsewhere
- Not documented in color system

### 5. Unclear Purpose
- Is `--color-neutral-200` for borders? backgrounds? text?
- What's the difference between `--color-danger-text` and `--color-danger-text-600`?
- When do I use `--color-bg-secondary` vs `--color-neutral-50`?

## Proposed Solution

Create a semantic color system where:
1. **Names describe purpose**, not just numbers
2. **No inversion** - primary colors stay primary in both themes
3. **Clear hierarchy** - base/hover/active states are obvious
4. **All colors in variables** - no hardcoded hex codes
5. **Backwards compatibility** - old variables aliased to new ones during transition

See Phase 2 implementation for the new system.
