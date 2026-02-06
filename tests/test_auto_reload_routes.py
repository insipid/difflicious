"""Tests for auto-reload SSE routes and helpers."""

import queue

from flask import Flask

from difflicious.blueprints import auto_reload_routes
from difflicious.blueprints.auto_reload_routes import BroadcastQueue, WatchManager


class FakeObserver:
    def __init__(self):
        self.scheduled = []
        self.started = False
        self.stopped = False
        self.joined = False

    def schedule(self, watcher, path, recursive=True):
        self.scheduled.append((watcher, path, recursive))

    def start(self):
        self.started = True

    def stop(self):
        self.stopped = True

    def join(self):
        self.joined = True


class FakeWatcher:
    def __init__(self, repo_path, event_queue, debounce, ignore_patterns):
        self.repo_path = repo_path
        self.event_queue = event_queue
        self.debounce = debounce
        self.ignore_patterns = ignore_patterns


def test_broadcast_queue_puts_to_all_clients():
    client_one = queue.Queue()
    client_two = queue.Queue()
    broadcaster = BroadcastQueue({1: client_one, 2: client_two})

    payload = {"type": "change"}
    broadcaster.put(payload)

    assert client_one.get_nowait() == payload
    assert client_two.get_nowait() == payload


def test_watch_manager_add_remove_starts_observer(monkeypatch, tmp_path):
    monkeypatch.setattr(auto_reload_routes, "Observer", FakeObserver)
    monkeypatch.setattr(auto_reload_routes, "DiffWatcher", FakeWatcher)

    manager = WatchManager()
    client_id, client_queue = manager.add_client(
        str(tmp_path), 0.5, [".git", "node_modules"]
    )

    assert client_id == 0
    assert isinstance(client_queue, queue.Queue)
    assert manager.observer is not None
    assert manager.observer.started is True
    assert manager.repo_path == str(tmp_path)

    observer = manager.observer
    manager.remove_client(client_id)

    assert observer.stopped is True
    assert observer.joined is True
    assert manager.observer is None


def test_watch_changes_streams_events(monkeypatch):
    event_queue = queue.Queue()
    event_queue.put({"type": "change", "timestamp": 123})

    def fake_add_client(repo_path, debounce, ignore_patterns):
        return 7, event_queue

    removed = []

    def fake_remove_client(client_id):
        removed.append(client_id)

    class FakeRepo:
        repo_path = "/tmp/repo"

    class FakeGitService:
        def __init__(self):
            self.repo = FakeRepo()

    monkeypatch.setattr(auto_reload_routes.watch_manager, "add_client", fake_add_client)
    monkeypatch.setattr(
        auto_reload_routes.watch_manager, "remove_client", fake_remove_client
    )
    monkeypatch.setattr(auto_reload_routes, "GitService", FakeGitService)

    app = Flask(__name__)
    app.register_blueprint(auto_reload_routes.auto_reload_api)

    with app.test_client() as client:
        response = client.get("/api/watch")
        iterator = iter(response.response)
        first_chunk = next(iterator).decode()
        second_chunk = next(iterator).decode()

        assert "connected" in first_chunk
        assert "change" in second_chunk

        response.close()

    assert removed == [7]
