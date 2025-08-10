"""Flask web application for Difflicious git diff visualization."""

import logging
import os
from typing import Union

from flask import Flask, Response, jsonify, render_template, request

# Import services
from difflicious.services.diff_service import DiffService
from difflicious.services.exceptions import DiffServiceError, GitServiceError
from difflicious.services.git_service import GitService
from difflicious.services.template_service import TemplateRenderingService


def create_app() -> Flask:

    # Configure template directory to be relative to package
    template_dir = os.path.join(os.path.dirname(__file__), "templates")
    static_dir = os.path.join(os.path.dirname(__file__), "static")

    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

    # Register jinja-partials extension
    import jinja_partials  # type: ignore[import-untyped]

    jinja_partials.register_extensions(app)

    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    @app.route("/")
    def index() -> str:
        """Main diff visualization page with server-side rendering."""
        try:
            # Get query parameters
            base_ref = request.args.get("base_ref")
            unstaged = request.args.get("unstaged", "true").lower() == "true"
            staged = request.args.get("staged", "true").lower() == "true"
            untracked = request.args.get("untracked", "false").lower() == "true"
            file_path = request.args.get("file")
            search_filter = request.args.get("search", "").strip()
            expand_files = request.args.get("expand", "false").lower() == "true"

            # Prepare template data
            template_service = TemplateRenderingService()
            template_data = template_service.prepare_diff_data_for_template(
                base_ref=base_ref if base_ref is not None else None,
                unstaged=unstaged,
                staged=staged,
                untracked=untracked,
                file_path=file_path,
                search_filter=search_filter if search_filter else None,
                expand_files=expand_files,
            )

            return render_template("index.html", **template_data)

        except Exception as e:
            logger.error(f"Failed to render index page: {e}")
            # Render error page
            error_data = {
                "repo_status": {"current_branch": "error", "git_available": False},
                "branches": {"all": [], "current": "error", "default": "main"},
                "groups": {},
                "total_files": 0,
                "error": str(e),
                "loading": False,
                "syntax_css": "",
                "unstaged": True,
                "untracked": False,
                "search_filter": "",
                "current_base_ref": "main",
            }
            return render_template("index.html", **error_data)

    @app.route("/api/status")
    def api_status() -> Response:
        """API endpoint for git status information (kept for compatibility)."""
        try:
            git_service = GitService()
            return jsonify(git_service.get_repository_status())
        except Exception as e:
            logger.error(f"Failed to get git status: {e}")
            return jsonify(
                {
                    "status": "error",
                    "current_branch": "unknown",
                    "repository_name": "unknown",
                    "files_changed": 0,
                    "git_available": False,
                }
            )

    @app.route("/api/branches")
    def api_branches() -> Union[Response, tuple[Response, int]]:
        """API endpoint for git branch information (kept for compatibility)."""
        try:
            git_service = GitService()
            return jsonify(git_service.get_branch_information())
        except GitServiceError as e:
            logger.error(f"Failed to get branch info: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

    @app.route("/api/expand-context")
    def api_expand_context() -> Union[Response, tuple[Response, int]]:
        """API endpoint for context expansion (AJAX for dynamic updates)."""
        file_path = request.args.get("file_path")
        hunk_index = request.args.get("hunk_index", type=int)
        direction = request.args.get("direction")  # 'before' or 'after'
        context_lines = request.args.get("context_lines", 10, type=int)
        output_format = request.args.get("format", "plain")  # 'plain' or 'pygments'

        # Get the target line range from the frontend (passed from button data attributes)
        target_start = request.args.get("target_start", type=int)
        target_end = request.args.get("target_end", type=int)

        if not all([file_path, hunk_index is not None, direction]):
            return (
                jsonify({"status": "error", "message": "Missing required parameters"}),
                400,
            )

        if output_format not in ["plain", "pygments"]:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Invalid format parameter. Must be 'plain' or 'pygments'",
                    }
                ),
                400,
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
                    return (
                        jsonify(
                            {
                                "status": "error",
                                "message": f"Hunk {hunk_index} not found in file {file_path}",
                            }
                        ),
                        404,
                    )

                # Calculate the line range to fetch based on hunk and direction
                hunk_start = min(
                    target_hunk.get("old_start", 1), target_hunk.get("new_start", 1)
                )
                hunk_end = max(
                    target_hunk.get("old_start", 1)
                    + target_hunk.get("old_count", 0)
                    - 1,
                    target_hunk.get("new_start", 1)
                    + target_hunk.get("new_count", 0)
                    - 1,
                )

                if direction == "before":
                    end_line = hunk_start - 1
                    start_line = max(1, end_line - context_lines + 1)
                else:  # direction == "after"
                    start_line = hunk_end + 1
                    end_line = start_line + context_lines - 1

            # Fetch the actual lines
            git_service = GitService()
            result = git_service.get_file_lines(file_path or "", start_line, end_line)

            # Compute left/right starting line numbers for proper numbering
            left_start_line = None
            right_start_line = start_line

            try:
                # Determine left/right bases from the target hunk
                old_start = target_hunk.get("old_start", 1) if 'target_hunk' in locals() else 1
                old_count = target_hunk.get("old_count", 0) if 'target_hunk' in locals() else 0
                new_start = target_hunk.get("new_start", 1) if 'target_hunk' in locals() else 1
                new_count = target_hunk.get("new_count", 0) if 'target_hunk' in locals() else 0

                old_end = old_start + max(old_count, 0) - 1
                new_end = new_start + max(new_count, 0) - 1

                if direction == "after":
                    # Base starts just after the hunk on each side
                    base_right_after = new_end + 1
                    base_left_after = old_end + 1
                    offset = right_start_line - base_right_after
                    left_start_line = base_left_after + max(offset, 0)
                else:  # before
                    # Base ends just before the hunk on each side
                    base_right_before_end = new_start - 1
                    base_left_before_end = old_start - 1
                    # Number of lines we actually returned
                    num_lines = len(result.get("lines", [])) if isinstance(result, dict) else len(result)
                    # Compute how far we are from the base end on the right
                    offset_to_end = base_right_before_end - end_line
                    left_end_line = base_left_before_end - max(offset_to_end, 0)
                    left_start_line = max(1, left_end_line - max(num_lines, 0) + 1)
            except Exception:
                # Fallback: mirror right side if any issue
                left_start_line = right_start_line

            # If pygments format requested, enhance the result with syntax highlighting
            if output_format == "pygments" and result.get("status") == "ok":
                from difflicious.services.syntax_service import (
                    SyntaxHighlightingService,
                )

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

            # Include left/right numbering starts for the client to render correctly
            result["left_start_line"] = left_start_line
            result["right_start_line"] = right_start_line

            return jsonify(result)

        except GitServiceError as e:
            logger.error(f"Context expansion error: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

    @app.route("/api/diff")
    def api_diff() -> Union[Response, tuple[Response, int]]:
        """API endpoint for git diff information."""
        # Get optional query parameters
        unstaged = request.args.get("unstaged", "true").lower() == "true"
        untracked = request.args.get("untracked", "false").lower() == "true"
        file_path = request.args.get("file")
        base_ref = request.args.get("base_ref")

        # New single-source parameters
        use_head = request.args.get("use_head", "false").lower() == "true"

        try:
            diff_service = DiffService()

            # Map to the legacy DiffService interface (which internally uses new get_diff)
            if use_head:
                # Working directory vs HEAD comparison
                grouped_data = diff_service.get_grouped_diffs(
                    base_ref="HEAD",
                    unstaged=unstaged,
                    untracked=untracked,
                    file_path=file_path,
                )
            else:
                # Working directory vs default branch comparison
                grouped_data = diff_service.get_grouped_diffs(
                    base_ref=base_ref,  # None -> default branch
                    unstaged=unstaged,
                    untracked=untracked,
                    file_path=file_path,
                )

            # Calculate total files across all groups
            total_files = sum(group["count"] for group in grouped_data.values())

            return jsonify(
                {
                    "status": "ok",
                    "groups": grouped_data,
                    "unstaged": unstaged,
                    "untracked": untracked,
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

    @app.route("/api/file/lines")
    def api_file_lines() -> Union[Response, tuple[Response, int]]:
        """API endpoint for fetching specific lines from a file (kept for compatibility)."""
        file_path = request.args.get("file_path")
        if not file_path:
            return (
                jsonify(
                    {"status": "error", "message": "file_path parameter is required"}
                ),
                400,
            )

        start_line = request.args.get("start_line")
        end_line = request.args.get("end_line")

        if not start_line or not end_line:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "start_line and end_line parameters are required",
                    }
                ),
                400,
            )

        try:
            start_line_int = int(start_line)
            end_line_int = int(end_line)
        except ValueError:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "start_line and end_line must be valid numbers",
                    }
                ),
                400,
            )

        try:
            git_service = GitService()
            return jsonify(
                git_service.get_file_lines(file_path, start_line_int, end_line_int)
            )

        except GitServiceError as e:
            logger.error(f"Git service error: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

    return app


def run_server(host: str = "127.0.0.1", port: int = 5000, debug: bool = False) -> None:
    """Run the Flask development server."""
    app = create_app()
    app.run(host=host, port=port, debug=debug)
