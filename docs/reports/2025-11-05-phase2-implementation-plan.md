# Phase 2 Implementation Plan: Semantic Color Variables

**Date:** 2025-11-05
**Status:** In Progress

## Strategy

### Core Principle
**Change variable NAMES only, not COLOR VALUES.** Visual appearance must remain identical.

### Approach
1. Define new semantic color system with clear names
2. Keep ALL existing variables for backwards compatibility
3. Map old variables to reference new variables
4. Add comprehensive comments explaining the system
5. Document all hardcoded colors as variables
6. Verify visual appearance unchanged

## New Semantic Color System

### Naming Convention

**Pattern:** `--{category}-{purpose}[-variant][-state]`

**Categories:**
- `surface` - Background colors
- `text` - Text colors
- `border` - Border colors
- `interactive` - Clickable elements
- `diff` - Diff-specific colors
- `semantic` - Success/danger/warning/info

**Examples:**
- `--surface-primary` - Main background
- `--text-secondary` - Secondary text
- `--border-strong` - Emphasized borders
- `--interactive-hover` - Hover state for buttons
- `--diff-addition-bg` - Background for added lines
- `--semantic-success-text` - Success message text

## New Variable Definitions

###  Light Theme

```css
:root {
    /* === SURFACES (Backgrounds) === */
    --surface-primary: #ffffff;           /* Main page background */
    --surface-secondary: #f8fafc;         /* Cards, panels */
    --surface-tertiary: #f1f5f9;          /* Hover states, wells */
    --surface-raised: #ffffff;            /* Elevated elements */
    --surface-sunken: #f9fafb;            /* Depressed wells, inputs */
    --surface-overlay: #f9fafb;           /* Overlays, modals */

    /* === TEXT === */
    --text-primary: #1e293b;              /* Main text */
    --text-secondary: #64748b;            /* Secondary text */
    --text-tertiary: #94a3b8;             /* Deemphasized text */
    --text-disabled: #cbd5e1;             /* Disabled state */
    --text-inverted: #ffffff;             /* Text on dark backgrounds */

    /* === BORDERS === */
    --border-default: #e2e8f0;            /* Standard borders */
    --border-strong: #cbd5e1;             /* Emphasized borders */
    --border-subtle: #f1f5f9;             /* Subtle dividers */
    --border-interactive: #94a3af;        /* Interactive element borders */

    /* === INTERACTIVE (Buttons, Links) === */
    --interactive-primary: #2563eb;       /* Primary actions */
    --interactive-primary-hover: #1d4ed8; /* Primary hover */
    --interactive-primary-active: #1e40af;/* Primary active/pressed */
    --interactive-secondary: #64748b;     /* Secondary actions */
    --interactive-disabled: #cbd5e1;      /* Disabled state */

    /* === FOCUS STATES === */
    --focus-ring: #3b82f6;                /* Focus outline color */
    --focus-border: #2563eb;              /* Focus border color */

    /* === DIFF COLORS === */
    --diff-addition-bg: #bbf7d0;          /* Added line background */
    --diff-addition-text: #059669;        /* Added line text */
    --diff-addition-linenum-bg: #86efac;  /* Added line number bg */
    --diff-addition-linenum-text: #065f46;/* Added line number text */

    --diff-deletion-bg: #fecaca;          /* Deleted line background */
    --diff-deletion-text: #dc2626;        /* Deleted line text */
    --diff-deletion-linenum-bg: #fca5a5;  /* Deleted line number bg */
    --diff-deletion-linenum-text: #b91c1c;/* Deleted line number text */

    --diff-context-bg: #ffffff;           /* Context line background */
    --diff-context-text: #64748b;         /* Context line text */
    --diff-context-linenum-bg: #f3f4f6;   /* Context line number bg */
    --diff-context-linenum-text: #9ca3af; /* Context line number text */

    --diff-expanded-bg: #f9fafb;          /* Expanded context background */
    --diff-hunk-expansion-bg: #eff6ff;    /* Hunk expansion area */
    --diff-hunk-expansion-border: #bfdbfe;/* Hunk expansion border */

    /* === SEMANTIC COLORS === */
    /* Success (Green) */
    --semantic-success-bg-subtle: #bbf7d0;
    --semantic-success-bg-medium: #86efac;
    --semantic-success-bg-strong: #4ade80;
    --semantic-success-text: #059669;
    --semantic-success-text-strong: #065f46;
    --semantic-success-border: #86efac;

    /* Danger (Red) */
    --semantic-danger-bg-subtle: #fecaca;
    --semantic-danger-bg-medium: #fca5a5;
    --semantic-danger-bg-strong: #f87171;
    --semantic-danger-text: #dc2626;
    --semantic-danger-text-strong: #b91c1c;
    --semantic-danger-border: #f87171;

    /* Warning (Yellow/Orange) */
    --semantic-warning-bg-subtle: #fef3c7;
    --semantic-warning-bg-medium: #fde68a;
    --semantic-warning-text: #d97706;
    --semantic-warning-text-strong: #92400e;
    --semantic-warning-border: #fcd34d;

    /* Info (Blue) */
    --semantic-info-bg-subtle: #eff6ff;
    --semantic-info-bg-medium: #dbeafe;
    --semantic-info-bg-strong: #bfdbfe;
    --semantic-info-text: #1e40af;
    --semantic-info-text-strong: #1e3a8a;
    --semantic-info-border: #93c5fd;
}
```

