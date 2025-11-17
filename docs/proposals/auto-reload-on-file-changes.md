# Auto-Reload on File Changes - Implementation Proposal

**Date:** 2025-11-17
**Status:** Proposal
**Author:** Claude (AI Assistant)

## Executive Summary

This proposal outlines three approaches for implementing automatic page reload/update functionality when files in the git working directory change. The goal is to provide developers with a live-updating view of their diffs without manual page refreshes, similar to hot-reload functionality in modern development tools.

## Problem Statement

Currently, Difflicious requires manual page refreshes to see updated diffs when files in the working directory change. This interrupts the developer workflow and reduces the tool's effectiveness for real-time diff monitoring during development.

**User Requirements:**
- Watch for changes in the entire working directory (excluding `.git/`)
- Update page content when any file changes
- Minimize visual disruption during updates
- Cross-platform compatibility (Linux, macOS, Windows)
- Preserve UI state (expanded files, scroll position, etc.)

## Current Architecture Analysis

**Backend:**
- Flask application with service layer architecture
- GitService handles git operations via GitPython
- DiffService handles diff parsing and rendering
- Server-side rendering with Jinja2 templates
- Flask debug mode already watches `templates/` and `static/` directories

**Frontend:**
- Vanilla JavaScript (no framework dependencies)
- State management via `DiffState` object
- localStorage for state persistence across sessions
- Supports expand/collapse, search, and filtering
- Already has state restoration capabilities

**Key Insight:** The existing `DiffState.restoreState()` functionality provides a foundation for preserving UI state during updates.

## Proposed Solutions

### Proposal 1: File Watching + Server-Sent Events (RECOMMENDED)

**Architecture:**
```
Git Working Directory
        ↓ (file changes)
    Watchdog Library
        ↓ (debounced events)
   Flask SSE Endpoint (/api/watch)
        ↓ (SSE stream)
  Frontend EventSource
        ↓ (triggers update)
 Fetch new diff data → Update DOM
```

**Implementation Details:**

**Backend Changes:**
1. Add `watchdog` dependency to `pyproject.toml`
   ```toml
   dependencies = [
       # ... existing deps
       "watchdog>=3.0.0",
   ]
   ```

2. Create FileWatcher service (`src/difflicious/services/file_watcher.py`):
   ```python
   from watchdog.observers import Observer
   from watchdog.events import FileSystemEventHandler
   import threading
   import queue
   import time

   class DiffWatcher(FileSystemEventHandler):
       """Watches git working directory for changes."""

       def __init__(self, repo_path, event_queue, debounce_seconds=1.0):
           self.repo_path = repo_path
           self.event_queue = event_queue
           self.debounce_seconds = debounce_seconds
           self.last_event_time = 0
           self.debounce_timer = None

       def on_any_event(self, event):
           # Ignore .git directory
           if '/.git/' in event.src_path or event.src_path.endswith('/.git'):
               return

           # Debounce rapid events
           current_time = time.time()
           if current_time - self.last_event_time < self.debounce_seconds:
               # Reset timer
               if self.debounce_timer:
                   self.debounce_timer.cancel()

           self.debounce_timer = threading.Timer(
               self.debounce_seconds,
               self._send_event
           )
           self.debounce_timer.start()
           self.last_event_time = current_time

       def _send_event(self):
           self.event_queue.put({'type': 'change', 'timestamp': time.time()})
   ```

3. Add SSE endpoint in `app.py`:
   ```python
   @app.route('/api/watch')
   def watch_changes():
       """Server-Sent Events endpoint for file change notifications."""

       def event_stream():
           # Create event queue for this connection
           event_queue = queue.Queue()

           # Set up file watcher
           try:
               git_service = GitService()
               repo_path = git_service.repo.working_dir

               watcher = DiffWatcher(repo_path, event_queue)
               observer = Observer()
               observer.schedule(watcher, repo_path, recursive=True)
               observer.start()

               # Send initial connection event
               yield f"data: {json.dumps({'type': 'connected'})}\n\n"

               # Stream events
               while True:
                   try:
                       event = event_queue.get(timeout=30)
                       yield f"data: {json.dumps(event)}\n\n"
                   except queue.Empty:
                       # Send keepalive
                       yield f": keepalive\n\n"

           except Exception as e:
               yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
           finally:
               if observer:
                   observer.stop()
                   observer.join()

       return Response(
           event_stream(),
           mimetype='text/event-stream',
           headers={
               'Cache-Control': 'no-cache',
               'X-Accel-Buffering': 'no'
           }
       )
   ```

**Frontend Changes:**

