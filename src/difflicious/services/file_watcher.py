"""File watching service for auto-reload functionality."""

import logging
import os
import queue
import threading
import time
from typing import Optional

from watchdog.events import FileSystemEvent, FileSystemEventHandler

logger = logging.getLogger(__name__)


class DiffWatcher(FileSystemEventHandler):
    """Watches git working directory for changes."""

    def __init__(
        self,
        repo_path: str,
        event_queue: queue.Queue,
        debounce_seconds: float = 1.0,
        ignore_patterns: Optional[list[str]] = None,
    ):
        """Initialize the file watcher.

        Args:
            repo_path: Path to the git repository to watch
            event_queue: Queue to send change events to
            debounce_seconds: Delay in seconds to debounce rapid events
            ignore_patterns: Additional patterns to ignore (defaults to ['.git'])
        """
        self.repo_path = os.path.abspath(repo_path)
        self.event_queue = event_queue
        self.debounce_seconds = debounce_seconds
        self.last_event_time = 0.0
        self.debounce_timer: Optional[threading.Timer] = None
        self.ignore_patterns = ignore_patterns or [".git"]

        # Add .git if not already present
        if ".git" not in self.ignore_patterns:
            self.ignore_patterns.append(".git")

    def should_ignore(self, path: str) -> bool:
        """Check if a path should be ignored.

        Args:
            path: File system path to check

        Returns:
            True if the path should be ignored, False otherwise
        """
        for pattern in self.ignore_patterns:
            if pattern in path:
                return True
        return False

    def on_any_event(self, event: FileSystemEvent) -> None:
        """Handle any file system event.

        Args:
            event: watchdog file system event
        """
        # Normalize path to string (watchdog can return bytes or str)
        src_path = (
            event.src_path.decode("utf-8")
            if isinstance(event.src_path, bytes)
            else event.src_path
        )

        # Ignore .git directory and other patterns
        if self.should_ignore(src_path):
            return

        # Verify path is within repository (security check)
        event_path = os.path.abspath(src_path)
        if not event_path.startswith(self.repo_path):
            logger.warning(f"Ignoring event outside repository: {event_path}")
            return

        # Debounce rapid events
        current_time = time.time()
        if current_time - self.last_event_time < self.debounce_seconds:
            # Reset timer
            if self.debounce_timer:
                self.debounce_timer.cancel()

        self.debounce_timer = threading.Timer(self.debounce_seconds, self._send_event)
        self.debounce_timer.start()
        self.last_event_time = current_time

    def _send_event(self) -> None:
        """Send a change event to the queue."""
        logger.info("📝 File changes detected - page will refresh")
        self.event_queue.put({"type": "change", "timestamp": time.time()})