### Dark Theme

```css
[data-theme="dark"] {
    /* === SURFACES (Backgrounds) === */
    --surface-primary: #0f172a;           /* Main page background */
    --surface-secondary: #1e293b;         /* Cards, panels */
    --surface-tertiary: #334155;          /* Hover states, wells */
    --surface-raised: #1e293b;            /* Elevated elements */
    --surface-sunken: #0a0f1a;            /* Depressed wells, inputs */
    --surface-overlay: #1e293b;           /* Overlays, modals */

    /* === TEXT === */
    --text-primary: #f1f5f9;              /* Main text */
    --text-secondary: #cbd5e1;            /* Secondary text */
    --text-tertiary: #94a3b8;             /* Deemphasized text */
    --text-disabled: #64748b;             /* Disabled state */
    --text-inverted: #0f172a;             /* Text on light backgrounds */

    /* === BORDERS === */
    --border-default: #334155;            /* Standard borders */
    --border-strong: #475569;             /* Emphasized borders */
    --border-subtle: #1e293b;             /* Subtle dividers */
    --border-interactive: #475569;        /* Interactive element borders */

    /* === INTERACTIVE (Buttons, Links) === */
    --interactive-primary: #3b82f6;       /* Primary actions */
    --interactive-primary-hover: #2563eb; /* Primary hover */
    --interactive-primary-active: #1d4ed8;/* Primary active/pressed */
    --interactive-secondary: #94a3b8;     /* Secondary actions */
    --interactive-disabled: #475569;      /* Disabled state */

    /* === FOCUS STATES === */
    --focus-ring: #60a5fa;                /* Focus outline color */
    --focus-border: #3b82f6;              /* Focus border color */

    /* === DIFF COLORS === */
    --diff-addition-bg: #2e5e44;          /* Added line background */
    --diff-addition-text: #4ade80;        /* Added line text */
    --diff-addition-linenum-bg: #3e6e54;  /* Added line number bg */
    --diff-addition-linenum-text: #86efac;/* Added line number text */

    --diff-deletion-bg: #4e2f44;          /* Deleted line background */
    --diff-deletion-text: #f87171;        /* Deleted line text */
    --diff-deletion-linenum-bg: #5e2f34;  /* Deleted line number bg */
    --diff-deletion-linenum-text: #fca5a5;/* Deleted line number text */

    --diff-context-bg: #020408;           /* Context line background */
    --diff-context-text: #94a3b8;         /* Context line text */
    --diff-context-linenum-bg: #1a2332;   /* Context line number bg */
    --diff-context-linenum-text: #64748b; /* Context line number text */

    --diff-expanded-bg: #1e293b;          /* Expanded context background */
    --diff-hunk-expansion-bg: #2d3748;    /* Hunk expansion area */
    --diff-hunk-expansion-border: #4a5568;/* Hunk expansion border */

    /* === SEMANTIC COLORS === */
    /* Success (Green) */
    --semantic-success-bg-subtle: #2e5e44;
    --semantic-success-bg-medium: #3e6e54;
    --semantic-success-bg-strong: #4e7e64;
    --semantic-success-text: #10b981;
    --semantic-success-text-strong: #34d399;
    --semantic-success-border: #3e6e54;

    /* Danger (Red) */
    --semantic-danger-bg-subtle: #4e2f44;
    --semantic-danger-bg-medium: #5e3f54;
    --semantic-danger-bg-strong: #6e4f64;
    --semantic-danger-text: #f87171;
    --semantic-danger-text-strong: #fca5a5;
    --semantic-danger-border: #7e5f74;

    /* Warning (Yellow/Orange) */
    --semantic-warning-bg-subtle: #4a3f2e;
    --semantic-warning-bg-medium: #5a4f3e;
    --semantic-warning-text: #f59e0b;
    --semantic-warning-text-strong: #fbbf24;
    --semantic-warning-border: #fbbf24;

    /* Info (Blue) */
    --semantic-info-bg-subtle: #1e293b;
    --semantic-info-bg-medium: #334155;
    --semantic-info-bg-strong: #475569;
    --semantic-info-text: #60a5fa;
    --semantic-info-text-strong: #93c5fd;
    --semantic-info-border: #64748b;
}
```

