"""Auto-reload API endpoints for Server-Sent Events."""

import json
import logging
import os
import queue
import threading
from collections.abc import Generator
from typing import Optional

from flask import Blueprint, Response
from watchdog.observers import Observer
from watchdog.observers.api import BaseObserver

from difflicious.services.file_watcher import DiffWatcher
from difflicious.services.git_service import GitService

logger = logging.getLogger(__name__)

auto_reload_api = Blueprint("auto_reload_api", __name__, url_prefix="/api")


class WatchManager:
    """Manages a shared file watcher that broadcasts to multiple SSE clients.

    This prevents the FSEvents error on macOS where multiple observers
    cannot watch the same path simultaneously.
    """

    def __init__(self) -> None:
        self.observer: Optional[BaseObserver] = None
        self.watcher: Optional[DiffWatcher] = None
        self.clients: dict[int, queue.Queue] = {}
        self.lock = threading.Lock()
        self.client_id_counter = 0
        self.repo_path: Optional[str] = None

    def add_client(
        self, repo_path: str, debounce: float, ignore_patterns: list[str]
    ) -> tuple[int, queue.Queue]:
        """Add a new SSE client and return its ID and queue.

        Args:
            repo_path: Path to repository to watch
            debounce: Debounce delay in seconds
            ignore_patterns: Patterns to ignore

        Returns:
            Tuple of (client_id, event_queue)
        """
        with self.lock:
            # Create queue for this client
            client_queue: queue.Queue = queue.Queue()
            client_id = self.client_id_counter
            self.client_id_counter += 1
            self.clients[client_id] = client_queue

            # Start observer if this is the first client
            if self.observer is None:
                self.repo_path = repo_path
                # Create a broadcast queue that sends to all clients
                broadcast_queue = BroadcastQueue(self.clients)
                # Type ignore needed because BroadcastQueue implements queue.Queue protocol
                # but isn't a subclass
                self.watcher = DiffWatcher(
                    repo_path, broadcast_queue, debounce, ignore_patterns  # type: ignore[arg-type]
                )
                self.observer = Observer()
                self.observer.schedule(self.watcher, repo_path, recursive=True)
                self.observer.start()
                logger.info(f"Started shared observer for {repo_path}")

            return client_id, client_queue

    def remove_client(self, client_id: int) -> None:
        """Remove an SSE client and stop observer if no clients remain.

        Args:
            client_id: ID of client to remove
        """
        with self.lock:
            if client_id in self.clients:
                del self.clients[client_id]

            # Stop observer if no clients remain
            if not self.clients and self.observer is not None:
                self.observer.stop()
                self.observer.join()
                self.observer = None
                self.watcher = None
                logger.info("Stopped shared observer (no clients)")


class BroadcastQueue:
    """A queue-like object that broadcasts to multiple client queues."""

    def __init__(self, clients: dict[int, queue.Queue]) -> None:
        self.clients = clients

    def put(self, item: dict) -> None:
        """Put an item into all client queues.

        Args:
            item: Event dict to broadcast
        """
        # Make a copy of clients dict to avoid modification during iteration
        for client_queue in list(self.clients.values()):
            try:
                client_queue.put(item)
            except Exception:
                # Ignore errors for disconnected clients
                pass


# Create shared watch manager for SSE connections
watch_manager = WatchManager()


@auto_reload_api.route("/watch")
def watch_changes() -> Response:
    """Server-Sent Events endpoint for file change notifications."""

    def event_stream() -> Generator[str, None, None]:
        client_id: Optional[int] = None

        try:
            git_service = GitService()
            repo_path = str(git_service.repo.repo_path)

            # Get debounce setting from environment
            debounce = float(os.getenv("DIFFLICIOUS_WATCH_DEBOUNCE", "1.0"))

            # Get additional ignore patterns from environment
            ignore_patterns_str = os.getenv("DIFFLICIOUS_WATCH_IGNORE", ".git")
            ignore_patterns = [p.strip() for p in ignore_patterns_str.split(",")]

            # Register this client with the shared watch manager
            client_id, event_queue = watch_manager.add_client(
                repo_path, debounce, ignore_patterns
            )

            # Send initial connection event
            yield f"data: {json.dumps({'type': 'connected'})}\n\n"

            # Stream events
            while True:
                try:
                    event = event_queue.get(timeout=30)
                    yield f"data: {json.dumps(event)}\n\n"
                except queue.Empty:
                    # Send keepalive
                    yield ": keepalive\n\n"

        except Exception as e:
            logger.error(f"Watch error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            # Unregister this client
            if client_id is not None:
                watch_manager.remove_client(client_id)

    return Response(
        event_stream(),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
