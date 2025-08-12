"""Tests for git service."""

from unittest.mock import Mock, patch

import pytest

from difflicious.git_operations import GitOperationError
from difflicious.services.exceptions import GitServiceError
from difflicious.services.git_service import GitService


class TestGitService:
    def setup_method(self):
        self.service = GitService()

    @patch("difflicious.services.base_service.get_git_repository")
    def test_get_repository_status_success(self, mock_get_repo):
        """Test successful repository status retrieval."""
        # Setup mocks
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_current_branch.return_value = "main"
        mock_repo.get_repository_name.return_value = "test-repo"
        mock_repo.summarize_changes.return_value = {
            "unstaged": {"count": 2},
            "staged": {"count": 1},
            "untracked": {"count": 0},
        }

        # Test
        result = self.service.get_repository_status()

        # Assertions
        assert result["current_branch"] == "main"
        assert result["repository_name"] == "test-repo"
        assert result["files_changed"] == 3  # 2+1+0
        assert result["git_available"] is True
        assert result["status"] == "ok"

    @patch("difflicious.services.base_service.get_git_repository")
    def test_get_repository_status_error(self, mock_get_repo):
        """Test repository status with git error."""
        # Setup mocks
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_current_branch.side_effect = GitOperationError("Git failed")

        # Test
        result = self.service.get_repository_status()

        # Assertions
        assert result["current_branch"] == "unknown"
        assert result["repository_name"] == "unknown"
        assert result["files_changed"] == 0
        assert result["git_available"] is False
        assert result["status"] == "error"
        assert "error" in result

    @patch("difflicious.services.base_service.get_git_repository")
    def test_get_branch_information_success(self, mock_get_repo):
        """Test successful branch information retrieval."""
        # Setup mocks
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_branches.return_value = {
            "branches": ["main", "feature-1", "feature-2"],
            "default_branch": "main",
        }
        mock_repo.get_current_branch.return_value = "feature-1"

        # Test
        result = self.service.get_branch_information()

        # Assertions
        assert result["status"] == "ok"
        # Ordered list should start with current branch, then default, then others alpha
        assert result["branches"]["all"] == [
            "feature-1",
            "main",
            "feature-2",
        ]
        assert result["branches"]["current"] == "feature-1"
        assert result["branches"]["default"] == "main"
        assert result["branches"]["others"] == ["feature-2"]  # exclude main and current

    @patch("difflicious.services.base_service.get_git_repository")
    def test_get_branch_information_error(self, mock_get_repo):
        """Test branch information with git error."""
        # Setup mocks
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_branches.side_effect = GitOperationError("Git failed")

        # Test
        with pytest.raises(GitServiceError) as exc_info:
            self.service.get_branch_information()

        assert "Failed to get branch information" in str(exc_info.value)

    @patch("difflicious.services.base_service.get_git_repository")
    def test_get_file_lines_success(self, mock_get_repo):
        """Test successful file lines retrieval."""
        # Setup mocks
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_file_lines.return_value = ["line 1", "line 2", "line 3"]

        # Test
        result = self.service.get_file_lines("test.py", 1, 3)

        # Assertions
        assert result["status"] == "ok"
        assert result["file_path"] == "test.py"
        assert result["start_line"] == 1
        assert result["end_line"] == 3
        assert result["lines"] == ["line 1", "line 2", "line 3"]
        assert result["line_count"] == 3
        mock_repo.get_file_lines.assert_called_once_with("test.py", 1, 3)

    def test_get_file_lines_invalid_range(self):
        """Test file lines with invalid line range."""
        # Test invalid start line
        with pytest.raises(GitServiceError) as exc_info:
            self.service.get_file_lines("test.py", 0, 5)
        assert "Invalid line range" in str(exc_info.value)

        # Test end before start
        with pytest.raises(GitServiceError) as exc_info:
            self.service.get_file_lines("test.py", 5, 3)
        assert "Invalid line range" in str(exc_info.value)

    def test_get_file_lines_range_too_large(self):
        """Test file lines with range too large."""
        with pytest.raises(GitServiceError) as exc_info:
            self.service.get_file_lines("test.py", 1, 102)  # > 100 lines
        assert "Line range too large" in str(exc_info.value)

    @patch("difflicious.services.base_service.get_git_repository")
    def test_get_file_lines_git_error(self, mock_get_repo):
        """Test file lines with git operation error."""
        # Setup mocks
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_file_lines.side_effect = GitOperationError("File not found")

        # Test
        with pytest.raises(GitServiceError) as exc_info:
            self.service.get_file_lines("test.py", 1, 5)

        assert "Failed to get file lines" in str(exc_info.value)
