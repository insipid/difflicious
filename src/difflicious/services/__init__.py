"""Service layer for business logic separation."""

from difflicious.services.base_service import BaseService
from difflicious.services.diff_service import DiffService
from difflicious.services.exceptions import DiffServiceError, GitServiceError
from difflicious.services.git_service import GitService
from difflicious.services.syntax_service import SyntaxHighlightingService
from difflicious.services.template_service import TemplateRenderingService

__all__ = [
    "BaseService",
    "DiffService",
    "DiffServiceError",
    "GitService",
    "GitServiceError",
    "SyntaxHighlightingService",
    "TemplateRenderingService",
]
