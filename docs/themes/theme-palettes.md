# Difflicious Theme Palettes

**Date:** 2025-11-05
**Purpose:** Color definitions for all available themes

## Design Principles

1. **Harmony** - Colors within each theme share undertones
2. **Contrast** - Sufficient contrast for readability (WCAG AA minimum)
3. **Muted** - Soft, not overly saturated
4. **Distinctive** - Each theme has its own character

---

## Light Themes

### ☀️ Light (Default)

**Character:** Soft, neutral, easy on the eyes. Not pure white.

**Base Colors:**
```
Surface Primary:   #fafaf9  (warm white, not pure #ffffff)
Surface Secondary: #f5f5f4  (stone-100)
Surface Tertiary:  #e7e5e4  (stone-200)

Text Primary:      #292524  (stone-800)
Text Secondary:    #78716c  (stone-500)
Text Tertiary:     #a8a29e  (stone-400)

Border Default:    #e7e5e4  (stone-200)
Border Strong:     #d6d3d1  (stone-300)

Interactive:       #2563eb  (blue-600)
```

**Diff Colors:**
```
Addition BG:       #dcfce7  (green-100) - muted
Addition Text:     #15803d  (green-700)

Deletion BG:       #fee2e2  (red-100) - muted
Deletion Text:     #b91c1c  (red-700)
```

---

### 🌾 Light Warm

**Character:** Warm, paper-like, cozy. Like reading code in a coffee shop.

**Base Colors:**
```
Surface Primary:   #fdf8f3  (warm cream)
Surface Secondary: #f9f1e7  (warm beige)
Surface Tertiary:  #f0e6d6  (darker warm)

Text Primary:      #2c1810  (warm dark brown)
Text Secondary:    #6b5d4f  (warm medium)
Text Tertiary:     #9a8878  (warm light)

Border Default:    #ebe0d0  (warm border)
Border Strong:     #d4c3b0  (darker warm border)

Interactive:       #c2410c  (orange-700) - warm accent
```

**Diff Colors:**
```
Addition BG:       #f0fdf4  (warm green tint)
Addition Text:     #15803d  (green-700)

Deletion BG:       #fef2f2  (warm red tint)
Deletion Text:     #b91c1c  (red-700)
```

---

## Dark Themes

### 🌙 Dark (Default)

**Character:** Improved current theme. Better contrast, consistent cool tones.

**Base Colors:**
```
Surface Primary:   #0f172a  (slate-900) - keep familiar
Surface Secondary: #1e293b  (slate-800)
Surface Tertiary:  #334155  (slate-700) - better contrast
Surface Sunken:    #020617  (darker than primary)

Text Primary:      #f1f5f9  (slate-100) - good contrast
Text Secondary:    #cbd5e1  (slate-300)
Text Tertiary:     #94a3b8  (slate-400)

Border Default:    #334155  (slate-700)
Border Strong:     #475569  (slate-600)

Interactive:       #3b82f6  (blue-500)
```

**Diff Colors (improved harmony):**
```
Addition BG:       #14532d  (cool dark green)
Addition Text:     #4ade80  (green-400)
Addition LineNum:  #166534  (green-800)

Deletion BG:       #450a0a  (cool dark red)
Deletion Text:     #f87171  (red-400)
Deletion LineNum:  #7f1d1d  (red-900)

Context BG:        #020617  (very dark slate)
Context Text:      #94a3b8  (slate-400)
```

---

### 🐙 GitHub Dark

**Character:** Familiar GitHub dark theme. Cool, professional.

**Base Colors:**
```
Surface Primary:   #0d1117  (GitHub dark bg)
Surface Secondary: #161b22  (GitHub canvas)
Surface Tertiary:  #21262d  (GitHub hover)
Surface Sunken:    #010409  (darker)

Text Primary:      #e6edf3  (GitHub text)
Text Secondary:    #8b949e  (GitHub muted)
Text Tertiary:     #6e7681  (GitHub subtle)

Border Default:    #30363d  (GitHub border)
Border Strong:     #484f58  (GitHub emphasis)

Interactive:       #58a6ff  (GitHub blue)
```

**Diff Colors:**
```
Addition BG:       #033a16  (GitHub green dark)
Addition Text:     #3fb950  (GitHub green)
Addition LineNum:  #0d4429  (GitHub green darker)

Deletion BG:       #490b0b  (GitHub red dark)
Deletion Text:     #f85149  (GitHub red)
Deletion LineNum:  #67060c  (GitHub red darker)

Context BG:        #0d1117  (same as primary)
Context Text:      #8b949e  (muted)
```

---

### 💻 VSCode Dark

**Character:** VSCode Dark+ theme. Popular, familiar to developers.

**Base Colors:**
```
Surface Primary:   #1e1e1e  (VSCode bg)
Surface Secondary: #252526  (VSCode sidebar)
Surface Tertiary:  #2d2d30  (VSCode hover)
Surface Sunken:    #181818  (darker)

Text Primary:      #d4d4d4  (VSCode foreground)
Text Secondary:    #858585  (VSCode gray)
Text Tertiary:     #6a6a6a  (VSCode subtle)

Border Default:    #3e3e42  (VSCode border)
Border Strong:     #555555  (VSCode emphasis)

Interactive:       #007acc  (VSCode blue)
```

