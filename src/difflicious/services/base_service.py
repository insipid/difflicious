"""Base service class for common functionality."""

import logging
from typing import Optional

from difflicious.git_operations import GitRepository, get_git_repository

logger = logging.getLogger(__name__)


class BaseService:
    """Base class for all services with common functionality."""

    def __init__(self, repo_path: Optional[str] = None):
        """Initialize service with git repository.

        Args:
            repo_path: Optional path to git repository
        """
        self._repo: Optional[GitRepository] = None
        self._repo_path = repo_path

    @property
    def repo(self) -> GitRepository:
        """Lazy-loaded git repository instance."""
        if self._repo is None:
            self._repo = get_git_repository(self._repo_path)
        return self._repo

    def _log_error(self, message: str, exception: Exception) -> None:
        """Consistent error logging across services."""
        logger.error(f"{self.__class__.__name__}: {message} - {exception}")
