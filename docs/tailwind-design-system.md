## Tailwind Design System (Extracted)

This document captures the existing design system already present in the app
and shows how it is now applied via CVA-style class recipes for consistency.

### 1) Tokens (CSS Variables)

Defined in `src/difflicious/static/css/styles.css` under `:root` and
`[data-theme="dark"]`.

- Surfaces: `--surface-*` (primary, secondary, tertiary, raised, sunken, overlay)
- Text: `--text-*` (primary, secondary, tertiary, disabled, inverted)
- Borders: `--border-*` (default, strong, subtle, interactive)
- Interactive: `--interactive-*` (primary, hover, active, secondary, disabled)
- Focus: `--focus-*` (ring, border)
- Diff: `--diff-*` (addition, deletion, context, expanded, hunk expansion)
- Semantic: `--semantic-*` (success, danger, warning, info)
- Layout: `--spacing-*`, `--border-radius*`, `--box-shadow`

Legacy `--color-*` mappings are preserved for compatibility with current
Tailwind v3 usage.

#### Theme Palette Tokens (Light / Dark)

The themeful palette is defined via `--theme-*` variables. Light values live
under `:root`, and dark values override the same `--theme-*` variables under
`[data-theme="dark"]`. To create additional themes, override the `--theme-*`
palette only (the semantic tokens below reference these).

- Surfaces: `--theme-surface-primary`, `--theme-surface-secondary`,
  `--theme-surface-tertiary`, `--theme-surface-raised`,
  `--theme-surface-sunken`, `--theme-surface-overlay`
- Text: `--theme-text-primary`, `--theme-text-secondary`,
  `--theme-text-tertiary`, `--theme-text-disabled`, `--theme-text-inverted`
- Borders: `--theme-border-default`, `--theme-border-strong`,
  `--theme-border-subtle`, `--theme-border-interactive`
- Interactive: `--theme-interactive-primary`, `--theme-interactive-primary-hover`,
  `--theme-interactive-primary-active`, `--theme-interactive-secondary`,
  `--theme-interactive-secondary-hover`, `--theme-interactive-disabled`
- Focus: `--theme-focus-ring`, `--theme-focus-border`
- Diff: `--theme-diff-addition-bg`, `--theme-diff-addition-text`,
  `--theme-diff-addition-linenum-bg`, `--theme-diff-addition-linenum-text`,
  `--theme-diff-deletion-bg`, `--theme-diff-deletion-text`,
  `--theme-diff-deletion-linenum-bg`, `--theme-diff-deletion-linenum-text`,
  `--theme-diff-context-bg`, `--theme-diff-context-text`,
  `--theme-diff-context-linenum-bg`, `--theme-diff-context-linenum-text`,
  `--theme-diff-expanded-bg`, `--theme-diff-hunk-expansion-bg`,
  `--theme-diff-hunk-expansion-border`
- Semantic success: `--theme-semantic-success-bg-subtle`,
  `--theme-semantic-success-bg-medium`, `--theme-semantic-success-bg-strong`,
  `--theme-semantic-success-text`, `--theme-semantic-success-text-strong`,
  `--theme-semantic-success-border`
- Semantic danger: `--theme-semantic-danger-bg-subtle`,
  `--theme-semantic-danger-bg-medium`, `--theme-semantic-danger-bg-strong`,
  `--theme-semantic-danger-text`, `--theme-semantic-danger-text-strong`,
  `--theme-semantic-danger-text-medium`, `--theme-semantic-danger-border`
- Semantic warning: `--theme-semantic-warning-bg-subtle`,
  `--theme-semantic-warning-bg-medium`, `--theme-semantic-warning-text`,
  `--theme-semantic-warning-text-strong`, `--theme-semantic-warning-border`
- Semantic info: `--theme-semantic-info-bg-subtle`,
  `--theme-semantic-info-bg-medium`, `--theme-semantic-info-bg-strong`,
  `--theme-semantic-info-bg-stronger`, `--theme-semantic-info-text`,
  `--theme-semantic-info-text-medium`, `--theme-semantic-info-text-strong`,
  `--theme-semantic-info-border`
- Neutrals: `--theme-neutral-50`, `--theme-neutral-100`, `--theme-neutral-200`,
  `--theme-neutral-300`, `--theme-neutral-400`, `--theme-neutral-500`,
  `--theme-neutral-600`, `--theme-neutral-700`, `--theme-neutral-800`,
  `--theme-neutral-900`

#### Theme Palette Snapshot

