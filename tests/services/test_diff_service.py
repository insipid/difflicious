"""Tests for diff service."""

from unittest.mock import Mock, patch

import pytest

from difflicious.diff_parser import DiffParseError
from difflicious.git_operations import GitOperationError
from difflicious.services.diff_service import DiffService
from difflicious.services.exceptions import DiffServiceError


class TestDiffService:
    def setup_method(self):
        self.service = DiffService()

    @patch("difflicious.services.base_service.get_git_repository")
    def test_get_grouped_diffs_success(self, mock_get_repo):
        """Test successful diff retrieval and processing."""
        # Setup mocks
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_diff.return_value = {
            "unstaged": {
                "files": [
                    {
                        "path": "test.py",
                        "content": "mock diff content",
                        "status": "modified",
                        "additions": 5,
                        "deletions": 2,
                        "changes": 7,
                    }
                ],
                "count": 1,
            }
        }

        # Test
        result = self.service.get_grouped_diffs(unstaged=True)

        # Assertions
        assert result["unstaged"]["count"] == 1
        assert len(result["unstaged"]["files"]) == 1
        mock_repo.get_diff.assert_called_once()

    @patch("difflicious.services.base_service.get_git_repository")
    def test_get_grouped_diffs_with_base_ref(self, mock_get_repo):
        """Ensure base_ref gets passed through to the repository layer."""
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_diff.return_value = {
            "unstaged": {"files": [], "count": 0},
            "staged": {"files": [], "count": 0},
            "untracked": {"files": [], "count": 0},
        }

        base_ref = "feature-x"
        service = DiffService()
        service.get_grouped_diffs(unstaged=True, base_ref=base_ref)

        # Verify base_ref was passed through
        assert mock_repo.get_diff.called
        _, kwargs = mock_repo.get_diff.call_args
        assert kwargs.get("base_ref") == base_ref

    @patch("difflicious.services.base_service.get_git_repository")
    def test_get_grouped_diffs_git_error(self, mock_get_repo):
        """Test diff service error handling for git operation errors."""
        # Setup mocks
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_diff.side_effect = GitOperationError("Git failed")

        # Test
        with pytest.raises(DiffServiceError) as exc_info:
            self.service.get_grouped_diffs()

        assert "Failed to retrieve diff data" in str(exc_info.value)

    @patch("difflicious.services.base_service.get_git_repository")
    @patch("difflicious.services.diff_service.parse_git_diff_for_rendering")
    def test_process_single_diff_with_parsing(self, mock_parse, mock_get_repo):
        """Test single diff processing with successful parsing."""
        # Setup mocks
        mock_get_repo.return_value = Mock()
        mock_parse.return_value = [
            {"chunks": [], "old_file": "test.py", "new_file": "test.py"}
        ]

        # Create service and test
        service = DiffService()
        diff_data = {
            "path": "test.py",
            "content": "mock diff content",
            "status": "modified",
            "additions": 5,
            "deletions": 2,
            "changes": 7,
        }

        result = service._process_single_diff(diff_data)

        # Assertions
        assert result["path"] == "test.py"
        assert result["additions"] == 5
        assert result["deletions"] == 2
        assert result["changes"] == 7
        assert result["status"] == "modified"
        mock_parse.assert_called_once_with("mock diff content")

    @patch("difflicious.services.base_service.get_git_repository")
    @patch("difflicious.services.diff_service.parse_git_diff_for_rendering")
    def test_process_single_diff_parsing_error(self, mock_parse, mock_get_repo):
        """Test single diff processing with parsing error."""
        # Setup mocks
        mock_get_repo.return_value = Mock()
        mock_parse.side_effect = DiffParseError("Parse failed")

        # Create service and test
        service = DiffService()
        diff_data = {
            "path": "test.py",
            "content": "mock diff content",
            "status": "modified",
            "additions": 5,
            "deletions": 2,
            "changes": 7,
        }

        result = service._process_single_diff(diff_data)

        # Should return original diff data when parsing fails
        assert result == diff_data
        mock_parse.assert_called_once_with("mock diff content")

    def test_process_single_diff_untracked(self):
        """Test processing untracked files (no parsing)."""
        service = DiffService()
        diff_data = {
            "path": "new_file.py",
            "content": "file content",
            "status": "untracked",
            "additions": 0,
            "deletions": 0,
            "changes": 0,
        }

        result = service._process_single_diff(diff_data)

        # Should return original data for untracked files
        assert result == diff_data

    @patch("difflicious.services.diff_service.DiffService.get_grouped_diffs")
    def test_get_diff_summary(self, mock_get_grouped):
        """Test diff summary generation."""
        # Setup mock
        mock_get_grouped.return_value = {
            "unstaged": {
                "files": [
                    {"additions": 5, "deletions": 2},
                    {"additions": 3, "deletions": 1},
                ],
                "count": 2,
            },
            "staged": {"files": [{"additions": 2, "deletions": 0}], "count": 1},
        }

        # Test
        service = DiffService()
        result = service.get_diff_summary()

        # Assertions
        assert result["total_files"] == 3
        assert result["total_additions"] == 10  # 5+3+2
        assert result["total_deletions"] == 3  # 2+1+0
        assert result["total_changes"] == 13  # 10+3
        assert result["groups"]["unstaged"] == 2
        assert result["groups"]["staged"] == 1


