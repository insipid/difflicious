"""
Test fixtures for git repository testing.

Provides reusable git repository fixtures for comprehensive testing of git operations.
"""

from pathlib import Path

import pytest
from git import Repo


@pytest.fixture
def git_repo_with_untracked(tmp_path):
    """Repo with untracked files."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    repo.config_writer().set_value("commit", "gpgsign", "false").release()

    # Create initial commit
    test_file = Path(tmp_path) / "tracked.txt"
    test_file.write_text("Initial content\n")
    repo.index.add(["tracked.txt"])
    repo.index.commit("Initial commit")

    # Add untracked file
    untracked = Path(tmp_path) / "untracked.txt"
    untracked.write_text("Untracked content\n")

    return repo


@pytest.fixture
def git_repo_with_renames(tmp_path):
    """Repo with renamed files."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    repo.config_writer().set_value("commit", "gpgsign", "false").release()

    # Create file and commit
    old_file = Path(tmp_path) / "old_name.txt"
    old_file.write_text("Content\n")
    repo.index.add(["old_name.txt"])
    repo.index.commit("Add file")

    # Rename file
    new_file = Path(tmp_path) / "new_name.txt"
    old_file.rename(new_file)
    repo.index.add(["old_name.txt", "new_name.txt"])

    return repo


@pytest.fixture
def git_repo_with_binary(tmp_path):
    """Repo with binary file changes."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    repo.config_writer().set_value("commit", "gpgsign", "false").release()

    # Create binary file
    binary_file = Path(tmp_path) / "image.png"
    binary_file.write_bytes(b"\x89PNG\r\n\x1a\n")  # PNG header
    repo.index.add(["image.png"])
    repo.index.commit("Add binary file")

    # Modify binary file
    binary_file.write_bytes(b"\x89PNG\r\n\x1a\nModified")
    repo.index.add(["image.png"])

    return repo


@pytest.fixture
def git_repo_empty(tmp_path):
    """Empty repo (no commits)."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    repo.config_writer().set_value("commit", "gpgsign", "false").release()
    return repo


@pytest.fixture
def git_repo_detached_head(tmp_path):
    """Repo in detached HEAD state."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    repo.config_writer().set_value("commit", "gpgsign", "false").release()

    # Create commits
    test_file = Path(tmp_path) / "test.txt"
    test_file.write_text("Commit 1\n")
    repo.index.add(["test.txt"])
    commit1 = repo.index.commit("First commit")

    test_file.write_text("Commit 2\n")
    repo.index.add(["test.txt"])
    repo.index.commit("Second commit")

    # Checkout detached HEAD
    repo.git.checkout(commit1.hexsha)

    return repo


@pytest.fixture
def git_repo_multiple_branches(tmp_path):
    """Repo with multiple branches."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    repo.config_writer().set_value("commit", "gpgsign", "false").release()

    # Create main branch with commits
    main_file = Path(tmp_path) / "main.txt"
    main_file.write_text("Main content\n")
    repo.index.add(["main.txt"])
    repo.index.commit("Main commit")

    # Create feature branch
    repo.git.checkout("-b", "feature")
    feature_file = Path(tmp_path) / "feature.txt"
    feature_file.write_text("Feature content\n")
    repo.index.add(["feature.txt"])
    repo.index.commit("Feature commit")

    # Return to main/master
    repo.git.checkout("master")

    return repo


@pytest.fixture
def git_repo_with_staged_and_unstaged(tmp_path):
    """Repo with both staged and unstaged changes."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    repo.config_writer().set_value("commit", "gpgsign", "false").release()

    # Create and commit file
    test_file = Path(tmp_path) / "test.txt"
    test_file.write_text("Original\n")
    repo.index.add(["test.txt"])
    repo.index.commit("Initial commit")

    # Make staged change
    test_file.write_text("Staged change\n")
    repo.index.add(["test.txt"])

    # Make unstaged change (modify again)
    test_file.write_text("Staged change\nUnstaged change\n")

    return repo


@pytest.fixture
def git_repo_with_unicode(tmp_path):
    """Repo with unicode filenames and content."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    repo.config_writer().set_value("commit", "gpgsign", "false").release()

    # Create file with unicode content
    unicode_file = Path(tmp_path) / "unicode_文件.txt"
    unicode_file.write_text("Unicode content: 你好世界 🌍\n", encoding="utf-8")
    repo.index.add(["unicode_文件.txt"])
    repo.index.commit("Add unicode file")

    # Modify with more unicode
    unicode_file.write_text(
        "Unicode content: 你好世界 🌍\nMore: こんにちは\n", encoding="utf-8"
    )

    return repo


@pytest.fixture
def git_repo_large_diff(tmp_path):
    """Repo with large file diff (1000+ lines)."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    repo.config_writer().set_value("commit", "gpgsign", "false").release()

    # Create large file
    large_file = Path(tmp_path) / "large.txt"
    large_file.write_text("\n".join([f"Line {i}" for i in range(1000)]))
    repo.index.add(["large.txt"])
    repo.index.commit("Add large file")

    # Modify large file (change every other line)
    lines = [f"Modified Line {i}" if i % 2 == 0 else f"Line {i}" for i in range(1000)]
    large_file.write_text("\n".join(lines))

    return repo