Add to `diff-interactions.js`:
```javascript
// Auto-reload functionality
const AutoReload = {
    eventSource: null,
    enabled: true,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,

    init() {
        if (!this.enabled) return;

        // Check if SSE is supported
        if (typeof EventSource === 'undefined') {
            console.warn('SSE not supported, auto-reload disabled');
            return;
        }

        this.connect();
    },

    connect() {
        this.eventSource = new EventSource('/api/watch');

        this.eventSource.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'change') {
                this.handleFileChange();
            }
        });

        this.eventSource.addEventListener('error', (error) => {
            console.error('SSE connection error:', error);
            this.handleConnectionError();
        });
    },

    async handleFileChange() {
        if (DEBUG) console.log('File change detected, refreshing diff data...');

        // Save current state before reload
        DiffState.saveState();

        // Fetch updated diff data
        const currentUrl = new URL(window.location.href);
        const response = await fetch(`/api/diff${currentUrl.search}`);
        const data = await response.json();

        if (data.status === 'ok') {
            // Option 1: Partial update (smoother, more complex)
            this.updateDiffContent(data.groups);

            // Option 2: Full page reload (simpler, preserves state via localStorage)
            // window.location.reload();
        }
    },

    updateDiffContent(newGroups) {
        // Update diff content without full page reload
        // This preserves scroll position and minimizes visual disruption

        // Implementation strategy:
        // 1. Generate new HTML for diff groups
        // 2. Compare with existing content
        // 3. Update only changed sections
        // 4. Restore expanded state for files that still exist

        // TODO: Implement smart DOM diffing
        // For now, use simple approach: reload page
        window.location.reload();
    },

    handleConnectionError() {
        this.eventSource?.close();

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

            if (DEBUG) console.log(`Reconnecting in ${delay}ms...`);
            setTimeout(() => this.connect(), delay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    },

    disconnect() {
        this.eventSource?.close();
        this.eventSource = null;
    }
};

// Initialize auto-reload after DiffState
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    await DiffState.init();
    AutoReload.init(); // Add this line
    // ... rest of initialization
});
```

**Pros:**
- ✅ Real-time updates with minimal latency
- ✅ Efficient - only updates when changes occur
- ✅ Cross-platform via watchdog library
- ✅ Minimal network overhead
- ✅ Can preserve detailed UI state
- ✅ Professional, modern approach

**Cons:**
- ❌ Additional dependency (watchdog)
- ❌ SSE not supported in very old browsers (IE)
- ❌ Requires server-side event management
- ❌ Complexity in handling connection lifecycle
- ❌ Debouncing logic needed to avoid event storms

**Complexity:** Medium-High
**Estimated Implementation Time:** 4-6 hours

---

### Proposal 2: Smart Polling with Change Detection

**Architecture:**
```
Frontend Timer (every 2-5s)
        ↓
  Fetch /api/status
        ↓
   Compare hash/timestamp
        ↓ (if changed)
  Fetch /api/diff
        ↓
  Update page content
```

**Implementation Details:**

**Backend Changes:**
1. Enhance `/api/status` endpoint to include change indicator:
   ```python
   @app.route("/api/status")
   def api_status() -> Response:
       try:
           git_service = GitService()
           status = git_service.get_repository_status()

           # Add change detection hash
           # Simple approach: hash of file count + latest mtime
           working_dir = git_service.repo.working_dir
           change_hash = compute_working_dir_hash(working_dir)
           status['change_hash'] = change_hash

           return jsonify(status)
       except Exception as e:
           # ... error handling
   ```

2. Add helper function:
   ```python
   def compute_working_dir_hash(repo_path: str) -> str:
       """Compute hash representing current state of working directory."""
       import hashlib
       import os

       # Collect file stats, excluding .git
       file_stats = []
       for root, dirs, files in os.walk(repo_path):
           # Skip .git directory
           dirs[:] = [d for d in dirs if d != '.git']

           for file in files:
               filepath = os.path.join(root, file)
               try:
                   stat = os.stat(filepath)
                   file_stats.append(f"{filepath}:{stat.st_mtime}:{stat.st_size}")
               except OSError:
                   continue

       # Create hash from combined stats
       combined = '|'.join(sorted(file_stats))
       return hashlib.md5(combined.encode()).hexdigest()
   ```

**Frontend Changes:**