These values live in `styles.css` under `:root` (light) and
`[data-theme="dark"]` (dark). Use them as the base palette when creating
additional themes.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--theme-surface-primary` | `#ffffff` | `#0f172a` | Page background |
| `--theme-surface-secondary` | `#f8fafc` | `#1e293b` | Cards/panels |
| `--theme-text-primary` | `#1e293b` | `#f1f5f9` | Main text |
| `--theme-text-secondary` | `#64748b` | `#cbd5e1` | Secondary text |
| `--theme-border-default` | `#e2e8f0` | `#475569` | Default borders |
| `--theme-interactive-primary` | `#2563eb` | `#3b82f6` | Primary action |
| `--theme-interactive-primary-hover` | `#1d4ed8` | `#2563eb` | Primary hover |
| `--theme-focus-ring` | `#3b82f6` | `#60a5fa` | Focus ring |
| `--theme-semantic-danger-bg-subtle` | `#fee2e2` | `#4e2f44` | Catastrophic bg |
| `--theme-semantic-danger-text` | `#dc2626` | `#f87171` | Catastrophic text |

#### Color Tokens (Explicit List)

- Surfaces: `--surface-primary`, `--surface-secondary`, `--surface-tertiary`,
  `--surface-raised`, `--surface-sunken`, `--surface-overlay`
- Text: `--text-primary`, `--text-secondary`, `--text-tertiary`,
  `--text-disabled`, `--text-inverted`
- Borders: `--border-default`, `--border-strong`, `--border-subtle`,
  `--border-interactive`
- Interactive: `--interactive-primary`, `--interactive-primary-hover`,
  `--interactive-primary-active`, `--interactive-secondary`,
  `--interactive-secondary-hover`, `--interactive-disabled`
- Focus: `--focus-ring`, `--focus-border`
- Diff: `--diff-addition-bg`, `--diff-addition-text`,
  `--diff-addition-linenum-bg`, `--diff-addition-linenum-text`,
  `--diff-deletion-bg`, `--diff-deletion-text`,
  `--diff-deletion-linenum-bg`, `--diff-deletion-linenum-text`,
  `--diff-context-bg`, `--diff-context-text`,
  `--diff-context-linenum-bg`, `--diff-context-linenum-text`,
  `--diff-expanded-bg`, `--diff-hunk-expansion-bg`,
  `--diff-hunk-expansion-border`
- Semantic success: `--semantic-success-bg-subtle`,
  `--semantic-success-bg-medium`, `--semantic-success-bg-strong`,
  `--semantic-success-text`, `--semantic-success-text-strong`,
  `--semantic-success-border`
- Semantic danger: `--semantic-danger-bg-subtle`,
  `--semantic-danger-bg-medium`, `--semantic-danger-bg-strong`,
  `--semantic-danger-text`, `--semantic-danger-text-strong`,
  `--semantic-danger-text-medium`, `--semantic-danger-border`
- Semantic warning: `--semantic-warning-bg-subtle`,
  `--semantic-warning-bg-medium`, `--semantic-warning-text`,
  `--semantic-warning-text-strong`, `--semantic-warning-border`
- Semantic info: `--semantic-info-bg-subtle`, `--semantic-info-bg-medium`,
  `--semantic-info-bg-strong`, `--semantic-info-bg-stronger`,
  `--semantic-info-text`, `--semantic-info-text-medium`,
  `--semantic-info-text-strong`, `--semantic-info-border`
- Legacy base colors: `--color-primary`, `--color-primary-hover`,
  `--color-success`, `--color-danger`, `--color-warning`
- Legacy neutrals: `--color-neutral-50`, `--color-neutral-100`,
  `--color-neutral-200`, `--color-neutral-300`, `--color-neutral-400`,
  `--color-neutral-500`, `--color-neutral-600`, `--color-neutral-700`,
  `--color-neutral-800`, `--color-neutral-900`

### 2) Tailwind Integration

`tailwind.config.cjs` is configured to use CSS variables for colors and
adds semantic info backgrounds/text.

- `info-bg` / `info-text` map to `--color-info-*` variables.
- `fontFamily.mono` maps to `--font-family-mono`.

### 3) Component Classes (Semantic)

Existing semantic component classes in `styles.css`:

- `.status-badge` + variants (`-added`, `-deleted`, `-renamed`, `-modified`)
- `.file-stat` + variants (`-addition`, `-deletion`)

### 4) CVA-style Class Recipes

To standardize utility composition without a bundler, a lightweight CVA-style
helper is provided in:

- `src/difflicious/static/js/modules/design-system.js`

It exports reusable class recipes used in UI generation:

- `diffLine` — base line layout with tone/border variants
- `diffSide` — left/right side layout with background variants
- `lineNum` — line-number column
- `lineContent` — line content container
- `statusPanel` — loading/empty/error panels
- `actionButton` — action buttons with intent variants

### 5) Application

These recipes are now applied to JavaScript-rendered UI:

- `src/difflicious/static/js/modules/context-expansion-ui.js`
- `src/difflicious/static/js/modules/full-diff.js`

This replaces repeated class strings with centralized variants while keeping
the existing Tailwind v3 + CSS variable system intact.
