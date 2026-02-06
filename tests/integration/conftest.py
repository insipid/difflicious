"""Integration test fixtures for API and frontend routes."""

from pathlib import Path

import pytest

from difflicious.app import create_app


@pytest.fixture
def repo_path(git_repo_with_untracked, monkeypatch):
    """Provide a temp repo with a known diff and set it as CWD."""
    repo_root = Path(git_repo_with_untracked.working_tree_dir)
    tracked_file = repo_root / "tracked.txt"
    tracked_file.write_text("Initial content\nModified line\n")
    monkeypatch.chdir(repo_root)
    return repo_root


@pytest.fixture
def client(repo_path):
    """Flask test client configured for integration tests."""
    app = create_app()
    app.config.update(TESTING=True)
    with app.test_client() as test_client:
        yield test_client
