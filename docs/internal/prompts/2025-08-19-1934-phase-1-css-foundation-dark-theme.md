# Phase 1 CSS Foundation - Dark Theme Implementation

**LLM Implementation Prompt: Difflicious Dark/Light Theme - Phase 1 CSS Foundation**

You are implementing Phase 1 of dark/light theme support for Difflicious, a Flask-based git diff visualization tool. This phase focuses on establishing the CSS foundation by extending the existing CSS custom properties system with dark theme variants.

**Current Architecture Context:**
- Technology: Flask + Tailwind CSS + vanilla JavaScript
- Current styling: CSS custom properties system in `/src/difflicious/static/css/styles.css`
- Existing theme: Light theme only, well-structured with CSS variables
- Build system: Uses `uv` for Python package management

**Implementation Requirements:**

1. **Extend CSS Custom Properties** - Add dark theme variants to existing light theme variables
2. **Update Tailwind Configuration** - Map Tailwind utilities to CSS custom properties
3. **Ensure Color Accessibility** - Verify WCAG contrast ratios for both themes
4. **Test Theme Switching** - Implement basic theme class toggling for testing

**Todo List for Phase 1 CSS Foundation:**

- [ ] **Audit current color usage** - Analyze both `/src/difflicious/static/css/styles.css` and all HTML templates to identify hardcoded Tailwind color classes
- [ ] **Extend CSS custom properties** - Add `[data-theme="dark"]` selector with dark theme color variants for all existing variables
- [ ] **Add missing CSS variables** - Create CSS custom properties for all hardcoded Tailwind colors found in templates (gray-50, gray-100, red-50, green-50, blue-50, etc.)
- [ ] **Add comprehensive diff colors** - Include dark theme variants for all diff visualization backgrounds and text colors used in templates
- [ ] **Update Tailwind config** - Modify `tailwind.config.cjs` to enable class-based dark mode and map ALL color utilities to CSS custom properties
- [ ] **Replace hardcoded Tailwind classes** - Update all HTML templates to use CSS custom property-based Tailwind classes instead of hardcoded colors
- [ ] **Test color contrast** - Verify dark theme colors meet WCAG 4.5:1 contrast ratio for text and 3:1 for UI elements
- [ ] **Add theme attribute support** - Ensure `[data-theme="dark"]` attribute properly applies dark theme styles throughout all components
- [ ] **Test basic switching** - Create simple test mechanism to toggle `data-theme` attribute on document root
- [ ] **Verify diff readability** - Ensure all diff visualizations (additions, deletions, context, expansion areas) remain clearly distinguishable in dark theme
- [ ] **Check syntax highlighting** - Ensure existing Pygments-highlighted code remains readable in dark theme
- [ ] **Test template components** - Verify all template components (diff groups, hunks, lines, controls) work correctly in both themes
- [ ] **Validate no regressions** - Confirm light theme (default) appearance unchanged after template updates

**Technical Specifications:**

**Dark Theme Color Palette:**
- Background: `#0f172a` (slate-900), secondary: `#1e293b` (slate-800), tertiary: `#334155` (slate-700)
- Text: `#f1f5f9` (slate-100), secondary: `#94a3b8` (slate-400)
- Primary: `#3b82f6` (blue-500), hover: `#2563eb` (blue-600)
- Success: `#10b981` (emerald-500), Danger: `#ef4444` (red-500), Warning: `#f59e0b` (amber-500)
- Borders: `#334155` (slate-700), hover: `#475569` (slate-600)

**Diff-Specific Dark Colors:**
- Addition bg: `#0f2e14`, Addition text: `#10b981`
- Deletion bg: `#2e0f14`, Deletion text: `#ef4444` 
- Context bg: `#0f172a`, Context text: `#94a3b8`
- Expanded context bg: `#1e293b`

**Critical Implementation Note:**
The codebase currently has **extensive hardcoded Tailwind color classes** in HTML templates that must be converted to use CSS custom properties. Key hardcoded classes found:
- `bg-gray-50`, `bg-gray-100`, `text-gray-400`, `text-gray-500`, `text-gray-700`
- `bg-red-50`, `text-red-600`, `text-red-500` (for deletions)
- `bg-green-50` (for additions)
- `bg-blue-50`, `bg-blue-100`, `bg-blue-200`, `text-blue-800` (for expansion areas)
- `border-gray-100`, `border-gray-200`, `border-blue-100`, `border-blue-200`

These must ALL be mapped to CSS custom properties to enable proper dark theme switching.

**File Locations:**
- CSS file: `/src/difflicious/static/css/styles.css`
- Tailwind config: `tailwind.config.cjs` (in project root)
- Templates with hardcoded colors: `/src/difflicious/templates/**/*.html`

**Success Criteria:**
- Dark theme colors applied via `data-theme="dark"` attribute
- All existing functionality works in both light and dark themes
- Proper contrast ratios maintained for accessibility
- No visual regressions in default light theme
- Diff visualizations remain clear and distinguishable in both themes

**Testing Instructions:**
After implementation, test by manually adding `data-theme="dark"` to the `<html>` element in browser dev tools to verify theme switching works correctly.