"""Tests for base service."""

from unittest.mock import Mock, patch

from difflicious.services.base_service import BaseService


class TestBaseService:
    def setup_method(self):
        self.service = BaseService()

    @patch("difflicious.services.base_service.get_git_repository")
    def test_repo_property_lazy_loading(self, mock_get_repo):
        """Test that repo property is lazy-loaded."""
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo

        # First access should call get_git_repository
        repo1 = self.service.repo
        mock_get_repo.assert_called_once_with(None)

        # Second access should not call get_git_repository again
        repo2 = self.service.repo
        mock_get_repo.assert_called_once()  # Still only called once

        # Both should return the same instance
        assert repo1 is repo2
        assert repo1 is mock_repo

    @patch("difflicious.services.base_service.get_git_repository")
    def test_repo_property_with_custom_path(self, mock_get_repo):
        """Test repo property with custom repository path."""
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo

        service = BaseService(repo_path="/custom/path")
        repo = service.repo

        mock_get_repo.assert_called_once_with("/custom/path")
        assert repo is mock_repo

    @patch("difflicious.services.base_service.logger")
    def test_log_error(self, mock_logger):
        """Test error logging functionality."""
        service = BaseService()
        exception = Exception("Test error")

        service._log_error("Test message", exception)

        mock_logger.error.assert_called_once_with(
            "BaseService: Test message - Test error"
        )

    def test_initialization_with_repo_path(self):
        """Test service initialization with repository path."""
        service = BaseService(repo_path="/test/path")

        assert service._repo is None
        assert service._repo_path == "/test/path"

    def test_initialization_without_repo_path(self):
        """Test service initialization without repository path."""
        service = BaseService()

        assert service._repo is None
        assert service._repo_path is None
