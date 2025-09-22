"""Tests for git operations module."""

import os
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

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

        # Create initial commit
        test_file = repo_path / "test.txt"
        test_file.write_text("Initial content\n")
        subprocess.run(["git", "add", "test.txt"], cwd=repo_path, check=True)
        subprocess.run(
            ["git", "commit", "-m", "Initial commit"], cwd=repo_path, check=True
        )

        yield repo_path


@pytest.fixture
def mock_git_repo():
    """Create a mock git repository for testing without actual git commands."""
    with tempfile.TemporaryDirectory() as temp_dir:
        repo_path = Path(temp_dir)

        # Create .git directory to make it look like a git repo
        git_dir = repo_path / ".git"
        git_dir.mkdir()

        yield repo_path


class TestGitRepository:
    """Test cases for GitRepository class."""

    def test_init_with_valid_repo(self, temp_git_repo):
        """Test GitRepository initialization with valid repository."""
        repo = GitRepository(str(temp_git_repo))
        assert repo.repo_path == temp_git_repo

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

    def test_sanitize_args_valid(self, mock_git_repo):
        """Test argument sanitization with valid arguments."""
        repo = GitRepository(str(mock_git_repo))

        valid_args = ["status", "--porcelain", "filename.txt"]
        sanitized = repo._sanitize_args(valid_args)

        assert len(sanitized) == 3
        assert all(isinstance(arg, str) for arg in sanitized)

    def test_sanitize_args_dangerous_characters(self, mock_git_repo):
        """Test argument sanitization rejects dangerous characters."""
        repo = GitRepository(str(mock_git_repo))

        dangerous_args = [
            "status; rm -rf /",
            "status | cat",
            "status && echo hack",
            "status `whoami`",
            "status $(echo hack)",
            "status > /tmp/hack",
        ]

        for arg in dangerous_args:
            with pytest.raises(
                GitOperationError, match="Dangerous characters detected"
            ):
                repo._sanitize_args([arg])

    def test_sanitize_args_invalid_type(self, mock_git_repo):
        """Test argument sanitization rejects invalid types."""
        repo = GitRepository(str(mock_git_repo))

        with pytest.raises(GitOperationError, match="Invalid argument type"):
            repo._sanitize_args([123])

    def test_is_safe_git_option(self, mock_git_repo):
        """Test git option safety validation."""
        repo = GitRepository(str(mock_git_repo))

        # Test safe options
        safe_options = ["--porcelain", "--short", "--no-color", "-s", "-b"]
        for option in safe_options:
            assert repo._is_safe_git_option(option)

        # Test unsafe options (should return False for unknown options)
        unsafe_options = ["--exec", "--upload-pack", "--receive-pack"]
        for option in unsafe_options:
            assert not repo._is_safe_git_option(option)

    def test_is_safe_file_path(self, mock_git_repo):
        """Test file path safety validation."""
        repo = GitRepository(str(mock_git_repo))

        # Test safe paths
        assert repo._is_safe_file_path("test.txt")
        assert repo._is_safe_file_path("subdir/test.txt")
        assert repo._is_safe_file_path("./test.txt")

        # Test unsafe paths (path traversal attempts)
        assert not repo._is_safe_file_path("../../../etc/passwd")
        assert not repo._is_safe_file_path("/etc/passwd")

    @patch("subprocess.run")
    def test_execute_git_command_success(self, mock_run, mock_git_repo):
        """Test successful git command execution."""
        repo = GitRepository(str(mock_git_repo))

        # Mock successful subprocess.run
        mock_result = MagicMock()
        mock_result.stdout = "test output"
        mock_result.stderr = ""
        mock_result.returncode = 0
        mock_run.return_value = mock_result

        stdout, stderr, code = repo._execute_git_command(["status"])

        assert stdout == "test output"
        assert stderr == ""
        assert code == 0
        mock_run.assert_called_once()

    @patch("subprocess.run")
    def test_execute_git_command_timeout(self, mock_run, mock_git_repo):
        """Test git command timeout handling."""
        repo = GitRepository(str(mock_git_repo))

        # Mock timeout
        mock_run.side_effect = subprocess.TimeoutExpired(["git", "status"], 30)

        with pytest.raises(GitOperationError, match="Git command timed out"):
            repo._execute_git_command(["status"])

    @patch("subprocess.run")
    def test_execute_git_command_file_not_found(self, mock_run, mock_git_repo):
        """Test git command when git executable not found."""
        repo = GitRepository(str(mock_git_repo))

        # Mock FileNotFoundError
        mock_run.side_effect = FileNotFoundError()

        with pytest.raises(GitOperationError, match="Git executable not found"):
            repo._execute_git_command(["status"])

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

    @patch("difflicious.git_operations.GitRepository._execute_git_command")
    def test_get_status_with_changes(self, mock_execute, mock_git_repo):
        """Test get_status with file changes."""
        repo = GitRepository(str(mock_git_repo))

        # Mock git command responses
        def mock_git_response(args):
            if "branch" in args:
                return "main", "", 0
            elif "status" in args:
                return "M  test.txt\n?? new.txt\n", "", 0
            return "", "", 1

        mock_execute.side_effect = mock_git_response

        status = repo.get_status()

        assert status["git_available"] is True
        assert status["current_branch"] == "main"
        assert status["files_changed"] == 2
        assert status["is_clean"] is False

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
        # Note: might be empty if git diff format doesn't match our parsing

    def test_parse_diff_output(self, mock_git_repo):
        """Test diff output parsing."""
        repo = GitRepository(str(mock_git_repo))

        # Mock diff output in numstat format
        diff_output = "5\t2\ttest.txt\n10\t0\tnew.txt\n"

        diffs = repo._parse_diff_output(diff_output)

        assert len(diffs) == 2
        assert diffs[0]["path"] == "test.txt"
        assert diffs[0]["additions"] == 5
        assert diffs[0]["deletions"] == 2
        assert diffs[1]["path"] == "new.txt"
        assert diffs[1]["additions"] == 10
        assert diffs[1]["deletions"] == 0

    def test_parse_diff_output_empty(self, mock_git_repo):
        """Test diff output parsing with empty output."""
        repo = GitRepository(str(mock_git_repo))

        diffs = repo._parse_diff_output("")
        assert diffs == []

        diffs = repo._parse_diff_output("\n\n")
        assert diffs == []


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

    def test_get_git_repository_invalid(self):
        """Test factory function with invalid repository."""
        with pytest.raises(GitOperationError):
            get_git_repository("/nonexistent/path")