Add to `diff-interactions.js`:
```javascript
// Smart polling for changes
const SmartPoller = {
    intervalId: null,
    pollInterval: 3000, // 3 seconds
    lastChangeHash: null,
    enabled: true,

    init() {
        if (!this.enabled) return;
        this.start();
    },

    start() {
        // Initial status check
        this.checkForChanges();

        // Set up polling interval
        this.intervalId = setInterval(
            () => this.checkForChanges(),
            this.pollInterval
        );

        if (DEBUG) console.log('Smart polling started');
    },

    async checkForChanges() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();

            if (data.change_hash && this.lastChangeHash !== null) {
                if (data.change_hash !== this.lastChangeHash) {
                    if (DEBUG) console.log('Changes detected, reloading...');
                    await this.reloadDiffs();
                }
            }

            this.lastChangeHash = data.change_hash;

        } catch (error) {
            console.error('Polling error:', error);
        }
    },

    async reloadDiffs() {
        // Save state
        DiffState.saveState();

        // Simple approach: full page reload
        // State will be restored via localStorage
        window.location.reload();
    },

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            if (DEBUG) console.log('Smart polling stopped');
        }
    },

    setInterval(milliseconds) {
        this.pollInterval = milliseconds;
        if (this.intervalId) {
            this.stop();
            this.start();
        }
    }
};

// Initialize after DiffState
document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    await DiffState.init();
    SmartPoller.init(); // Add this line
    // ... rest of initialization
});
```

**Pros:**
- ✅ No additional dependencies
- ✅ Simple implementation
- ✅ Works in all browsers
- ✅ Easy to debug and understand
- ✅ Can adjust polling frequency based on needs
- ✅ Graceful degradation if API fails

**Cons:**
- ❌ Constant network requests (overhead)
- ❌ Delay between change and detection (2-5 seconds)
- ❌ Polling continues even when no changes occur
- ❌ Computing hash on every poll has CPU cost
- ❌ Not as "real-time" as SSE approach

**Complexity:** Low
**Estimated Implementation Time:** 2-3 hours

---

### Proposal 3: Hybrid Approach (SSE + Polling Fallback)

**Architecture:**
```
        ┌─────────────────┐
        │  Feature Detect │
        └────────┬─────────┘
                 │
        ┌────────┴─────────┐
        │                  │
    SSE Support?       No SSE?
        │                  │
        ▼                  ▼
  Use Proposal 1     Use Proposal 2
  (Watchdog + SSE)   (Smart Polling)
```

**Implementation Details:**

Combine both Proposal 1 and Proposal 2 with automatic fallback:

```javascript
// Unified auto-reload with fallback
const UnifiedAutoReload = {
    strategy: null, // 'sse' or 'polling'

    init() {
        // Detect best strategy
        if (typeof EventSource !== 'undefined') {
            this.strategy = 'sse';
            AutoReload.init();
            if (DEBUG) console.log('Using SSE strategy');
        } else {
            this.strategy = 'polling';
            SmartPoller.init();
            if (DEBUG) console.log('Using polling strategy (SSE not supported)');
        }

        // Add UI indicator
        this.addStatusIndicator();
    },

    addStatusIndicator() {
        // Add small indicator showing auto-reload is active
        const indicator = document.createElement('div');
        indicator.id = 'auto-reload-indicator';
        indicator.className = 'fixed bottom-4 right-4 px-2 py-1 text-xs rounded';
        indicator.style.cssText = 'background: var(--surface-secondary); color: var(--text-secondary);';
        indicator.textContent = `🔄 Auto-reload: ${this.strategy}`;
        document.body.appendChild(indicator);
    },

    disable() {
        if (this.strategy === 'sse') {
            AutoReload.disconnect();
        } else {
            SmartPoller.stop();
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    await DiffState.init();
    UnifiedAutoReload.init();
    // ... rest of initialization
});
```

**Pros:**
- ✅ Best of both worlds
- ✅ Graceful degradation
- ✅ Works on all platforms and browsers
- ✅ Modern approach for modern browsers
- ✅ Reliable fallback for edge cases

**Cons:**
- ❌ Most complex implementation
- ❌ Two code paths to maintain
- ❌ Requires testing both strategies
- ❌ Larger codebase

**Complexity:** High
**Estimated Implementation Time:** 6-8 hours

---

## Comparison Matrix

| Criterion | Proposal 1 (SSE) | Proposal 2 (Polling) | Proposal 3 (Hybrid) |
|-----------|------------------|----------------------|---------------------|
| Real-time updates | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Network efficiency | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Browser support | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Implementation complexity | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Maintainability | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| CPU overhead | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Dependencies | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## Recommendation

**Recommended Approach: Proposal 1 (Watchdog + SSE)**

