# Auto-Reload Implementation Plan

**Date:** 2025-11-17
**Status:** Implementation Plan
**Approach:** Watchdog + Server-Sent Events (SSE)

## Overview

Implement automatic page reload/update when files in the git working directory change using cross-platform file watching (watchdog) and real-time browser updates via Server-Sent Events.

## Implementation Phases

### Phase 1: Core SSE Implementation (MVP)

**Goal:** Basic auto-reload functionality using watchdog + SSE with full page reload

**Dependencies:**
```toml
# Add to pyproject.toml dependencies
dependencies = [
    # ... existing deps
    "watchdog>=3.0.0",
]
```

**Backend Tasks:**

1. **Create FileWatcher Service** (`src/difflicious/services/file_watcher.py`)
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

2. **Add SSE Endpoint** (`src/difflicious/app.py`)
   ```python
   import queue
   import json
   from watchdog.observers import Observer

   @app.route('/api/watch')
   def watch_changes():
       """Server-Sent Events endpoint for file change notifications."""

       def event_stream():
           # Create event queue for this connection
           event_queue = queue.Queue()
           observer = None

           # Set up file watcher
           try:
               git_service = GitService()
               repo_path = git_service.repo.working_dir

               # Get debounce setting from environment
               debounce = float(os.getenv('DIFFLICIOUS_WATCH_DEBOUNCE', '1.0'))

               watcher = DiffWatcher(repo_path, event_queue, debounce_seconds=debounce)
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
               logger.error(f"Watch error: {e}")
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

**Frontend Tasks:**

1. **Add AutoReload Module** (`src/difflicious/static/js/diff-interactions.js`)
   ```javascript
   // Auto-reload functionality
   const AutoReload = {
       eventSource: null,
       enabled: true,
       reconnectAttempts: 0,
       maxReconnectAttempts: 5,

       init() {
           // Check environment variable
           const autoReloadEnabled = document.body.dataset.autoReload !== 'false';
           if (!autoReloadEnabled || !this.enabled) {
               if (DEBUG) console.log('Auto-reload disabled');
               return;
           }

           // Check if SSE is supported
           if (typeof EventSource === 'undefined') {
               console.warn('SSE not supported, auto-reload disabled');
               return;
           }

           this.connect();
       },

       connect() {
           if (DEBUG) console.log('Connecting to auto-reload stream...');

           this.eventSource = new EventSource('/api/watch');

           this.eventSource.addEventListener('message', (event) => {
               const data = JSON.parse(event.data);

               if (data.type === 'connected') {
                   if (DEBUG) console.log('Auto-reload connected');
                   this.reconnectAttempts = 0;
               } else if (data.type === 'change') {
                   this.handleFileChange();
               }
           });

           this.eventSource.addEventListener('error', (error) => {
               console.error('SSE connection error:', error);
               this.handleConnectionError();
           });
       },

       async handleFileChange() {
           if (DEBUG) console.log('File change detected, refreshing...');

           // Save current state before reload
           DiffState.saveState();

           // Simple approach: full page reload
           // State will be restored via localStorage
           window.location.reload();
       },

       handleConnectionError() {
           this.eventSource?.close();

           if (this.reconnectAttempts < this.maxReconnectAttempts) {
               this.reconnectAttempts++;
               const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

               if (DEBUG) console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
               setTimeout(() => this.connect(), delay);
           } else {
               console.error('Max reconnection attempts reached. Auto-reload disabled.');
           }
       },

       disconnect() {
           if (this.eventSource) {
               this.eventSource.close();
               this.eventSource = null;
               if (DEBUG) console.log('Auto-reload disconnected');
           }
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

2. **Add Data Attribute to Body** (`src/difflicious/templates/base.html`)
   ```html
   <body class="min-h-screen" data-auto-reload="{{ 'true' if auto_reload_enabled else 'false' }}">
   ```

3. **Add Template Context** (`src/difflicious/app.py`)
   ```python
   @app.context_processor
   def inject_auto_reload_config() -> dict[str, bool]:
       """Inject auto-reload configuration into all templates."""
       auto_reload_enabled = os.getenv('DIFFLICIOUS_AUTO_RELOAD', 'true').lower() == 'true'
       return {"auto_reload_enabled": auto_reload_enabled}
   ```

**Estimated Time:** 3-4 hours

---

### Phase 2: Enhanced Update Strategy

**Goal:** Improve update mechanism to preserve scroll position and minimize visual disruption

**Tasks:**

1. **Smart Reload Function**
   ```javascript
   async handleFileChange() {
       if (DEBUG) console.log('File change detected, refreshing...');

       // Save current state
       DiffState.saveState();

       // Save scroll position
       const scrollY = window.scrollY;
       sessionStorage.setItem('difflicious-scroll-position', scrollY.toString());

       // Reload page
       window.location.reload();
   }
   ```

2. **Restore Scroll Position** (add to DiffState.init)
   ```javascript
   async init() {
       await this.initializeRepository();
       this.bindEventListeners();
       this.restoreState();
       this.installSearchHotkeys();
       this.installLiveSearchFilter();

       // Restore scroll position after reload
       requestAnimationFrame(() => {
           const savedScroll = sessionStorage.getItem('difflicious-scroll-position');
           if (savedScroll) {
               window.scrollTo(0, parseInt(savedScroll, 10));
               sessionStorage.removeItem('difflicious-scroll-position');
           }
       });
   }
   ```

3. **Visual Feedback for Updates**
   ```javascript
   async handleFileChange() {
       // Show brief notification before reload
       const notification = document.createElement('div');
       notification.className = 'fixed top-4 right-4 px-4 py-2 rounded shadow-lg z-50';
       notification.style.cssText = 'background: var(--surface-secondary); color: var(--text-primary);';
       notification.textContent = '🔄 Updating...';
       document.body.appendChild(notification);

       // Save state
       DiffState.saveState();

       // Save scroll position
       const scrollY = window.scrollY;
       sessionStorage.setItem('difflicious-scroll-position', scrollY.toString());

       // Brief delay for visual feedback
       await new Promise(resolve => setTimeout(resolve, 300));

       // Reload
       window.location.reload();
   }
   ```

**Estimated Time:** 2-3 hours

---

### Phase 3: Polish and Configuration

**Goal:** Add user-configurable options, status indicators, and handle edge cases

**Configuration Options:**

Add to CLI (`src/difflicious/cli.py`):
```python
@click.option(
    '--auto-reload/--no-auto-reload',
    default=True,
    help='Enable/disable auto-reload on file changes',
    envvar='DIFFLICIOUS_AUTO_RELOAD'
)
@click.option(
    '--watch-debounce',
    default=1.0,
    type=float,
    help='Debounce delay in seconds for file watch events',
    envvar='DIFFLICIOUS_WATCH_DEBOUNCE'
)
def main(host, port, debug, auto_reload, watch_debounce):
    """Launch the Difflicious diff viewer."""
    # Store in environment for app to access
    os.environ['DIFFLICIOUS_AUTO_RELOAD'] = str(auto_reload).lower()
    os.environ['DIFFLICIOUS_WATCH_DEBOUNCE'] = str(watch_debounce)

    # ... rest of function
```

**Environment Variables:**
```bash
# Enable/disable auto-reload
DIFFLICIOUS_AUTO_RELOAD=true

# Debounce delay in seconds
DIFFLICIOUS_WATCH_DEBOUNCE=1.0

# File patterns to ignore (in addition to .git)
DIFFLICIOUS_WATCH_IGNORE=".git,.idea,node_modules,__pycache__"
```

**Status Indicator:**
```javascript
addStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'auto-reload-indicator';
    indicator.className = 'fixed bottom-4 right-4 px-2 py-1 text-xs rounded opacity-50 hover:opacity-100 transition-opacity';
    indicator.style.cssText = 'background: var(--surface-secondary); color: var(--text-secondary); pointer-events: auto; cursor: pointer;';
    indicator.innerHTML = '🔄 <span class="connection-status">Auto-reload active</span>';
    indicator.title = 'Click to disable auto-reload';

    // Toggle on click
    indicator.addEventListener('click', () => {
        if (this.enabled) {
            this.disconnect();
            this.enabled = false;
            indicator.querySelector('.connection-status').textContent = 'Auto-reload disabled';
            indicator.style.opacity = '0.3';
        } else {
            this.enabled = true;
            this.init();
            indicator.querySelector('.connection-status').textContent = 'Auto-reload active';
            indicator.style.opacity = '0.5';
        }
    });

    document.body.appendChild(indicator);
},
```

**Connection Status Updates:**
```javascript
updateStatusIndicator(status) {
    const indicator = document.getElementById('auto-reload-indicator');
    if (!indicator) return;

    const statusText = indicator.querySelector('.connection-status');
    if (!statusText) return;

    const statusMessages = {
        'connected': '🟢 Auto-reload active',
        'connecting': '🟡 Connecting...',
        'error': '🔴 Connection error',
        'disabled': '⚫ Auto-reload disabled'
    };

    statusText.textContent = statusMessages[status] || status;
}
```

**Estimated Time:** 2-3 hours

---

## Security Considerations

### Path Traversal Prevention
```python
def on_any_event(self, event):
    # Ignore .git directory
    if '/.git/' in event.src_path or event.src_path.endswith('/.git'):
        return

    # Verify path is within repository
    repo_path = os.path.abspath(self.repo_path)
    event_path = os.path.abspath(event.src_path)

    if not event_path.startswith(repo_path):
        logger.warning(f"Ignoring event outside repository: {event_path}")
        return

    # Continue processing...
```

### Resource Limits
```python
# Limit concurrent SSE connections
MAX_WATCH_CONNECTIONS = 10
active_watch_connections = 0

@app.route('/api/watch')
def watch_changes():
    global active_watch_connections

    if active_watch_connections >= MAX_WATCH_CONNECTIONS:
        return jsonify({
            'status': 'error',
            'message': 'Too many active watch connections'
        }), 429

    active_watch_connections += 1

    try:
        # ... event stream code
    finally:
        active_watch_connections -= 1
```

### Debouncing to Prevent Event Storms
- Already implemented in `DiffWatcher` with configurable `debounce_seconds`
- Default: 1.0 second
- Prevents rapid-fire events during bulk file operations

### Sensitive Files
```python
# Additional ignore patterns from environment
ignore_patterns = os.getenv(
    'DIFFLICIOUS_WATCH_IGNORE',
    '.git,.idea,node_modules,__pycache__'
).split(',')

def should_ignore(self, path):
    for pattern in self.ignore_patterns:
        if pattern in path:
            return True
    return False
```

---

## Testing Strategy

### Unit Tests

**File:** `tests/services/test_file_watcher.py`
```python
import pytest
import time
from pathlib import Path
from queue import Queue
from difflicious.services.file_watcher import DiffWatcher

def test_debouncing_logic(tmp_path):
    """Test that rapid events are debounced."""
    event_queue = Queue()
    watcher = DiffWatcher(str(tmp_path), event_queue, debounce_seconds=0.5)

    # Simulate rapid events
    for i in range(5):
        watcher.on_any_event(MockEvent(str(tmp_path / f"file{i}.txt")))
        time.sleep(0.1)

    # Wait for debounce
    time.sleep(0.6)

    # Should only have one event in queue
    assert event_queue.qsize() == 1

def test_git_directory_ignored(tmp_path):
    """Test that .git directory is ignored."""
    event_queue = Queue()
    watcher = DiffWatcher(str(tmp_path), event_queue)

    # Simulate .git event
    watcher.on_any_event(MockEvent(str(tmp_path / ".git" / "config")))

    # No events should be in queue
    assert event_queue.empty()

def test_file_watcher_initialization(tmp_path):
    """Test file watcher can be initialized."""
    event_queue = Queue()
    watcher = DiffWatcher(str(tmp_path), event_queue)

    assert watcher.repo_path == str(tmp_path)
    assert watcher.event_queue is event_queue
    assert watcher.debounce_seconds == 1.0
```

### Integration Tests

**File:** `tests/test_sse_endpoint.py`
```python
import pytest
from difflicious.app import create_app

def test_sse_endpoint_connection(app_with_repo):
    """Test SSE endpoint can be connected to."""
    client = app_with_repo.test_client()

    # Make SSE connection
    response = client.get('/api/watch')

    assert response.status_code == 200
    assert response.mimetype == 'text/event-stream'
    assert 'Cache-Control' in response.headers
    assert response.headers['Cache-Control'] == 'no-cache'

def test_sse_sends_connection_event(app_with_repo):
    """Test SSE sends initial connection event."""
    client = app_with_repo.test_client()

    with client.get('/api/watch', stream=True) as response:
        # Read first event
        first_chunk = next(response.response)
        assert b'connected' in first_chunk

def test_sse_handles_file_changes(app_with_repo, tmp_path):
    """Test SSE sends change events when files change."""
    # This is complex - may require threading and actual file operations
    # Consider as integration/manual test
    pass
```

### Manual Testing Checklist

- [ ] Auto-reload works when saving a file in working directory
- [ ] Auto-reload works when creating a new file
- [ ] Auto-reload works when deleting a file
- [ ] Changes in `.git/` directory are ignored
- [ ] Rapid file changes are debounced (only one reload)
- [ ] Large file operations (git checkout) trigger single reload
- [ ] Scroll position is preserved after reload
- [ ] Expanded files remain expanded after reload
- [ ] Search filter is preserved after reload
- [ ] Connection recovers after network interruption
- [ ] Connection status indicator updates correctly
- [ ] Toggling auto-reload on/off works
- [ ] Environment variables are respected
- [ ] Works on Linux
- [ ] Works on macOS
- [ ] Works on Windows

### Cross-Platform Testing

**Linux:**
- Uses inotify (kernel-level)
- Should be very efficient

**macOS:**
- Uses FSEvents (kernel-level)
- Should be very efficient

**Windows:**
- Uses ReadDirectoryChangesW
- May be slightly less efficient
- Test with large repositories

---

## Performance Monitoring

### Metrics to Track

```python
import time
from collections import defaultdict

class WatchMetrics:
    def __init__(self):
        self.events_received = 0
        self.events_debounced = 0
        self.events_sent = 0
        self.start_time = time.time()

    def log_stats(self):
        uptime = time.time() - self.start_time
        logger.info(f"Watch metrics - Uptime: {uptime:.1f}s, "
                   f"Received: {self.events_received}, "
                   f"Debounced: {self.events_debounced}, "
                   f"Sent: {self.events_sent}")
```

### Expected Performance

**Memory:**
- watchdog observer: ~2-5 MB per repository
- Event queue: ~1 MB per active connection
- Total: ~3-10 MB per active user

**CPU:**
- File watching: negligible (kernel-level)
- Debouncing: < 1% CPU
- SSE streaming: negligible

**Network:**
- Initial connection: ~1 KB
- Change event: ~100 bytes
- Keepalive: ~20 bytes every 30 seconds
- Total bandwidth: < 1 KB/minute during idle

---

## Documentation Updates

### README.md
Add to features section:
```markdown
- 🔄 **Auto-Reload**: Automatically refreshes when working directory files change
```

### User Guide (New Section)
```markdown
## Auto-Reload

Difflicious automatically reloads when files in your working directory change, providing real-time diff updates.

### Configuration

**Enable/Disable:**
```bash
# Enable (default)
difflicious --auto-reload

# Disable
difflicious --no-auto-reload

# Or via environment variable
export DIFFLICIOUS_AUTO_RELOAD=false
```

**Adjust Debounce Timing:**
```bash
# Wait 2 seconds after last change before reloading
difflicious --watch-debounce=2.0

# Or via environment variable
export DIFFLICIOUS_WATCH_DEBOUNCE=2.0
```

### How It Works

Auto-reload uses file system watchers to detect changes in your git working directory. When a file is modified, created, or deleted, the page automatically refreshes while preserving your UI state (expanded files, scroll position, search filters, etc.).

### Troubleshooting

**Auto-reload not working:**
- Check that SSE is supported in your browser (all modern browsers)
- Check browser console for connection errors
- Verify the status indicator in bottom-right corner

**Too many reloads:**
- Increase debounce delay: `--watch-debounce=2.0`
- Check that `.git` directory isn't being watched (should be automatic)
```

### CLAUDE.md
Update implementation status:
```markdown
## Core Features Status

- ✅ **Advanced Diff Parsing**: Complete git diff parser with side-by-side structure generation
- ✅ **Side-by-Side Visualization**: Professional-grade diff interface with line numbering and color coding
- ✅ **Syntax Highlighting**: Beautiful code highlighting for 30+ languages using Highlight.js
- ✅ **Smart UI Controls**: Expand/collapse all buttons with intelligent disabled states
- ✅ **Clean File Paths**: Automatic removal of git diff artifacts (a/, b/ prefixes)
- ✅ **Interactive Controls**: Toggle visibility, search/filter capabilities implemented
- ✅ **Git Integration**: Live git status and structured diff data from real repositories
- ✅ **Service Architecture**: Clean separation of concerns with testable business logic
- ✅ **Command-line Interface**: Full CLI with host, port, debug options
- ✅ **Modern UI**: Tailwind CSS styling with responsive design
- ✅ **Auto-Reload**: Real-time updates via file watching and Server-Sent Events
```

### CHANGELOG.md
```markdown
## [Unreleased]

### Added
- Auto-reload functionality using watchdog and Server-Sent Events
- Real-time page updates when working directory files change
- Configurable debounce timing for file change events
- Visual connection status indicator
- CLI options for auto-reload configuration
- State preservation during auto-reload (scroll, expanded files, etc.)
```

---

## Rollout Plan

### Phase 1 Deployment (MVP)
1. Merge to development branch
2. Test on local repositories
3. Test with large repositories (performance)
4. Test cross-platform (Linux, macOS, Windows)
5. Internal dogfooding for 1 week

### Phase 2 Deployment (Enhanced)
1. Gather feedback from Phase 1
2. Implement scroll preservation
3. Add visual feedback
4. Internal testing for 3 days

### Phase 3 Deployment (Polish)
1. Add configuration options
2. Add status indicator
3. Final testing
4. Release to users

### Success Criteria

- ✅ Auto-reload works within 2 seconds of file change
- ✅ No noticeable performance impact on application
- ✅ Works across all supported platforms
- ✅ State preservation works correctly
- ✅ Connection recovery works reliably
- ✅ Zero crashes or errors in normal usage

---

## Risk Mitigation

### Risk: File watching doesn't work on some systems
**Mitigation:** Watchdog is mature and cross-platform tested. Extensive testing on all platforms.

### Risk: Too many events cause performance issues
**Mitigation:** Debouncing prevents event storms. Configurable timing allows tuning.

### Risk: SSE connections don't stay alive
**Mitigation:** Keepalive messages every 30 seconds. Automatic reconnection with exponential backoff.

### Risk: Users don't want auto-reload
**Mitigation:** Easily disabled via CLI flag or environment variable. Status indicator shows it's active.

### Risk: Breaks existing functionality
**Mitigation:** Comprehensive testing. Feature is additive and can be disabled.

---

## Total Estimated Implementation Time

- **Phase 1 (MVP):** 3-4 hours
- **Phase 2 (Enhanced):** 2-3 hours
- **Phase 3 (Polish):** 2-3 hours
- **Testing & Documentation:** 2-3 hours
- **Buffer for unforeseen issues:** 2 hours

**Total: 11-15 hours**

---

## Next Steps

1. Review and approve this implementation plan
2. Add `watchdog>=3.0.0` to dependencies
3. Start with Phase 1 implementation
4. Test thoroughly on target platforms
5. Iterate based on feedback
6. Deploy in phases

## Questions to Resolve

- [ ] Should auto-reload be enabled by default? **Recommendation: Yes**
- [ ] What should default debounce timing be? **Recommendation: 1.0 second**
- [ ] Should status indicator be permanent or dismissible? **Recommendation: Permanent but subtle**
- [ ] Should we support disabling at runtime (beyond page refresh)? **Recommendation: Yes, via indicator**
