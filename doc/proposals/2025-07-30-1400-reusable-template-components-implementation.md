# Reusable Template Components Implementation Plan

**Date:** 2025-07-30 14:00  
**Author:** Implementation based on investigation proposal  
**Subject:** Step-by-step implementation of Jinja2 Partials for reusable components

## Implementation Todo List

### Phase 1: Setup & Infrastructure
- [ ] Install jinja-partials dependency using uv
- [ ] Register jinja_partials extension with Flask app
- [ ] Create templates/partials directory structure
- [ ] Add tests to verify jinja_partials integration works
- [ ] Commit: "Add jinja-partials dependency and basic setup"

### Phase 2: File Header Component (Highest Impact)
- [ ] Create templates/partials/file-header.html component
- [ ] Extract file header logic from index.html 
- [ ] Replace inline file headers with render_partial calls
- [ ] Test file header component rendering and Alpine.js reactivity
- [ ] Commit: "Extract file header component to partial template"

### Phase 3: Context Controls Component (High Complexity Reduction)
- [ ] Create templates/partials/context-controls.html component
- [ ] Extract context expansion controls from index.html
- [ ] Replace inline context controls with render_partial calls
- [ ] Test context expansion functionality with new component
- [ ] Commit: "Extract context controls component to partial template"

### Phase 4: Navigation Buttons Component
- [ ] Create templates/partials/navigation-buttons.html component
- [ ] Extract navigation button logic from index.html
- [ ] Replace inline navigation buttons with render_partial calls
- [ ] Test navigation functionality with new component
- [ ] Commit: "Extract navigation buttons component to partial template"

### Phase 5: Status Badge Component
- [ ] Create templates/partials/status-badge.html component
- [ ] Extract status badge logic from index.html
- [ ] Replace inline status badges with render_partial calls
- [ ] Test status badge rendering with new component
- [ ] Commit: "Extract status badge component to partial template"

### Phase 6: Diff Line Component (High Repetition Elimination)
- [ ] Create templates/partials/diff-line.html component
- [ ] Extract diff line rendering logic from index.html
- [ ] Replace inline diff line rendering with render_partial calls
- [ ] Test diff line rendering and syntax highlighting with new component
- [ ] Commit: "Extract diff line component to partial template"

### Phase 7: Expand Button Component
- [ ] Create templates/partials/expand-button.html component
- [ ] Extract expand/collapse button logic from index.html
- [ ] Replace inline expand buttons with render_partial calls
- [ ] Test expand/collapse functionality with new component
- [ ] Commit: "Extract expand button component to partial template"

### Phase 8: Testing & Validation
- [ ] Create comprehensive tests for all partial components
- [ ] Test Alpine.js reactivity across all components
- [ ] Test parameter passing to all components
- [ ] Verify UI functionality matches original behavior exactly
- [ ] Run full test suite to ensure no regressions
- [ ] Commit: "Add comprehensive tests for all partial components"

### Phase 9: Documentation & Cleanup
- [ ] Update CLAUDE.md with new template architecture
- [ ] Update README.md with template component information
- [ ] Clean up any unused template code in index.html
- [ ] Verify template file line count reduction achieved
- [ ] Commit: "Update documentation and clean up template code"

## Success Metrics

**Target Achievements:**
- 60% reduction in template repetition
- 40% improvement in maintainability
- Clean separation of UI concerns
- Consistent styling across components
- All existing functionality preserved
- All tests passing

## Component Priority Order

1. **file-header.html** - Most repeated, highest impact
2. **context-controls.html** - Complex logic, high maintenance burden
3. **navigation-buttons.html** - Clear boundaries, medium impact
4. **status-badge.html** - Simple extraction, consistency gains
5. **diff-line.html** - Most complex but highest repetition elimination
6. **expand-button.html** - Final cleanup, completes component extraction

## Notes

- Each step should be implemented incrementally with immediate testing
- Commit after each completed component extraction
- Maintain Alpine.js reactivity throughout all changes
- Preserve exact existing functionality and styling
- Use render_partial() calls with proper parameter passing