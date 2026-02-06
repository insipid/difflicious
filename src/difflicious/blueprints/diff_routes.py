"""Diff-related API endpoints for Difflicious."""

import logging
from typing import Union

from flask import Blueprint, Response, jsonify, request

from difflicious.services.diff_service import DiffService
from difflicious.services.exceptions import DiffServiceError
from difflicious.services.template_service import TemplateRenderingService

logger = logging.getLogger(__name__)

diff_api = Blueprint("diff_api", __name__, url_prefix="/api")


@diff_api.route("/diff")
def api_diff() -> Union[Response, tuple[Response, int]]:
    """API endpoint for git diff information.

    Note: Both unstaged and untracked data are always fetched. The `unstaged`
    and `untracked` query parameters are accepted for backward compatibility
    but are ignored. Filtering should be handled client-side.
    """
    # Get optional query parameters
    file_path = request.args.get("file")
    base_ref = request.args.get("base_ref")
    use_head = request.args.get("use_head", "false").lower() == "true"

    try:
        # Use template service logic for proper branch comparison handling
        template_service = TemplateRenderingService()

        # Get basic repository information
        repo_status = template_service.git_service.get_repository_status()
        current_branch = repo_status.get("current_branch", "unknown")

        # Determine if this is a HEAD comparison
        is_head_comparison = base_ref in ["HEAD", current_branch] if base_ref else False

        if is_head_comparison:
            # Working directory vs HEAD comparison - use diff service directly
            diff_service = DiffService()
            grouped_data = diff_service.get_grouped_diffs(
                base_ref="HEAD",
                file_path=file_path,
            )
        else:
            # Working directory vs branch comparison - use template service logic
            # This ensures proper combining of staged/unstaged into "changes" group
            template_data = template_service.prepare_diff_data_for_template(
                base_ref=base_ref,
                file_path=file_path,
            )
            grouped_data = template_data["groups"]
            # Ensure API always exposes an 'unstaged' key for compatibility
            if "unstaged" not in grouped_data and "changes" in grouped_data:
                grouped_data["unstaged"] = grouped_data["changes"]
            # Ensure API always exposes a 'staged' key for compatibility
            if "staged" not in grouped_data:
                grouped_data["staged"] = {"files": [], "count": 0}

        # Calculate total files across all groups
        total_files = sum(group["count"] for group in grouped_data.values())

        return jsonify(
            {
                "status": "ok",
                "groups": grouped_data,
                "unstaged": True,  # Always True - all data is fetched
                "untracked": True,  # Always True - all data is fetched
                "file_filter": file_path,
                "use_head": use_head,
                "base_ref": base_ref,
                "total_files": total_files,
            }
        )

    except DiffServiceError as e:
        logger.error(f"Diff service error: {e}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": str(e),
                    "groups": {
                        "untracked": {"files": [], "count": 0},
                        "unstaged": {"files": [], "count": 0},
                        "staged": {"files": [], "count": 0},
                    },
                }
            ),
            500,
        )


@diff_api.route("/diff/full")
def api_diff_full() -> Union[Response, tuple[Response, int]]:
    """API endpoint for complete file diff with unlimited context."""
    file_path = request.args.get("file_path")
    if not file_path:
        return (
            jsonify({"status": "error", "message": "file_path parameter is required"}),
            400,
        )

    base_ref = request.args.get("base_ref")
    use_head = request.args.get("use_head", "false").lower() == "true"
    use_cached = request.args.get("use_cached", "false").lower() == "true"

    try:
        diff_service = DiffService()
        result = diff_service.get_full_diff_data(
            file_path=file_path,
            base_ref=base_ref,
            use_head=use_head,
            use_cached=use_cached,
        )
        return jsonify(result)

    except DiffServiceError as e:
        logger.error(f"Full diff service error: {e}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": str(e),
                    "file_path": file_path,
                }
            ),
            500,
        )
