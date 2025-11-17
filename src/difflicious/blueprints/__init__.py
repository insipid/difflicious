"""Flask blueprints for Difflicious application routes."""

from .context_routes import context_api
from .diff_routes import diff_api
from .git_routes import git_api
from .views import views

__all__ = ["views", "git_api", "diff_api", "context_api"]
