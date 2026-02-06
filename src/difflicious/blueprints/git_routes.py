"""Git-related API endpoints for Difflicious."""

import logging
from typing import Union

from flask import Blueprint, Response, jsonify

from difflicious.services.exceptions import GitServiceError
from difflicious.services.git_service import GitService

from .helpers import error_response

logger = logging.getLogger(__name__)

git_api = Blueprint("git_api", __name__, url_prefix="/api")


@git_api.route("/status")
def api_status() -> Union[Response, tuple[Response, int]]:
    """API endpoint for git status information (kept for compatibility)."""
    try:
        git_service = GitService()
        return jsonify(git_service.get_repository_status())
    except Exception as e:
        logger.error(f"Failed to get git status: {e}")
        return error_response(
            str(e),
            code=500,
            context={
                "current_branch": "unknown",
                "repository_name": "unknown",
                "files_changed": 0,
                "git_available": False,
            },
        )


@git_api.route("/branches")
def api_branches() -> Union[Response, tuple[Response, int]]:
    """API endpoint for git branch information (kept for compatibility)."""
    try:
        git_service = GitService()
        return jsonify(git_service.get_branch_information())
    except GitServiceError as e:
        logger.error(f"Failed to get branch info: {e}")
        return error_response(str(e), code=500)
