# Plan: Expandable Context Feature for Difflicious

**Date**: 2025-07-29 10:15 AM
**Feature**: Expandable Context Lines in Diff View
**Status**: Planning Complete, Ready for Implementation

## Current Implementation Analysis
The current system fetches git diffs with a fixed 3-line context using `--context` in git_operations.py:712. The frontend displays this in a side-by-side view with hunks containing lines that have fixed context.

## Proposed Implementation

### 1. Backend Changes

#### New API Endpoint: `/api/diff/context`
- **Purpose**: Fetch additional context lines for a specific file and line range
- **Parameters**:
  - `file_path`: The file to get context for
  - `base_commit`: Base commit for comparison
  - `hunk_old_start`, `hunk_old_count`: Original hunk boundaries
  - `hunk_new_start`, `hunk_new_count`: New hunk boundaries
  - `context_before`: Number of extra lines to fetch before
  - `context_after`: Number of extra lines to fetch after
- **Response**: Returns extended diff with larger context window

#### Git Operations Enhancement
- Add method `get_extended_context()` in GitRepository class
- Use `git diff -U<large_number>` to fetch extended context
- Parse and return only the additional lines needed

### 2. Frontend Changes

#### UI Controls (in file headers)
- Add "Expand Context" buttons above/below each hunk
- Show "↑ Show 10 more lines" and "↓ Show 10 more lines" buttons
- Hide buttons when no more context available
- Add loading states during context fetching

#### Data Structure Updates
- Track `contextExpanded` state per hunk (before/after)
- Store `originalHunkBounds` to know expansion limits
- Add `expandedLines` arrays for storing fetched context

#### Context Merging Logic
- Fetch extended diff from new API endpoint
- Parse additional lines and merge into existing hunk structure
- Update line numbers accordingly
- Avoid duplicate lines by comparing with existing context
- Only insert new lines at the requested boundary (top/bottom)

### 3. Implementation Steps

1. **Backend API** (`app.py`):
   - Add `/api/diff/context` endpoint
   - Enhance `get_real_git_diff()` to support custom context size

2. **Git Operations** (`git_operations.py`):
   - Add `get_extended_context()` method
   - Support dynamic `-U<number>` parameter

3. **Frontend State** (`app.js`):
   - Add context expansion state tracking
   - Implement `expandContext()` and `fetchContextLines()` methods

4. **UI Template** (`index.html`):
   - Add expand context buttons to hunk headers
   - Update line rendering to handle expanded context

### 4. Key Technical Decisions

- **One-sided expansion**: Fetch full context but only show requested side
- **Line deduplication**: Compare existing lines to avoid duplicates
- **Progressive loading**: Allow multiple expansions (10 lines at a time)
- **State persistence**: Include context expansion in localStorage

This approach leverages git's native context capabilities while providing granular UI control over what context is displayed.
