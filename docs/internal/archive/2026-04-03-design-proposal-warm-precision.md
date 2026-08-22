# Difflicious — Design Proposal

> **Archived.** This document describes work that is finished or a direction that
> was not taken. It is kept for context and is not a description of current
> behaviour. See `docs/internal/archive/README.md`.

**Date:** 2026-04-03
**Status:** Proposal (not yet implemented)
**Aesthetic Direction:** Warm Precision

---

## Overview

Difflicious has a solid technical foundation: a clean semantic CSS variable system, good light/dark theme support, and a functional diff interface. But the visual identity is currently generic — it could be any developer tool. The typography uses system fonts, the toolbar has no brand presence, and the color palette plays it safe throughout.

This proposal introduces a cohesive aesthetic direction that feels **smooth and intentional without being institutional**. Developer tools can have personality. The name "Difflicious" invites it.

### Design Pillars

| Pillar | What it means |
|--------|---------------|
| **Warm Precision** | Crisp layout, generous whitespace, one warm amber accent |
| **Typographic Identity** | A distinctive wordmark font gives the app a face |
| **Depth Without Clutter** | Subtle shadows and layering instead of flat borders |
| **Purposeful Motion** | Quick, mechanical transitions — not bubbly or slow |
| **Semantic Color Restraint** | Amber accent reserved for brand/interactive; green/red kept pure for diff semantics |

---

## Current State Analysis

### What's Working

- **Semantic CSS variable system** — well-structured, easy to theme
- **Light/dark theme toggle** — correctly avoids FOUC, persists to localStorage
- **Diff colors** — the green/red palette is clean and readable
- **File expand/collapse transitions** — the scale+opacity combo is smooth
- **Search filtering** — keyboard shortcut, real-time, well implemented

### What Needs Work

| Area | Issue |
|------|-------|
| **Typography** | System fonts (`-apple-system, Roboto...`) for UI body — no personality |
| **Brand identity** | "Difflicious" is just `text-xl font-semibold` — no visual presence |
| **Toolbar** | Flat `bg-neutral-50` — indistinguishable from any CRUD app |
| **File cards** | No visual anchor for file status — the colored badge is easy to miss |
| **Hunk expansion** | The solid blue band is visually heavy and competes with diff content |
| **Light theme surfaces** | Pure `#ffffff` / `#f8fafc` — clinical, slightly cold |
| **Dark theme depth** | `#0f172a` is fine but could be richer/deeper |
| **Empty/loading states** | Functional but no brand personality |
| **Hover feedback** | Background color change only — no lift/shadow depth |

---

## Proposed Changes

### 1. Typography System

The single biggest impact-per-effort change.

#### Wordmark Font: Bricolage Grotesque

Use **Bricolage Grotesque** (Google Fonts) exclusively for the "Difflicious" name in the toolbar. It's a variable display grotesque with optical size variation — distinctive, slightly editorial, unmistakably designed. Nothing else in the UI uses it, which makes the name stand out.

```html
<!-- Add to Google Fonts URL -->
family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700
```

```css
.toolbar-wordmark {
    font-family: 'Bricolage Grotesque', sans-serif;
    font-size: 1.35rem;
    font-weight: 600;
    font-optical-sizing: auto;
    letter-spacing: -0.02em;
}
```

#### UI Body Font: Instrument Sans

Replace the system font stack with **Instrument Sans** (Google Fonts) for all UI chrome (labels, buttons, dropdowns, file paths in headers). It has slightly editorial proportions, a distinctive italic (visible in placeholder text), and reads as "designed" without calling attention to itself.

```html
<!-- Add to Google Fonts URL -->
family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400
```

```css
:root {
    --font-family-ui: 'Instrument Sans', 'DM Sans', system-ui, sans-serif;
}

body, .toolbar, .file-header, .status-badge {
    font-family: var(--font-family-ui);
}
```