**Rationale:**
1. **Modern and Efficient:** SSE is the standard approach for server-push notifications in web applications
2. **Excellent Developer Experience:** Near-instant updates provide the best UX
3. **Network Efficiency:** Only transmits data when changes occur
4. **Proven Technology:** watchdog is mature, well-maintained, and widely used
5. **Browser Support:** All modern browsers support SSE (Edge, Chrome, Firefox, Safari)
6. **Future-Proof:** Can be extended for other real-time features

**Browser Support Note:** SSE is supported in:
- Chrome 6+
- Firefox 6+
- Safari 5+
- Edge (all versions)
- Not supported in IE (but IE is deprecated)

For the small percentage of users on very old browsers, they can simply refresh manually as they do now.

## Implementation Phases

### Phase 1: Basic SSE Implementation (MVP)
- Add watchdog dependency
- Implement FileWatcher service
- Create /api/watch SSE endpoint
- Add EventSource connection in frontend
- Use `window.location.reload()` for updates
- **Estimated time:** 3-4 hours

### Phase 2: Enhanced Update Strategy
- Implement smart DOM updates instead of full reload
- Preserve scroll position during updates
- Add visual feedback for updates
- **Estimated time:** 2-3 hours

### Phase 3: Polish and Configuration
- Add settings to enable/disable auto-reload
- Add configurable debounce timing
- Add visual indicator for connection status
- Handle edge cases (disconnection, errors)
- **Estimated time:** 2-3 hours

## Configuration Options

Add environment variables for configuration:

```bash
# Enable/disable auto-reload
DIFFLICIOUS_AUTO_RELOAD=true

# Debounce delay in seconds
DIFFLICIOUS_WATCH_DEBOUNCE=1.0

# File patterns to ignore (in addition to .git)
DIFFLICIOUS_WATCH_IGNORE=".git,.idea,node_modules,__pycache__"
```

## Alternative Considerations

### Alternative 1: watchfiles Instead of watchdog
`watchfiles` is a newer library written in Rust that's faster than watchdog. Used by uvicorn.

**Pros:**
- Faster performance
- Lower CPU usage
- Modern codebase

**Cons:**
- Requires Rust compiler for installation
- Smaller community
- Less mature

**Recommendation:** Start with watchdog (pure Python), consider watchfiles if performance becomes an issue.

### Alternative 2: Git Hooks
Use git hooks to trigger notifications instead of file watching.

**Pros:**
- No continuous watching needed
- Very efficient

**Cons:**
- Only triggers on git operations
- Misses non-committed file changes
- User has to configure hooks
- Doesn't meet requirement of watching "any file changes"

**Recommendation:** Not suitable for this use case.

## Testing Strategy

1. **Unit Tests:**
   - Test debouncing logic
   - Test file watcher initialization
   - Test SSE event generation

2. **Integration Tests:**
   - Test end-to-end file change detection
   - Test SSE connection lifecycle
   - Test reconnection logic

3. **Manual Testing:**
   - Test with rapid file changes (debouncing)
   - Test with large repositories
   - Test disconnection/reconnection
   - Test cross-platform (Linux, macOS, Windows)

## Security Considerations

1. **Path Traversal:** Ensure file watcher only watches working directory
2. **Resource Limits:** Limit number of concurrent SSE connections
3. **Denial of Service:** Debouncing prevents event storms
4. **Sensitive Files:** Never include `.git` directory contents in events

## Performance Impact

**Memory:**
- watchdog observer: ~2-5 MB
- Event queue per connection: ~1 MB
- Total overhead: ~3-10 MB per active connection

**CPU:**
- File watching: negligible (kernel-level inotify/kqueue)
- Debouncing: minimal
- SSE streaming: negligible

**Network:**
- Initial connection: ~1 KB
- Change event: ~100 bytes
- Keepalive: ~20 bytes every 30 seconds

## Documentation Updates Needed

1. **README.md:** Add auto-reload feature to feature list
2. **CLAUDE.md:** Update implementation status
3. **User Guide:** Explain auto-reload behavior and configuration
4. **CHANGELOG.md:** Document new feature

## Future Enhancements

1. **Granular Updates:** Send specific file paths that changed
2. **Smart Merging:** Only update affected diff sections
3. **Conflict Detection:** Warn if local changes conflict with updates
4. **Bandwidth Optimization:** Send compressed/diffed updates
5. **WebSocket Upgrade:** For bi-directional communication if needed

## Conclusion

Implementing auto-reload will significantly enhance the developer experience with Difflicious by providing real-time updates without manual intervention. The recommended SSE approach offers the best balance of performance, user experience, and maintainability.

The implementation can be done incrementally, starting with a basic SSE+reload approach and enhancing it over time with smarter update strategies.