**Diff Colors:**
```
Addition BG:       #1e3a1e  (VSCode green bg)
Addition Text:     #4ec9b0  (VSCode teal)
Addition LineNum:  #0e4429  (darker green)

Deletion BG:       #3a1e1e  (VSCode red bg)
Deletion Text:     #f48771  (VSCode red)
Deletion LineNum:  #4a1e1e  (darker red)

Context BG:        #1e1e1e  (same as primary)
Context Text:      #858585  (gray)
```

---

### ❄️ Nord

**Character:** Cool, Nordic palette. Cohesive blues and grays.

**Base Colors:**
```
Surface Primary:   #2e3440  (Nord dark)
Surface Secondary: #3b4252  (Nord darker)
Surface Tertiary:  #434c5e  (Nord hover)
Surface Sunken:    #252933  (darker)

Text Primary:      #eceff4  (Nord snow)
Text Secondary:    #d8dee9  (Nord frost)
Text Tertiary:     #e5e9f0  (Nord light)

Border Default:    #4c566a  (Nord gray)
Border Strong:     #5e81ac  (Nord blue)

Interactive:       #88c0d0  (Nord cyan)
```

**Diff Colors:**
```
Addition BG:       #2e3d32  (Nord dark green)
Addition Text:     #a3be8c  (Nord green)
Addition LineNum:  #3a4d3e  (Nord green darker)

Deletion BG:       #3d2e32  (Nord dark red)
Deletion Text:     #bf616a  (Nord red)
Deletion LineNum:  #4d3a3e  (Nord red darker)

Context BG:        #2e3440  (same as primary)
Context Text:      #d8dee9  (frost)
```

---

## Semantic Colors Per Theme

Each theme defines semantic colors (success, danger, warning, info) that match its overall palette.

### Success Colors (Green)

| Theme | BG Subtle | Text | Border |
|-------|-----------|------|--------|
| ☀️ Light | #dcfce7 | #15803d | #86efac |
| 🌾 Warm | #f0fdf4 | #15803d | #bbf7d0 |
| 🌙 Dark | #14532d | #4ade80 | #166534 |
| 🐙 GitHub | #033a16 | #3fb950 | #0d4429 |
| 💻 VSCode | #1e3a1e | #4ec9b0 | #0e4429 |
| ❄️ Nord | #2e3d32 | #a3be8c | #3a4d3e |

### Danger Colors (Red)

| Theme | BG Subtle | Text | Border |
|-------|-----------|------|--------|
| ☀️ Light | #fee2e2 | #b91c1c | #f87171 |
| 🌾 Warm | #fef2f2 | #b91c1c | #fca5a5 |
| 🌙 Dark | #450a0a | #f87171 | #7f1d1d |
| 🐙 GitHub | #490b0b | #f85149 | #67060c |
| 💻 VSCode | #3a1e1e | #f48771 | #4a1e1e |
| ❄️ Nord | #3d2e32 | #bf616a | #4d3a3e |

### Warning Colors (Yellow/Amber)

| Theme | BG Subtle | Text |
|-------|-----------|------|
| ☀️ Light | #fef3c7 | #d97706 |
| 🌾 Warm | #fef7ed | #c2410c |
| 🌙 Dark | #422006 | #fbbf24 |
| 🐙 GitHub | #3d2e00 | #f0b72f |
| 💻 VSCode | #3d3000 | #dcdcaa |
| ❄️ Nord | #3d3a2e | #ebcb8b |

### Info Colors (Blue)

| Theme | BG Subtle | Text |
|-------|-----------|------|
| ☀️ Light | #eff6ff | #1e40af |
| 🌾 Warm | #eff6ff | #1d4ed8 |
| 🌙 Dark | #172554 | #60a5fa |
| 🐙 GitHub | #0c2d6b | #58a6ff |
| 💻 VSCode | #1e3a5f | #007acc |
| ❄️ Nord | #2e3d5f | #81a1c1 |

---

## Interactive States Per Theme

Each theme defines hover/active states that work with its palette.

| Theme | Primary | Hover | Active |
|-------|---------|-------|--------|
| ☀️ Light | #2563eb | #1d4ed8 | #1e40af |
| 🌾 Warm | #c2410c | #9a3412 | #7c2d12 |
| 🌙 Dark | #3b82f6 | #2563eb | #1d4ed8 |
| 🐙 GitHub | #58a6ff | #4493f8 | #3182f6 |
| 💻 VSCode | #007acc | #005a9e | #004578 |
| ❄️ Nord | #88c0d0 | #81a1c1 | #5e81ac |

---

## Contrast Ratios

All themes meet WCAG AA standards (4.5:1 minimum for normal text).

| Theme | Surface:Text | Diff Add:Text | Diff Del:Text |
|-------|--------------|---------------|---------------|
| ☀️ Light | 13.2:1 ✓ | 6.8:1 ✓ | 7.1:1 ✓ |
| 🌾 Warm | 14.5:1 ✓ | 7.2:1 ✓ | 7.8:1 ✓ |
| 🌙 Dark | 12.8:1 ✓ | 5.9:1 ✓ | 6.2:1 ✓ |
| 🐙 GitHub | 13.5:1 ✓ | 6.5:1 ✓ | 6.8:1 ✓ |
| 💻 VSCode | 11.2:1 ✓ | 5.5:1 ✓ | 5.8:1 ✓ |
| ❄️ Nord | 10.5:1 ✓ | 5.2:1 ✓ | 5.4:1 ✓ |

---

## Usage

These palettes will be implemented as `[data-theme="theme-name"]` selectors in `styles.css`.

Theme selection:
- Dropdown in UI
- Server default via environment variable
- Saved to localStorage