## Backwards Compatibility Mappings

All existing variables will remain and map to the new semantic variables:

```css
/* === OLD VARIABLES (Backwards Compatibility) === */
/* These map to the new semantic variables above */

/* Base colors - map to new names */
--color-primary: var(--interactive-primary);
--color-primary-hover: var(--interactive-primary-hover);
--color-success: var(--semantic-success-text);
--color-danger: var(--semantic-danger-text);
--color-warning: var(--semantic-warning-text);

/* Backgrounds */
--color-bg: var(--surface-primary);
--color-bg-secondary: var(--surface-secondary);
--color-bg-tertiary: var(--surface-tertiary);

/* Text */
--color-text: var(--text-primary);
--color-text-secondary: var(--text-secondary);

/* Borders */
--color-border: var(--border-default);
--color-border-hover: var(--border-strong);

/* Diff colors */
--color-diff-addition-bg: var(--diff-addition-bg);
--color-diff-addition-text: var(--diff-addition-text);
--color-diff-deletion-bg: var(--diff-deletion-bg);
--color-diff-deletion-text: var(--diff-deletion-text);
--color-diff-context-bg: var(--diff-context-bg);
--color-diff-context-text: var(--diff-context-text);
--color-expanded-context-bg: var(--diff-expanded-bg);

/* Neutral colors - keep for Tailwind compatibility */
--color-neutral-50: #f9fafb;  /* Light theme value */
--color-neutral-100: #f3f4f6;
/* ... etc (all neutral colors remain as-is for now) */

/* Semantic color backgrounds */
--color-danger-bg: var(--semantic-danger-bg-subtle);
--color-danger-bg-50: var(--semantic-danger-bg-subtle);
--color-danger-bg-100: var(--semantic-danger-bg-medium);
/* ... etc */
```

## Benefits of New System

### 1. Clear Purpose
- `--surface-primary` is obviously a background
- `--text-secondary` is obviously for secondary text
- `--diff-addition-linenum-bg` is obviously for added line numbers background

### 2. No Inversion
- `--surface-primary` is the main background in BOTH themes
- `--text-primary` is the main text color in BOTH themes
- Numbers don't flip meaning

### 3. All Colors Named
- Previous hardcoded colors like `#1a2332` now have names
- `--diff-context-linenum-bg` in dark mode
- Can be referenced elsewhere in CSS

### 4. Reduced Redundancy
- Instead of 3 variables for same color, just one
- `--semantic-success-text` instead of `--color-success`, `--color-success-text`, `--color-success-text-600`

### 5. Backwards Compatible
- All old variables still work
- Templates don't need to change
- Migration can happen gradually

## Implementation Checklist

- [x] Audit all existing colors
- [ ] Add new semantic variables to styles.css
- [ ] Map old variables to new variables
- [ ] Add comprehensive comments
- [ ] Test visual appearance (light theme)
- [ ] Test visual appearance (dark theme)
- [ ] Run CI tests
- [ ] Document color system
- [ ] Commit changes

## Testing Plan

### Visual Verification
1. Start app in light mode
2. Verify all colors match current appearance
3. Toggle to dark mode
4. Verify all colors match current dark appearance
5. Test all interactive states (hover, focus, active)
6. Test diff view with additions/deletions
7. Test hunk expansion areas
8. Test semantic colors (success/danger/warning badges)

### Automated Tests
1. Run JavaScript tests
2. Run Python tests
3. Run linting (ruff, eslint)
4. Run formatting checks (black)

## Rollback Plan

If visual appearance changes unexpectedly:
1. All old variables still exist and work
2. Simply remove the new semantic variables
3. Remove the backwards compatibility mappings
4. CSS will revert to old system

## Future Phases

Phase 2 is just the foundation. Future phases will:
- Phase 3: Remove Tailwind custom colors (use new semantics)
- Phase 4: Convert templates to use semantic variables
- Phase 5: Remove old variable names (cleanup)