class TestDiffServiceFullDiff:
    """Test cases for get_full_diff_data method."""

    @patch("difflicious.services.base_service.get_git_repository")
    @patch("difflicious.services.diff_service.parse_git_diff_for_rendering")
    @patch(
        "difflicious.services.diff_service.DiffService._apply_syntax_highlighting_to_diff"
    )
    def test_get_full_diff_data_success(
        self, mock_highlight, mock_parse, mock_get_repo
    ):
        """Test successful full diff data retrieval."""
        # Setup mocks
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_full_file_diff.return_value = (
            "diff --git a/test.py b/test.py\n+added line"
        )
        mock_parse.return_value = [
            {"chunks": [], "old_file": "test.py", "new_file": "test.py"}
        ]
        mock_highlight.return_value = {"chunks": []}

        # Test
        service = DiffService()
        result = service.get_full_diff_data("test.py")

        # Assertions
        assert result["status"] == "ok"
        assert result["has_changes"] is True
        assert "diff_data" in result
        mock_repo.get_full_file_diff.assert_called_once()

    @patch("difflicious.services.base_service.get_git_repository")
    def test_get_full_diff_data_empty(self, mock_get_repo):
        """Test full diff data with empty diff."""
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_full_file_diff.return_value = ""

        service = DiffService()
        result = service.get_full_diff_data("test.py")

        assert result["status"] == "ok"
        assert result["has_changes"] is False
        assert "comparison_mode" in result

    @patch("difflicious.services.base_service.get_git_repository")
    @patch("difflicious.services.diff_service.parse_git_diff_for_rendering")
    def test_get_full_diff_data_with_base_ref(self, mock_parse, mock_get_repo):
        """Test full diff data with base_ref parameter."""
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_full_file_diff.return_value = "diff content"
        mock_parse.return_value = [{"chunks": []}]

        service = DiffService()
        service.get_full_diff_data("test.py", base_ref="feature-x")

        # Verify base_ref was passed
        mock_repo.get_full_file_diff.assert_called_once_with(
            file_path="test.py", base_ref="feature-x", use_head=False, use_cached=False
        )

    @patch("difflicious.services.base_service.get_git_repository")
    @patch("difflicious.services.diff_service.parse_git_diff_for_rendering")
    def test_get_full_diff_data_use_head(self, mock_parse, mock_get_repo):
        """Test full diff data with use_head parameter."""
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_full_file_diff.return_value = "diff content"
        mock_parse.return_value = [{"chunks": []}]

        service = DiffService()
        service.get_full_diff_data("test.py", use_head=True)

        mock_repo.get_full_file_diff.assert_called_once_with(
            file_path="test.py", base_ref=None, use_head=True, use_cached=False
        )

    @patch("difflicious.services.base_service.get_git_repository")
    @patch("difflicious.services.diff_service.parse_git_diff_for_rendering")
    def test_get_full_diff_data_use_cached(self, mock_parse, mock_get_repo):
        """Test full diff data with use_cached parameter."""
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_full_file_diff.return_value = "diff content"
        mock_parse.return_value = [{"chunks": []}]

        service = DiffService()
        service.get_full_diff_data("test.py", use_cached=True)

        mock_repo.get_full_file_diff.assert_called_once_with(
            file_path="test.py", base_ref=None, use_head=False, use_cached=True
        )

    @patch("difflicious.services.base_service.get_git_repository")
    @patch("difflicious.services.diff_service.parse_git_diff_for_rendering")
    def test_get_full_diff_data_parse_error(self, mock_parse, mock_get_repo):
        """Test full diff data with parsing error."""
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_full_file_diff.return_value = "invalid diff content"
        mock_parse.side_effect = DiffParseError("Parse failed")

        service = DiffService()
        result = service.get_full_diff_data("test.py")

        # Should still return ok status with raw content
        assert result["status"] == "ok"
        assert result["has_changes"] is True

    @patch("difflicious.services.base_service.get_git_repository")
    def test_get_full_diff_data_git_error(self, mock_get_repo):
        """Test full diff data with GitOperationError."""
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_full_file_diff.side_effect = GitOperationError("Git failed")

        service = DiffService()
        with pytest.raises(DiffServiceError):
            service.get_full_diff_data("test.py")


