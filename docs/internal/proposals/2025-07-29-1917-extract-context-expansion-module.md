# Extract Context Expansion Logic from app.js

**Date:** 2025-07-29 19:17  
**Author:** Claude Code Analysis  
**Subject:** Detailed implementation guide for extracting context expansion logic

## Overview

Extract the complex context expansion functionality (200+ lines) from the monolithic `diffApp()` into a dedicated, testable module. This addresses the current coupling between UI state, API calls, and complex line manipulation logic.

## Current State Analysis

**Location:** `src/difflicious/static/js/app.js:533-899`

**Key Methods to Extract:**
- `expandContext(filePath, hunkIndex, direction, contextLines = 10)` (533-613)
- `fetchFileLines(filePath, startLine, endLine)` (615-624)
- `insertContextLines(filePath, hunkIndex, direction, lines, startLineNum)` (626-709)
- `checkAndMergeHunks(targetFile, currentHunkIndex)` (711-782)
- `checkAndMergeHunksReverse(targetFile, currentHunkIndex)` (784-849)
- `canExpandContext(filePath, hunkIndex, direction)` (851-891)
- `isContextLoading(filePath, hunkIndex, direction)` (893-899)

**State Variables:**
- `contextExpansions` (line 41)
- `contextLoading` (line 42)

## Implementation Plan

### Step 1: Create Context Manager Module

Create new file: `src/difflicious/static/js/context-manager.js`

```javascript
/**
 * Context Expansion Manager
 * Handles expanding diff context lines and hunk merging
 */
function createContextManager() {
    return {
        // State
        contextExpansions: {}, // { filePath: { hunkIndex: { beforeExpanded: number, afterExpanded: number } } }
        contextLoading: {}, // { filePath: { hunkIndex: { before: bool, after: bool } } }

        // Public API
        async expandContext(filePath, hunkIndex, direction, contextLines = 10) {
            // Implementation moved from app.js:533-613
        },

        canExpandContext(filePath, hunkIndex, direction) {
            // Implementation moved from app.js:851-891
        },

        isContextLoading(filePath, hunkIndex, direction) {
            // Implementation moved from app.js:893-899
        },

        // Private methods
        async _fetchFileLines(filePath, startLine, endLine) {
            // Implementation moved from app.js:615-624
        },

        _insertContextLines(filePath, hunkIndex, direction, lines, startLineNum) {
            // Implementation moved from app.js:626-709
        },

        _checkAndMergeHunks(targetFile, currentHunkIndex) {
            // Implementation moved from app.js:711-782
        },

        _checkAndMergeHunksReverse(targetFile, currentHunkIndex) {
            // Implementation moved from app.js:784-849
        }
    };
}
```

### Step 2: Modify app.js Integration

**Before (current monolithic structure):**
```javascript
function diffApp() {
    return {
        // ... 900+ lines including context expansion
        contextExpansions: {},
        contextLoading: {},
        async expandContext(filePath, hunkIndex, direction, contextLines = 10) {
            // 200+ lines of complex logic
        }
        // ... more methods
    };
}
```

**After (modular structure):**
```javascript
function diffApp() {
    const contextManager = createContextManager();
    
    return {
        // Application state (keep existing)
        loading: false,
        gitStatus: { /* ... */ },
        groups: { /* ... */ },
        
        // Delegate context expansion to manager
        ...contextManager,
        
        // Override methods that need access to main app state
        async expandContext(filePath, hunkIndex, direction, contextLines = 10) {
            // Ensure groups data is available to context manager
            contextManager._setGroupsReference(this.groups);
            return await contextManager.expandContext(filePath, hunkIndex, direction, contextLines);
        },
        
        // Keep other existing methods
        init() { /* ... */ },
        loadDiffs() { /* ... */ }
        // ...
    };
}
```

### Step 3: Handle State Dependencies

**Challenge:** Context expansion needs access to `this.groups` and `this.saveUIState()`

**Solution:** Dependency injection pattern