#### Monospace: Keep JetBrains Mono (as default)

The current monospace handling via `DIFFLICIOUS_FONT` env var and Google Fonts CDN is excellent. No changes needed here.

---

### 2. Brand Accent Color

Introduce a single warm amber as the brand accent. It doesn't compete with the semantic green/red diff colors, which is critical.

```css
:root {
    --brand-amber:          #e8a027;
    --brand-amber-hover:    #cf8e22;
    --brand-amber-subtle:   #fef3d0;
    --brand-amber-border:   #f0c060;
}
```

**Where amber appears:**
- The 3px horizontal line at the bottom of the toolbar header
- Focus rings on all interactive elements (replacing the current blue focus ring)
- The "Show N more lines" expansion pill (replacing the blue band)
- Active state on the theme toggle button
- The wordmark `+−` prefix decoration

**What amber does NOT replace:**
- Green/red diff line backgrounds (semantic meaning — never touch these)
- Info blue in API messages
- Warning yellow in status badges

---

### 3. Toolbar Redesign

The toolbar is the face of the app. It needs to own its identity.

#### Changes

**a) Amber accent line**
A 3px bottom border in `--brand-amber`. Subtle but immediately distinctive. Like an editorial magazine header.

```css
.toolbar {
    border-bottom: 1px solid var(--theme-border-default);
    position: relative;
}
.toolbar::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--brand-amber);
}
```

**b) Wordmark treatment**
Add a small `±` prefix in amber before "Difflicious" in Bricolage Grotesque:

```html
<span class="toolbar-wordmark">
    <span class="toolbar-mark">±</span>Difflicious
</span>
```

```css
.toolbar-mark {
    color: var(--brand-amber);
    margin-right: 0.15em;
    font-weight: 400;
}
```

**c) Softer control styling**
Replace the current white/bordered inputs with slightly sunken pill controls:

```css
.toolbar select,
.toolbar input[type="text"] {
    background: var(--theme-surface-tertiary);
    border: 1px solid var(--theme-border-subtle);
    border-radius: 20px;        /* pill shape */
    padding: 6px 14px;
    font-family: var(--font-family-ui);
    font-size: 0.8125rem;
    transition: border-color 0.15s, box-shadow 0.15s;
}

.toolbar select:focus,
.toolbar input:focus {
    border-color: var(--brand-amber);
    box-shadow: 0 0 0 3px var(--brand-amber-subtle);
    outline: none;
}
```

**d) Height increase**
56px → 64px for more presence and breathing room.

---

### 4. Surface Colors (Warm Neutrals)

The current light theme uses pure cool grays (`#ffffff`, `#f8fafc`). Replacing with very slightly warmed equivalents reduces the institutional clinical feeling without visually changing the palette in a noticeable way.

```css
/* Light theme — warmed */
--theme-surface-primary:    #fafaf9;    /* was #ffffff — barely perceptible warmth */
--theme-surface-secondary:  #f4f4f2;    /* was #f8fafc */
--theme-surface-tertiary:   #eeeeec;    /* was #f1f5f9 */

/* Dark theme — deepened */
--theme-surface-primary:    #0b0f1e;    /* was #0f172a — deeper, richer navy */
--theme-surface-secondary:  #141929;    /* was #1e293b */
--theme-surface-tertiary:   #1e2740;    /* was #475569 */
```

---

### 5. File Card Redesign

The most impactful single change. Add a **3px left border strip** in the status color to each file card. This makes file status immediately scannable when scrolling through a long diff.

```css
.file-diff {
    border-left: 3px solid transparent;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.file-diff[data-status="added"]    { border-left-color: var(--theme-semantic-success-border); }
.file-diff[data-status="deleted"]  { border-left-color: var(--theme-semantic-danger-border); }
.file-diff[data-status="modified"] { border-left-color: var(--brand-amber-border); }
.file-diff[data-status="renamed"]  { border-left-color: #c4b5fd; /* violet-300 */ }
```

