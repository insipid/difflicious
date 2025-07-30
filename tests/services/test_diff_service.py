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

    @patch('difflicious.services.base_service.get_git_repository')
    def test_get_grouped_diffs_success(self, mock_get_repo):
        """Test successful diff retrieval and processing."""
        # Setup mocks
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_diff.return_value = {
            'unstaged': {
                'files': [
                    {
                        'path': 'test.py',
                        'content': 'mock diff content',
                        'status': 'modified',
                        'additions': 5,
                        'deletions': 2,
                        'changes': 7
                    }
                ],
                'count': 1
            }
        }

        # Test
        result = self.service.get_grouped_diffs(unstaged=True)

        # Assertions
        assert result['unstaged']['count'] == 1
        assert len(result['unstaged']['files']) == 1
        mock_repo.get_diff.assert_called_once()

    @patch('difflicious.services.base_service.get_git_repository')
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

    @patch('difflicious.services.base_service.get_git_repository')
    @patch('difflicious.services.diff_service.parse_git_diff_for_rendering')
    def test_process_single_diff_with_parsing(self, mock_parse, mock_get_repo):
        """Test single diff processing with successful parsing."""
        # Setup mocks
        mock_get_repo.return_value = Mock()
        mock_parse.return_value = [{
            'chunks': [],
            'old_file': 'test.py',
            'new_file': 'test.py'
        }]

        # Create service and test
        service = DiffService()
        diff_data = {
            'path': 'test.py',
            'content': 'mock diff content',
            'status': 'modified',
            'additions': 5,
            'deletions': 2,
            'changes': 7
        }

        result = service._process_single_diff(diff_data)

        # Assertions
        assert result['path'] == 'test.py'
        assert result['additions'] == 5
        assert result['deletions'] == 2
        assert result['changes'] == 7
        assert result['status'] == 'modified'
        mock_parse.assert_called_once_with('mock diff content')

    @patch('difflicious.services.base_service.get_git_repository')
    @patch('difflicious.services.diff_service.parse_git_diff_for_rendering')
    def test_process_single_diff_parsing_error(self, mock_parse, mock_get_repo):
        """Test single diff processing with parsing error."""
        # Setup mocks
        mock_get_repo.return_value = Mock()
        mock_parse.side_effect = DiffParseError("Parse failed")

        # Create service and test
        service = DiffService()
        diff_data = {
            'path': 'test.py',
            'content': 'mock diff content',
            'status': 'modified',
            'additions': 5,
            'deletions': 2,
            'changes': 7
        }

        result = service._process_single_diff(diff_data)

        # Should return original diff data when parsing fails
        assert result == diff_data
        mock_parse.assert_called_once_with('mock diff content')

    def test_process_single_diff_untracked(self):
        """Test processing untracked files (no parsing)."""
        service = DiffService()
        diff_data = {
            'path': 'new_file.py',
            'content': 'file content',
            'status': 'untracked',
            'additions': 0,
            'deletions': 0,
            'changes': 0
        }

        result = service._process_single_diff(diff_data)

        # Should return original data for untracked files
        assert result == diff_data

    @patch('difflicious.services.diff_service.DiffService.get_grouped_diffs')
    def test_get_diff_summary(self, mock_get_grouped):
        """Test diff summary generation."""
        # Setup mock
        mock_get_grouped.return_value = {
            'unstaged': {
                'files': [
                    {'additions': 5, 'deletions': 2},
                    {'additions': 3, 'deletions': 1}
                ],
                'count': 2
            },
            'staged': {
                'files': [
                    {'additions': 2, 'deletions': 0}
                ],
                'count': 1
            }
        }

        # Test
        service = DiffService()
        result = service.get_diff_summary()

        # Assertions
        assert result['total_files'] == 3
        assert result['total_additions'] == 10  # 5+3+2
        assert result['total_deletions'] == 3   # 2+1+0
        assert result['total_changes'] == 13    # 10+3
        assert result['groups']['unstaged'] == 2
        assert result['groups']['staged'] == 1