```javascript
// In context-manager.js
function createContextManager() {
    let groupsRef = null;
    let saveStateCallback = null;
    
    return {
        // Setup methods
        _setGroupsReference(groups) {
            groupsRef = groups;
        },
        
        _setSaveStateCallback(callback) {
            saveStateCallback = callback;
        },
        
        // Context expansion now uses injected dependencies
        async expandContext(filePath, hunkIndex, direction, contextLines = 10) {
            // Find the target file using injected groupsRef
            let targetFile = null;
            for (const groupKey of Object.keys(groupsRef)) {
                const file = groupsRef[groupKey].files.find(f => f.path === filePath);
                if (file) {
                    targetFile = file;
                    break;
                }
            }
            
            // ... rest of implementation
            
            // Save state using injected callback
            if (saveStateCallback) {
                saveStateCallback();
            }
        }
    };
}

// In app.js
function diffApp() {
    const contextManager = createContextManager();
    
    const app = {
        // ... state and methods
        
        saveUIState() {
            // existing implementation
        }
    };
    
    // Setup dependencies
    contextManager._setGroupsReference(app.groups);
    contextManager._setSaveStateCallback(() => app.saveUIState());
    
    return {
        ...app,
        ...contextManager
    };
}
```

### Step 4: Update HTML Template

**Current:** Direct method calls
```html
<button @click="expandContext(file.path, hunkIndex, 'before', 10)">
```

**After:** No changes needed (methods still available on main app object)

### Step 5: Add Script Tag to index.html

```html
<!-- Add before app.js -->
<script src="{{ url_for('static', filename='js/context-manager.js') }}"></script>
<script src="{{ url_for('static', filename='js/app.js') }}"></script>
```

## Testing Strategy

### Unit Tests for Context Manager
Create `tests/js/test-context-manager.js`:

```javascript
describe('ContextManager', () => {
    let contextManager;
    let mockGroups;
    let mockSaveState;
    
    beforeEach(() => {
        contextManager = createContextManager();
        mockGroups = {
            unstaged: {
                files: [
                    { path: 'test.js', hunks: [/* mock hunk data */] }
                ]
            }
        };
        mockSaveState = jest.fn();
        
        contextManager._setGroupsReference(mockGroups);
        contextManager._setSaveStateCallback(mockSaveState);
    });
    
    test('canExpandContext returns correct values', () => {
        // Test expansion rules
    });
    
    test('expandContext makes correct API calls', async () => {
        // Mock fetch and test API interaction
    });
    
    test('hunk merging works correctly', () => {
        // Test complex hunk merging logic
    });
});
```

### Integration Tests
- Verify context expansion still works in full application
- Test that state persistence continues to work
- Verify no Alpine.js reactivity issues

## Migration Steps

1. **Create context-manager.js** with extracted methods
2. **Add script tag** to index.html 
3. **Modify app.js** to use context manager with dependency injection
4. **Test thoroughly** in development environment
5. **Update any direct method references** if needed
6. **Add unit tests** for isolated context manager
7. **Document the new architecture** in CLAUDE.md

## Benefits Achieved

- **Reduced complexity:** Main app.js drops from 900+ to ~700 lines
- **Testability:** Context expansion logic now unit testable in isolation
- **Maintainability:** Clear separation between UI state and context logic
- **Reusability:** Context manager could be reused in other diff viewers
- **Debugging:** Easier to isolate context expansion bugs

## Risks & Mitigation

**Risk:** Alpine.js reactivity breaks with object spreading
**Mitigation:** Thoroughly test all reactive properties and methods

**Risk:** Performance impact from dependency injection
**Mitigation:** Benchmark before/after; overhead should be minimal

**Risk:** Increased complexity for simple changes
**Mitigation:** Clear documentation and consistent patterns

## Success Criteria

- [ ] Context expansion functionality works identically to before
- [ ] app.js reduced by 200+ lines
- [ ] Context manager has >90% test coverage
- [ ] No performance regression
- [ ] All existing Alpine.js directives continue working
- [ ] State persistence (localStorage) unaffected