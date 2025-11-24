"""Tests for file watcher service."""

import queue
import time

from difflicious.services.file_watcher import DiffWatcher


class MockEvent:
    """Mock file system event for testing."""

    def __init__(self, src_path: str):
        self.src_path = src_path


class TestDiffWatcher:
    def test_initialization(self, tmp_path):
        """Test file watcher can be initialized."""
        event_queue = queue.Queue()
        watcher = DiffWatcher(str(tmp_path), event_queue)

        assert watcher.repo_path == str(tmp_path.resolve())
        assert watcher.event_queue is event_queue
        assert watcher.debounce_seconds == 1.0
        assert ".git" in watcher.ignore_patterns

    def test_initialization_with_custom_debounce(self, tmp_path):
        """Test initialization with custom debounce timing."""
        event_queue = queue.Queue()
        watcher = DiffWatcher(str(tmp_path), event_queue, debounce_seconds=2.5)

        assert watcher.debounce_seconds == 2.5

    def test_initialization_with_custom_ignore_patterns(self, tmp_path):
        """Test initialization with custom ignore patterns."""
        event_queue = queue.Queue()
        ignore_patterns = ["node_modules", "__pycache__"]
        watcher = DiffWatcher(
            str(tmp_path), event_queue, ignore_patterns=ignore_patterns
        )

        # Should include .git plus custom patterns
        assert ".git" in watcher.ignore_patterns
        assert "node_modules" in watcher.ignore_patterns
        assert "__pycache__" in watcher.ignore_patterns

    def test_should_ignore_git_directory(self, tmp_path):
        """Test that .git paths are ignored."""
        event_queue = queue.Queue()
        watcher = DiffWatcher(str(tmp_path), event_queue)

        assert watcher.should_ignore(str(tmp_path / ".git" / "config"))
        assert watcher.should_ignore(str(tmp_path / "subdir" / ".git" / "HEAD"))

    def test_should_ignore_custom_patterns(self, tmp_path):
        """Test that custom ignore patterns work."""
        event_queue = queue.Queue()
        watcher = DiffWatcher(
            str(tmp_path), event_queue, ignore_patterns=["node_modules", ".idea"]
        )

        assert watcher.should_ignore(str(tmp_path / "node_modules" / "package"))
        assert watcher.should_ignore(str(tmp_path / ".idea" / "config"))
        assert not watcher.should_ignore(str(tmp_path / "src" / "main.py"))

    def test_git_directory_events_ignored(self, tmp_path):
        """Test that .git directory events don't trigger notifications."""
        event_queue = queue.Queue()
        watcher = DiffWatcher(str(tmp_path), event_queue, debounce_seconds=0.1)

        # Simulate .git event
        event = MockEvent(str(tmp_path / ".git" / "config"))
        watcher.on_any_event(event)

        # Wait for potential debounce
        time.sleep(0.2)

        # No events should be in queue
        assert event_queue.empty()

    def test_events_outside_repository_ignored(self, tmp_path, caplog):
        """Test that events outside repository are ignored with warning."""
        event_queue = queue.Queue()
        watcher = DiffWatcher(str(tmp_path), event_queue, debounce_seconds=0.1)

        # Create event for path outside repository
        outside_path = "/completely/different/path/file.txt"
        event = MockEvent(outside_path)

        watcher.on_any_event(event)

        # Wait for potential debounce
        time.sleep(0.2)

        # No events should be in queue
        assert event_queue.empty()

        # Should have logged warning
        assert "Ignoring event outside repository" in caplog.text

    def test_debouncing_rapid_events(self, tmp_path):
        """Test that rapid events are debounced into single notification."""
        event_queue = queue.Queue()
        watcher = DiffWatcher(str(tmp_path), event_queue, debounce_seconds=0.2)

        # Simulate rapid events
        for i in range(5):
            event = MockEvent(str(tmp_path / f"file{i}.txt"))
            watcher.on_any_event(event)
            time.sleep(0.05)  # 50ms between events

        # Wait for debounce to complete
        time.sleep(0.3)

        # Should only have one event in queue
        assert event_queue.qsize() == 1

        # Verify event content
        event_data = event_queue.get()
        assert event_data["type"] == "change"
        assert "timestamp" in event_data

    def test_debouncing_separate_bursts(self, tmp_path):
        """Test that separate bursts of events produce separate notifications."""
        event_queue = queue.Queue()
        watcher = DiffWatcher(str(tmp_path), event_queue, debounce_seconds=0.1)

        # First burst
        for i in range(3):
            event = MockEvent(str(tmp_path / f"file{i}.txt"))
            watcher.on_any_event(event)
            time.sleep(0.03)

        # Wait for first debounce
        time.sleep(0.15)

        # Second burst (after debounce period)
        for i in range(3):
            event = MockEvent(str(tmp_path / f"file{i}.txt"))
            watcher.on_any_event(event)
            time.sleep(0.03)

        # Wait for second debounce
        time.sleep(0.15)

        # Should have two events in queue
        assert event_queue.qsize() == 2

    def test_valid_file_event_generates_notification(self, tmp_path):
        """Test that valid file events generate notifications."""
        event_queue = queue.Queue()
        watcher = DiffWatcher(str(tmp_path), event_queue, debounce_seconds=0.1)

        # Simulate valid file event
        event = MockEvent(str(tmp_path / "src" / "main.py"))
        watcher.on_any_event(event)

        # Wait for debounce
        time.sleep(0.15)

        # Should have one event
        assert event_queue.qsize() == 1

        event_data = event_queue.get()
        assert event_data["type"] == "change"
        assert isinstance(event_data["timestamp"], float)

    def test_send_event_format(self, tmp_path):
        """Test that events have correct format."""
        event_queue = queue.Queue()
        watcher = DiffWatcher(str(tmp_path), event_queue, debounce_seconds=0.1)

        event = MockEvent(str(tmp_path / "test.txt"))
        watcher.on_any_event(event)

        time.sleep(0.15)

        event_data = event_queue.get()

        # Verify required fields
        assert "type" in event_data
        assert "timestamp" in event_data
        assert event_data["type"] == "change"
        assert event_data["timestamp"] > 0