**Hover elevation:**
Replace background-color-only hover with a shadow lift:

```css
.file-header {
    transition: background-color 0.15s, box-shadow 0.15s;
}
.file-header:hover {
    background-color: var(--theme-surface-tertiary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
[data-theme="dark"] .file-header:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

---

### 6. Diff Line Colors (Softer Light Mode)

The current addition/deletion backgrounds (`#dcfce7` / `#fee2e2`) are accurate but slightly harsh for long review sessions. Softening them slightly reduces eye fatigue without losing semantic clarity.

```css
/* Light theme — softer diff colors */
--theme-diff-addition-bg:      #f0fdf4;    /* was #dcfce7 — softer green */
--theme-diff-deletion-bg:      #fff1f2;    /* was #fee2e2 — softer red */

/* Dark theme — keep rich colors, they read well against deep navy */
--theme-diff-addition-bg:      #1a3a2a;    /* unchanged */
--theme-diff-deletion-bg:      #3a1a1a;    /* unchanged */
```

**Context line text**
Make context text slightly more de-emphasized to sharpen the contrast between code changes and context:

```css
--theme-diff-context-text: #8896aa;  /* was #64748b — slightly lighter */
```

---

### 7. Hunk Expansion Controls (Amber Pill)

The current solid blue band (`#eff6ff` background spanning full width) is heavy and competes visually with the diff content. Replace it with a minimal horizontal rule + centered amber pill.

```css
.hunk-expansion {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 0;
    background: transparent;
    border: none;
}

.hunk-expansion::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 50%;
    height: 1px;
    background: var(--theme-border-default);
}

.hunk-expansion-btn {
    position: relative;  /* above the rule */
    z-index: 1;
    padding: 4px 16px;
    font-size: 0.75rem;
    font-family: var(--font-family-ui);
    color: var(--brand-amber-hover);
    background: var(--brand-amber-subtle);
    border: 1px solid var(--brand-amber-border);
    border-radius: 20px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
}

.hunk-expansion-btn:hover {
    background: #fde9a0;
    border-color: var(--brand-amber);
}
```

**Text change:**
Current: `▲` / `▼` arrow buttons with section info
Proposed: `Show 12 more lines ↑` — single readable pill per expansion direction

---

### 8. Empty State

The current empty state (emoji + text) is functional but forgettable.

**Proposed:**

```html
<div class="empty-state">
    <div class="empty-state-decoration">
        <div class="empty-line empty-line--add"></div>
        <div class="empty-line empty-line--ctx"></div>
        <div class="empty-line empty-line--del"></div>
        <div class="empty-line empty-line--ctx"></div>
        <div class="empty-line empty-line--add"></div>
    </div>
    <p class="empty-state-headline">Nothing to diff.</p>
    <p class="empty-state-sub">Your working tree is clean.</p>
</div>
```

```css
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 4rem 2rem;
    color: var(--theme-text-tertiary);
}

.empty-state-decoration {
    display: flex;
    flex-direction: column;
    gap: 4px;
    opacity: 0.4;
}

.empty-line {
    height: 8px;
    border-radius: 4px;
    animation: emptyPulse 2.4s ease-in-out infinite;
}
.empty-line--add  { width: 200px; background: var(--theme-diff-addition-linenum-bg); animation-delay: 0s; }
.empty-line--ctx  { width: 160px; background: var(--theme-diff-context-linenum-bg); animation-delay: 0.2s; }
.empty-line--del  { width: 180px; background: var(--theme-diff-deletion-linenum-bg); animation-delay: 0.4s; }

@keyframes emptyPulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.9; }
}

.empty-state-headline {
    font-family: var(--font-family-ui);
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--theme-text-secondary);
    margin: 0;
}

.empty-state-sub {
    font-family: var(--font-family-ui);
    font-size: 0.875rem;
    color: var(--theme-text-tertiary);
    margin: 0;
}
```

