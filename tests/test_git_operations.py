"""Tests for git operations module - GitPython implementation."""

import os
import subprocess
import tempfile
from pathlib import Path

import pytest

from difflicious.git_operations import (
    GitOperationError,
    GitRepository,
    get_git_repository,
)


@pytest.fixture
def temp_git_repo():
    """Create a temporary git repository for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        repo_path = Path(temp_dir)

        # Initialize git repository
        subprocess.run(["git", "init"], cwd=repo_path, check=True, capture_output=True)
        subprocess.run(
            ["git", "config", "user.email", "test@example.com"],
            cwd=repo_path,
            check=True,
        )
        subprocess.run(
            ["git", "config", "user.name", "Test User"], cwd=repo_path, check=True
        )
        subprocess.run(
            ["git", "config", "commit.gpgsign", "false"], cwd=repo_path, check=True
        )

        # Create initial commit
        test_file = repo_path / "test.txt"
        test_file.write_text("Initial content\n")
        subprocess.run(["git", "add", "test.txt"], cwd=repo_path, check=True)
        subprocess.run(
            ["git", "commit", "-m", "Initial commit"],
            cwd=repo_path,
            check=True,
            capture_output=True,
        )

        yield repo_path


class TestGitRepository:
    """Test cases for GitRepository class - GitPython implementation."""

    def test_init_with_valid_repo(self, temp_git_repo):
        """Test GitRepository initialization with valid repository."""
        repo = GitRepository(str(temp_git_repo))
        assert repo.repo_path == temp_git_repo
        assert repo.repo is not None

    def test_init_with_current_directory(self, temp_git_repo):
        """Test GitRepository initialization with current directory."""
        old_cwd = os.getcwd()
        try:
            os.chdir(temp_git_repo)
            repo = GitRepository()
            assert repo.repo_path.resolve() == temp_git_repo.resolve()
        finally:
            os.chdir(old_cwd)

    def test_init_with_invalid_path(self):
        """Test GitRepository initialization with invalid path."""
        with pytest.raises(GitOperationError, match="Repository path does not exist"):
            GitRepository("/nonexistent/path")

    def test_init_with_non_git_directory(self):
        """Test GitRepository initialization with non-git directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            with pytest.raises(GitOperationError, match="Not a git repository"):
                GitRepository(temp_dir)

    def test_get_status_real_repo(self, temp_git_repo):
        """Test get_status with real git repository."""
        repo = GitRepository(str(temp_git_repo))
        status = repo.get_status()

        assert isinstance(status, dict)
        assert "git_available" in status
        assert "current_branch" in status
        assert "files_changed" in status
        assert "repository_path" in status
        assert "is_clean" in status

        assert status["git_available"] is True
        assert status["repository_path"] == str(temp_git_repo)

    def test_get_diff_real_repo(self, temp_git_repo):
        """Test get_diff with real git repository."""
        repo = GitRepository(str(temp_git_repo))

        # Make a change to create a diff
        test_file = temp_git_repo / "test.txt"
        test_file.write_text("Modified content\n")

        diffs = repo.get_diff()

        assert isinstance(diffs, dict)
        assert "untracked" in diffs
        assert "unstaged" in diffs
        assert "staged" in diffs


class TestGitRepositoryFactory:
    """Test cases for git repository factory function."""

    def test_get_git_repository_with_path(self, temp_git_repo):
        """Test factory function with explicit path."""
        repo = get_git_repository(str(temp_git_repo))
        assert isinstance(repo, GitRepository)
        assert repo.repo_path == temp_git_repo

    def test_get_git_repository_current_dir(self, temp_git_repo):
        """Test factory function with current directory."""
        old_cwd = os.getcwd()
        try:
            os.chdir(temp_git_repo)
            repo = get_git_repository()
            assert isinstance(repo, GitRepository)
            assert repo.repo_path.resolve() == temp_git_repo.resolve()
        finally:
            os.chdir(old_cwd)
