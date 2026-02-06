# Context Expansion Troubleshooting Session - 2025-07-29

## Problem Summary
The expandable context feature for diff views had multiple issues:
1. "Show more" buttons not working on subsequent clicks
2. "Show more below" appearing at end of file when it shouldn't
3. "Show more above" missing when it should appear
4. Buttons appearing disabled and not responding to clicks

## Root Causes Identified

### 1. **Progressive Context Logic Bug**
- **Issue**: `fetchContextLines()` always requested same context size (10 lines)
- **Should be**: Request cumulative context (3 + already_expanded + new_expansion)
- **Fix**: Updated to calculate `totalContextNeeded = 3 + currentlyExpanded + contextLines`

### 2. **Merging Logic Bug**
- **Issue**: `if (extendedHunk.lines.length > currentHunk.lines.length)` prevented subsequent expansions
- **Problem**: After first expansion, condition was always false
- **Fix**: Changed to `if (extendedHunk.lines && extendedHunk.lines.length > 0)`

### 3. **File Boundary Detection Missing**
- **Issue**: No end-of-file detection for "show more below" buttons
- **Fix**: Added `get_file_line_count()` method to backend
- **Logic**: Hide "↓ Show more" when within 10 lines of EOF

### 4. **Alpine.js Expression Issues**
- **Issue**: Complex conditional expressions causing buttons to appear disabled
- **Problem**: `canExpandContext()` and `isContextLoading()` had bugs
- **Fix**: Simplified logic and confirmed click events work with test alerts

## Solutions Implemented

### Backend Changes
```python
# Added to GitRepository class
def get_file_line_count(self, file_path: str) -> int:
    # Uses wc -l to count file lines for boundary detection

# Enhanced API endpoint
@app.route('/api/diff/context')
def api_diff_context():
    # Now returns file_line_count for boundary detection
```

### Frontend Changes
```javascript
// Fixed progressive context calculation
const totalContextNeeded = 3 + currentlyExpanded + contextLines;

// Simplified boundary detection
canExpandContext(filePath, hunkIndex, direction) {
    if (direction === 'before') return hunk.old_start > 1;
    if (direction === 'after') return hunkEndLine < fileLineCount - 10;
}

// Fixed merging logic
if (extendedHunk.lines && extendedHunk.lines.length > 0) {
    currentHunk.lines = extendedHunk.lines; // Always replace
}
```

## Testing & Validation

### What Worked ✅
1. **Click Events**: Confirmed Alpine.js click handlers work (alert test successful)
2. **Button Visibility**: Hardcoded logic proved buttons can show/hide correctly
3. **API Integration**: Backend context API returns proper data with file line counts
4. **State Management**: Context expansion state tracking works

### What Didn't Work Initially ❌
1. **Complex Conditional Logic**: Original `canExpandContext()` had unreachable code
2. **Button Disabled State**: Complex `isContextLoading()` logic prevented clicks
3. **Boundary Detection**: Missing file metadata caused wrong button visibility
4. **Progressive Expansion**: Faulty merging prevented multiple expansions

## Current Status
- ✅ Buttons appear in correct locations based on file boundaries
- ✅ Click events properly trigger `expandContext()` function
- ✅ Backend API provides file line counts for boundary detection
- ✅ Progressive expansion logic calculates cumulative context correctly
- 🔄 **NEEDS TESTING**: End-to-end functionality confirmation

## Debug Tools Added
- Console logging with emoji prefixes (`🔵`, `🟡`, `🔴`, `🟢`)
- Visual debug display showing `start=X before=Y after=Z` in hunk headers
- Alert-based click confirmation during troubleshooting
- Simplified hardcoded logic for isolation testing

## Files Modified
- `src/difflicious/git_operations.py` - Added file line counting
- `src/difflicious/app.py` - Enhanced context API endpoint  
- `src/difflicious/static/js/app.js` - Fixed expansion logic and state management
- `src/difflicious/templates/index.html` - Added debug display and button fixes

## Next Steps for Completion
1. **End-to-end Testing**: Verify full context expansion workflow
2. **Remove Debug Code**: Clean up temporary debug displays and logging
3. **Edge Case Testing**: Test with files at beginning/end, small files, etc.
4. **Performance Validation**: Ensure multiple expansions don't cause issues

## Key Learnings
- Alpine.js reactivity issues often stem from complex conditional expressions
- Progressive API features need careful state accumulation logic
- File boundary detection requires backend file metadata
- Isolation testing (hardcoded values) helps identify root causes
- Visual debugging in UI can be more effective than console-only debugging