---

### 9. Motion Refinements

Keep the existing Alpine.js expand/collapse transitions — they're good. Add:

**Hover navigation arrows:**
```css
.file-nav-btn {
    transition: transform 0.1s ease, opacity 0.15s;
}
.file-nav-btn:hover {
    transform: translateY(-1px);
    opacity: 1;
}
.file-nav-btn:active {
    transform: translateY(0);
}
```

**Search input focus expansion:**
```css
.search-input {
    width: 160px;
    transition: width 0.2s ease, border-color 0.15s, box-shadow 0.15s;
}
.search-input:focus {
    width: 220px;
}
```

**Theme toggle micro-rotation:**
```css
.theme-toggle-btn {
    transition: transform 0.3s ease, background 0.2s;
}
.theme-toggle-btn:active {
    transform: rotate(30deg);
}
```

---

### 10. Loading State

Replace the current spinner with a simple animated diff skeleton:

```html
<div class="loading-state" aria-label="Loading diff...">
    <div class="loading-skeleton">
        <div class="skel-line skel-line--wide"></div>
        <div class="skel-line skel-line--add"></div>
        <div class="skel-line skel-line--add skel-line--med"></div>
        <div class="skel-line skel-line--del"></div>
        <div class="skel-line skel-line--wide skel-line--short"></div>
    </div>
</div>
```

```css
.skel-line {
    height: 12px;
    border-radius: 4px;
    margin-bottom: 6px;
    background: linear-gradient(90deg,
        var(--theme-surface-tertiary) 25%,
        var(--theme-surface-secondary) 50%,
        var(--theme-surface-tertiary) 75%
    );
    background-size: 200% 100%;
    animation: skelShimmer 1.4s ease infinite;
}
.skel-line--wide  { width: 320px; }
.skel-line--med   { width: 240px; }
.skel-line--short { width: 180px; }
.skel-line--add   { background-color: var(--theme-diff-addition-bg); }
.skel-line--del   { background-color: var(--theme-diff-deletion-bg); }

@keyframes skelShimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}
```

---

## Implementation Priority

Changes ordered by impact vs effort:

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| 1 | **File card left border strip** | High | Low |
| 2 | **Amber accent + toolbar accent line** | High | Low |
| 3 | **Hunk expansion pill** | High | Medium |
| 4 | **Typography: Instrument Sans for UI** | High | Low |
| 5 | **Typography: Bricolage Grotesque wordmark** | Medium | Low |
| 6 | **Warmed light surface colors** | Medium | Low |
| 7 | **Softened diff line backgrounds** | Medium | Low |
| 8 | **Hover elevation on file headers** | Medium | Low |
| 9 | **Deepened dark theme surfaces** | Medium | Low |
| 10 | **Empty state redesign** | Medium | Medium |
| 11 | **Loading skeleton** | Low | Medium |
| 12 | **Motion refinements** | Low | Low |

The first four items alone dramatically shift the visual identity. Changes 1–4 can be made in `styles.css` and `toolbar.html` in under an hour and would be immediately visible.

---

## What This Is Not

This proposal does **not** suggest:
- Changing the diff algorithm or data model
- Restructuring the HTML templates significantly
- Adding new dependencies beyond two Google Fonts families
- Breaking any existing CSS variable contracts (new variables are additive)
- Modifying the Python/Flask backend

All proposed changes are pure CSS + minimal HTML additions, preserving backward compatibility with the semantic variable system.

---

## Visual References

Three annotated diagrams were generated alongside this document:

1. **Color palette** — brand amber, softened diff colors, warmed surfaces, deepened dark theme
2. **Toolbar comparison** — current vs proposed (light + dark)
3. **File card + diff lines comparison** — left border strip, softer line backgrounds, amber expansion pill

These were rendered as interactive Excalidraw diagrams during the design review session.

---

*Proposal by Claude Code — April 2026*
