"""Context expansion API endpoints for Difflicious."""

import logging
from typing import Union

from flask import Blueprint, Response, jsonify, request

from difflicious.blueprints.helpers import error_response
from difflicious.config import DEFAULT_EXPANSION_CONTEXT_LINES, MAX_BRANCH_PREVIEW_LINES
from difflicious.services.diff_service import DiffService
from difflicious.services.exceptions import GitServiceError
from difflicious.services.git_service import GitService
from difflicious.services.syntax_service import SyntaxHighlightingService

logger = logging.getLogger(__name__)

context_api = Blueprint("context_api", __name__, url_prefix="/api")


@context_api.route("/expand-context")
def api_expand_context() -> Union[Response, tuple[Response, int]]:
    """API endpoint for context expansion (AJAX for dynamic updates)."""
    file_path = request.args.get("file_path")
    hunk_index = request.args.get("hunk_index", type=int)
    direction = request.args.get("direction")  # 'before' or 'after'
    context_lines = request.args.get(
        "context_lines", DEFAULT_EXPANSION_CONTEXT_LINES, type=int
    )
    output_format = request.args.get("format", "plain")  # 'plain' or 'pygments'

    # Get the target line range from the frontend (passed from button data attributes)
    target_start = request.args.get("target_start", type=int)
    target_end = request.args.get("target_end", type=int)

    if not all([file_path, hunk_index is not None, direction]):
        return error_response(
            "Missing required parameters: file_path, hunk_index, and direction are required",
            context={
                "file_path": file_path,
                "hunk_index": hunk_index,
                "direction": direction,
            },
        )

    if output_format not in ["plain", "pygments"]:
        return error_response(
            "Invalid format parameter. Must be 'plain' or 'pygments'",
            context={"format": output_format},
        )

    # Validate target line range if provided
    if target_start is not None and target_end is not None:
        if target_start < 0 or target_end < 0:
            return error_response(
                "Line numbers must be non-negative",
                context={"start_line": target_start, "end_line": target_end},
            )
        if target_end < target_start:
            return error_response(
                "End line must be greater than or equal to start line",
                context={"start_line": target_start, "end_line": target_end},
            )
        if target_end - target_start + 1 > MAX_BRANCH_PREVIEW_LINES:
            return error_response(
                f"Cannot expand more than {MAX_BRANCH_PREVIEW_LINES} lines at once",
                context={
                    "start_line": target_start,
                    "end_line": target_end,
                    "max_lines": MAX_BRANCH_PREVIEW_LINES,
                },
            )

    try:
        # Use the target range provided by the frontend if available
        if target_start is not None and target_end is not None:
            start_line = target_start
            end_line = target_end
        else:
            # Fallback: try to calculate from diff data
            diff_service = DiffService()
            grouped_diffs = diff_service.get_grouped_diffs(file_path=file_path)

            # Find the specific file and hunk
            target_hunk = None
            for group_data in grouped_diffs.values():
                for file_data in group_data["files"]:
                    if file_data["path"] == file_path and file_data.get("hunks"):
                        if hunk_index is not None and hunk_index < len(
                            file_data["hunks"]
                        ):
                            target_hunk = file_data["hunks"][hunk_index]
                            break
                if target_hunk:
                    break

            if not target_hunk:
                return error_response(
                    f"Hunk {hunk_index} not found in file {file_path}",
                    code=404,
                    context={"file_path": file_path, "hunk_index": hunk_index},
                )

            # Calculate the line range to fetch based on hunk and direction
            new_start = target_hunk.get("new_start", 1)
            new_count = target_hunk.get("new_count", 0)
            new_end = new_start + max(new_count, 0) - 1

            if direction == "before":
                # Always anchor the fetch to the right side (new file)
                end_line = new_start - 1
                start_line = max(1, end_line - context_lines + 1)
            else:  # direction == "after"
                # Always anchor the fetch to the right side (new file)
                start_line = new_end + 1
                end_line = start_line + context_lines - 1

        # Fetch the actual lines
        git_service = GitService()
        result = git_service.get_file_lines(file_path or "", start_line, end_line)

        # If pygments format requested, enhance the result with syntax highlighting
        if output_format == "pygments" and result.get("status") == "ok":
            syntax_service = SyntaxHighlightingService()

            enhanced_lines = []
            for line_content in result.get("lines", []):
                if line_content:
                    highlighted_content = syntax_service.highlight_diff_line(
                        line_content, file_path or ""
                    )
                    enhanced_lines.append(
                        {
                            "content": line_content,
                            "highlighted_content": highlighted_content,
                        }
                    )
                else:
                    enhanced_lines.append(
                        {
                            "content": line_content,
                            "highlighted_content": line_content,
                        }
                    )

            result["lines"] = enhanced_lines
            result["format"] = "pygments"
            result["css_styles"] = syntax_service.get_css_styles()
        else:
            result["format"] = "plain"

        return jsonify(result)

    except GitServiceError as e:
        logger.error(f"Context expansion error for {file_path} hunk {hunk_index}: {e}")
        return error_response(
            str(e),
            code=500,
            context={
                "file_path": file_path,
                "hunk_index": hunk_index,
                "direction": direction,
            },
        )


@context_api.route("/file/lines")
def api_file_lines() -> Union[Response, tuple[Response, int]]:
    """API endpoint for fetching specific lines from a file (kept for compatibility)."""
    file_path = request.args.get("file_path")
    if not file_path:
        return error_response("file_path parameter is required")

    start_line = request.args.get("start_line")
    end_line = request.args.get("end_line")

    if not start_line or not end_line:
        return error_response(
            "start_line and end_line parameters are required",
            context={"start_line": start_line, "end_line": end_line},
        )

    try:
        start_line_int = int(start_line)
        end_line_int = int(end_line)
    except ValueError:
        return error_response(
            "start_line and end_line must be valid numbers",
            context={"start_line": start_line, "end_line": end_line},
        )

    try:
        git_service = GitService()
        return jsonify(
            git_service.get_file_lines(file_path, start_line_int, end_line_int)
        )

    except GitServiceError as e:
        logger.error(
            f"Git service error fetching lines from {file_path}[{start_line_int}:{end_line_int}]: {e}"
        )
        return error_response(
            str(e),
            code=500,
            context={
                "file_path": file_path,
                "start_line": start_line_int,
                "end_line": end_line_int,
            },
        )