class TestDiffServiceSyntaxHighlighting:
    """Test cases for syntax highlighting methods."""

    def test_apply_syntax_highlighting_to_diff(self):
        """Test applying syntax highlighting to diff data."""
        service = DiffService()
        diff_data = {
            "hunks": [
                {
                    "lines": [
                        {
                            "left": {"content": "def test():"},
                            "right": {"content": "def test():"},
                        },
                        {
                            "left": {"content": "    pass"},
                            "right": {"content": "    pass"},
                        },
                    ]
                }
            ]
        }

        result = service._apply_syntax_highlighting_to_diff(diff_data, "test.py")

        # Should return the same structure
        assert "hunks" in result

    def test_apply_syntax_highlighting_to_diff_no_hunks(self):
        """Test syntax highlighting with no hunks."""
        service = DiffService()
        diff_data = {"chunks": []}

        result = service._apply_syntax_highlighting_to_diff(diff_data, "test.py")

        # Should return original data
        assert result == diff_data

    def test_apply_syntax_highlighting_to_raw_diff(self):
        """Test applying syntax highlighting to raw diff."""
        service = DiffService()
        raw_diff = "diff --git a/test.py b/test.py\n+def test():\n+    pass"

        result = service._apply_syntax_highlighting_to_raw_diff(raw_diff, "test.py")

        # Should return string
        assert isinstance(result, str)

    def test_highlighting_with_missing_content(self):
        """Test highlighting with missing content."""
        service = DiffService()
        diff_data = {"hunks": [{"lines": [{"left": {}, "right": {}}]}]}

        result = service._apply_syntax_highlighting_to_diff(diff_data, "test.py")

        # Should not raise exception
        assert "hunks" in result

    def test_highlighting_with_invalid_hunks(self):
        """Test highlighting with invalid hunk structure."""
        service = DiffService()
        diff_data = {"hunks": "invalid"}

        result = service._apply_syntax_highlighting_to_diff(diff_data, "test.py")

        # Should return original data if highlighting fails
        assert result == diff_data


class TestDiffServiceHelpers:
    """Test helper methods in DiffService."""

    def test_get_comparison_mode_description(self):
        """Test comparison mode description generation."""
        service = DiffService()

        # Test different modes
        assert (
            service._get_comparison_mode_description(None, True, False)
            == "working directory vs HEAD"
        )
        assert (
            service._get_comparison_mode_description("feature", False, False)
            == "working directory vs feature"
        )
        assert (
            service._get_comparison_mode_description(None, False, True)
            == "staged vs HEAD"
        )
        assert (
            service._get_comparison_mode_description(None, False, False)
            == "working directory vs main branch"
        )

    @patch("difflicious.services.base_service.get_git_repository")
    @patch("difflicious.services.diff_service.parse_git_diff_for_rendering")
    def test_process_single_diff_edge_cases(self, mock_parse, mock_get_repo):
        """Test process_single_diff with edge cases."""
        mock_get_repo.return_value = Mock()

        service = DiffService()

        # Test with missing content
        diff_data = {
            "path": "test.py",
            "status": "modified",
            "additions": 5,
            "deletions": 2,
            "changes": 7,
        }
        result = service._process_single_diff(diff_data)
        assert result == diff_data

        # Test with None content
        diff_data["content"] = None
        result = service._process_single_diff(diff_data)
        assert result == diff_data

        # Test with empty content
        diff_data["content"] = ""
        result = service._process_single_diff(diff_data)
        assert result == diff_data