class TestGitRepositoryCommitComparison:
    """Test cases for commit comparison functionality."""

    @patch("difflicious.git_operations.GitRepository._execute_git_command")
    def test_is_safe_commit_sha_valid_references(self, mock_execute, mock_git_repo):
        """Test SHA validation with valid git references."""
        repo = GitRepository(str(mock_git_repo))

        # Mock successful git rev-parse responses
        mock_execute.return_value = ("abc123def456", "", 0)

        # Test valid references
        assert repo._is_safe_commit_sha("HEAD")
        assert repo._is_safe_commit_sha("HEAD~1")
        assert repo._is_safe_commit_sha("main")
        assert repo._is_safe_commit_sha("abc123def456")
        assert repo._is_safe_commit_sha("abc123")  # Short SHA

    def test_is_safe_commit_sha_invalid_references(self, mock_git_repo):
        """Test SHA validation with invalid references."""
        repo = GitRepository(str(mock_git_repo))

        # Test dangerous characters
        dangerous_refs = [
            "HEAD; rm -rf /",
            "HEAD | cat",
            "HEAD && echo hack",
            "HEAD `whoami`",
            "HEAD $(echo hack)",
            "HEAD > /tmp/hack",
            "HEAD < /etc/passwd",
            "HEAD (test)",
            "HEAD with space",
        ]

        for ref in dangerous_refs:
            assert not repo._is_safe_commit_sha(ref)

    def test_is_safe_commit_sha_invalid_types_and_lengths(self, mock_git_repo):
        """Test SHA validation with invalid types and lengths."""
        repo = GitRepository(str(mock_git_repo))

        # Test invalid types
        assert not repo._is_safe_commit_sha(123)
        assert not repo._is_safe_commit_sha(None)
        assert not repo._is_safe_commit_sha([])

        # Test invalid lengths
        assert not repo._is_safe_commit_sha("")
        assert not repo._is_safe_commit_sha("a" * 101)  # Too long

    @patch("difflicious.git_operations.GitRepository._execute_git_command")
    @patch("difflicious.git_operations.GitRepository.get_branches")
    def test_get_diff_with_default_branch_comparison(
        self, mock_get_branches, mock_execute, mock_git_repo
    ):
        """Test get_diff with default branch comparison."""
        repo = GitRepository(str(mock_git_repo))

        # Mock get_branches to return main as default
        mock_get_branches.return_value = {
            "default_branch": "main",
            "branches": ["main"],
        }

        # Mock git rev-parse for SHA validation and diff
        def mock_git_response(args):
            if "rev-parse" in args:
                return "main_sha", "", 0
            elif "diff" in args:
                return "5\t2\ttest.txt\n", "", 0
            return "", "", 1

        mock_execute.side_effect = mock_git_response

        # Test default behavior (compare to default branch)
        diffs = repo.get_diff(include_unstaged=True)
        assert isinstance(diffs, dict)
        assert "untracked" in diffs
        assert "unstaged" in diffs
        assert "staged" in diffs

        # Verify correct git command was called with main branch
        diff_calls = [
            call for call in mock_execute.call_args_list if "diff" in call[0][0]
        ]
        assert len(diff_calls) > 0
        diff_args = diff_calls[0][0][0]
        assert "main" in diff_args

    @patch("difflicious.git_operations.GitRepository._execute_git_command")
    @patch("difflicious.git_operations.GitRepository.get_branches")
    def test_get_diff_with_explicit_base_ref(
        self, mock_get_branches, mock_execute, mock_git_repo
    ):
        """Test get_diff with an explicit base_ref argument."""
        repo = GitRepository(str(mock_git_repo))

        # Mock get_branches to provide a default (won't be used due to base_ref)
        mock_get_branches.return_value = {
            "default_branch": "main",
            "branches": ["main"],
        }

        # Mock git responses for diff
        def mock_git_response(args):
            if "rev-parse" in args:
                return "base_sha", "", 0
            elif "diff" in args and "feature-x" in args:
                return "1\t0\tfoo.py\n", "", 0
            elif "status" in args and "--porcelain" in args:
                return "", "", 0
            return "", "", 1

        mock_execute.side_effect = mock_git_response

        diffs = repo.get_diff(include_unstaged=True, base_ref="feature-x")
        assert isinstance(diffs, dict)
        assert diffs["unstaged"]["count"] >= 0
        # Ensure feature-x appeared in diff args at least once
        diff_calls = [
            call for call in mock_execute.call_args_list if "diff" in call[0][0]
        ]
        assert any("feature-x" in call[0][0] for call in diff_calls)

    @patch("difflicious.git_operations.GitRepository._execute_git_command")
    def test_get_diff_with_head_comparison(self, mock_execute, mock_git_repo):
        """Test get_diff with HEAD comparison."""
        repo = GitRepository(str(mock_git_repo))

        # Mock git rev-parse for SHA validation
        def mock_git_response(args):
            if "rev-parse" in args:
                return "head_sha", "", 0
            elif "diff" in args:
                return "3\t1\tfile.txt\n", "", 0
            return "", "", 1

        mock_execute.side_effect = mock_git_response

        # Test HEAD comparison
        diffs = repo.get_diff(use_head=True, include_unstaged=True)
        assert isinstance(diffs, dict)
        assert "untracked" in diffs
        assert "unstaged" in diffs
        assert "staged" in diffs

        # Verify correct git command was called with HEAD
        diff_calls = [
            call for call in mock_execute.call_args_list if "diff" in call[0][0]
        ]
        assert len(diff_calls) > 0

        # Check that at least one diff call contains HEAD
        head_found = any("HEAD" in call[0][0] for call in diff_calls)
        assert (
            head_found
        ), f"No diff call found with HEAD. Diff calls: {[call[0][0] for call in diff_calls]}"

    @patch("difflicious.git_operations.GitRepository._execute_git_command")
    @patch("difflicious.git_operations.GitRepository.get_branches")
    def test_grouping_toggles_and_bases(
        self, mock_get_branches, mock_execute, mock_git_repo
    ):
        """Validate grouping behavior across HEAD/default/arbitrary × toggles."""
        repo = GitRepository(str(mock_git_repo))

        mock_get_branches.return_value = {
            "default_branch": "main",
            "branches": ["main"],
        }

        def resp(args):
            if "rev-parse" in args:
                return "ok", "", 0
            if args[:2] == ["diff", "--numstat"] and "--find-renames" in args:
                return "1\t0\tfile_a.txt\n", "", 0
            if args[:2] == ["diff", "--name-status"] and "--find-renames" in args:
                return "M\tfile_a.txt\n", "", 0
            if args[:3] == ["diff", "--numstat", "main"]:
                return "2\t1\tfile_b.txt\n", "", 0
            if args[:3] == ["diff", "--name-status", "main"]:
                return "A\tfile_b.txt\n", "", 0
            if args[:4] == ["diff", "--cached", "HEAD"]:
                return "", "", 0
            if args[:4] == ["diff", "--cached", "main"]:
                return "", "", 0
            if "status" in args and "--porcelain" in args:
                return "?? new.txt\n", "", 0
            return "", "", 1

        mock_execute.side_effect = resp

        # HEAD comparison with untracked/unstaged
        out_head = repo.get_diff(
            use_head=True, include_unstaged=True, include_untracked=True
        )

        assert out_head["unstaged"]["count"] == 1
        assert out_head["untracked"]["count"] == 1

        # Default branch comparison
        out_main = repo.get_diff(include_unstaged=True, include_untracked=False)
        assert out_main["unstaged"]["count"] == 1
        assert out_main["untracked"]["count"] == 0

        # Explicit base_ref comparison
        def resp_feature(args):
            if "rev-parse" in args:
                return "ok", "", 0
            if args[:2] == ["diff", "--numstat"] and "feature-x" in args and "--find-renames" in args:
                return "3\t3\tfx.py\n", "", 0
            if args[:2] == ["diff", "--name-status"] and "feature-x" in args and "--find-renames" in args:
                return "M\tfx.py\n", "", 0
            if args[:4] == ["diff", "--cached", "feature-x"]:
                return "", "", 0
            return "", "", 1

        mock_execute.side_effect = resp_feature
        out_feature = repo.get_diff(include_unstaged=True, base_ref="feature-x")

        assert out_feature["unstaged"]["count"] == 1

    @patch("difflicious.git_operations.GitRepository._execute_git_command")
    @patch("difflicious.git_operations.GitRepository.get_branches")
    def test_get_diff_untracked_files(
        self, mock_get_branches, mock_execute, mock_git_repo
    ):
        """Test get_diff includes untracked files when requested."""
        repo = GitRepository(str(mock_git_repo))

        # Mock get_branches to return main as default
        mock_get_branches.return_value = {
            "default_branch": "main",
            "branches": ["main"],
        }

        # Mock git responses
        def mock_git_response(args):
            if "rev-parse" in args:
                return "main_sha", "", 0
            elif "status" in args and "--porcelain" in args:
                return "?? untracked.txt\n", "", 0
            elif "diff" in args:
                return "2\t3\ttest.txt\n", "", 0
            return "", "", 1

        mock_execute.side_effect = mock_git_response

        # Test with untracked files included
        diffs = repo.get_diff(include_untracked=True, include_unstaged=True)
        assert isinstance(diffs, dict)
        assert "untracked" in diffs
        assert "unstaged" in diffs
        assert "staged" in diffs

        # Verify untracked files are detected
        assert diffs["untracked"]["count"] == 1
        assert diffs["untracked"]["files"][0]["path"] == "untracked.txt"

    @patch("difflicious.git_operations.GitRepository._execute_git_command")
    @patch("difflicious.git_operations.GitRepository.get_branches")
    def test_get_diff_fallback_to_head(
        self, mock_get_branches, mock_execute, mock_git_repo
    ):
        """Test get_diff falls back to HEAD when default branch doesn't exist."""
        repo = GitRepository(str(mock_git_repo))

        # Mock get_branches to return main as default, but main doesn't actually exist
        mock_get_branches.return_value = {
            "default_branch": "main",
            "branches": ["main"],
        }

        # Mock git rev-parse responses
        def mock_git_response(args):
            if "rev-parse" in args:
                if "main" in args:
                    return "", "fatal: bad revision", 1  # main doesn't exist
                elif "HEAD" in args:
                    return "head_sha", "", 0
            elif "diff" in args:
                return "1\t1\tfile.txt\n", "", 0
            return "", "", 1

        mock_execute.side_effect = mock_git_response

        # Test default behavior when main doesn't exist (should fallback to HEAD)
        diffs = repo.get_diff(include_unstaged=True)
        assert isinstance(diffs, dict)
        assert "untracked" in diffs
        assert "unstaged" in diffs
        assert "staged" in diffs

        # Verify HEAD was used as fallback
        diff_calls = [
            call for call in mock_execute.call_args_list if "diff" in call[0][0]
        ]
        assert len(diff_calls) > 0
        diff_args = diff_calls[0][0][0]
        assert "HEAD" in diff_args

    def test_get_diff_with_file_path_filter(self, mock_git_repo):
        """Test get_diff with specific file path filter."""
        repo = GitRepository(str(mock_git_repo))

        # Create a test file for filtering
        test_file = mock_git_repo / "specific_file.txt"
        test_file.write_text("test content")

        # Test with file path filter
        result = repo.get_diff(file_path="specific_file.txt", include_unstaged=True)
        assert isinstance(result, dict)
        assert "untracked" in result
        assert "unstaged" in result
        assert "staged" in result

    @patch("difflicious.git_operations.GitRepository._execute_git_command")
    def test_get_file_diff_with_commits(self, mock_execute, mock_git_repo):
        """Test _get_file_diff with commit parameters."""
        repo = GitRepository(str(mock_git_repo))

        # Mock git command response
        mock_execute.return_value = ("diff content", "", 0)

        # Test with both commits
        result = repo._get_file_diff("test.txt", "abc123", "def456")
        assert result == "diff content"

        # Verify correct git command was called
        mock_execute.assert_called_once()
        args = mock_execute.call_args[0][0]
        assert "diff" in args
        assert "abc123" in args
        assert "def456" in args
        assert "test.txt" in args

    @patch("difflicious.git_operations.GitRepository._execute_git_command")
    def test_get_file_diff_with_base_commit_only(self, mock_execute, mock_git_repo):
        """Test _get_file_diff with only base commit."""
        repo = GitRepository(str(mock_git_repo))

        # Mock git command response
        mock_execute.return_value = ("diff content", "", 0)

        # Test with base commit only
        result = repo._get_file_diff("test.txt", "abc123")
        assert result == "diff content"

        # Verify correct git command was called
        mock_execute.assert_called_once()
        args = mock_execute.call_args[0][0]
        assert "diff" in args
        assert "abc123" in args
        assert "test.txt" in args

    def test_get_diff_backward_compatibility(self, temp_git_repo):
        """Test that get_diff maintains backward compatibility."""
        repo = GitRepository(str(temp_git_repo))

        # Create a change for diffing
        test_file = temp_git_repo / "test.txt"
        test_file.write_text("Modified content\n")

        # Test traditional usage still works
        diffs = repo.get_diff(include_unstaged=True)
        assert isinstance(diffs, dict)
        assert "untracked" in diffs
        assert "unstaged" in diffs
        assert "staged" in diffs

        # Test HEAD comparison
        subprocess.run(["git", "add", "test.txt"], cwd=temp_git_repo, check=True)
        staged_diffs = repo.get_diff(use_head=True)
        assert isinstance(staged_diffs, dict)
        assert "untracked" in staged_diffs
        assert "unstaged" in staged_diffs
        assert "staged" in staged_diffs
