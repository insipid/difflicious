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

    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    @app.route("/")
    def index() -> str:
        """Main diff visualization page with server-side rendering."""
        try:
            # Get query parameters
            base_branch = request.args.get("base_branch")
            target_commit = request.args.get("target_commit")
            unstaged = request.args.get("unstaged", "true").lower() == "true"
            untracked = request.args.get("untracked", "false").lower() == "true"
            file_path = request.args.get("file")
            search_filter = request.args.get("search", "").strip()
            expand_files = request.args.get("expand", "false").lower() == "true"

            # Prepare template data
            template_service = TemplateRenderingService()
            template_data = template_service.prepare_diff_data_for_template(
                base_commit=base_branch,
                target_commit=target_commit,
                unstaged=unstaged,
                untracked=untracked,
                file_path=file_path,
                search_filter=search_filter if search_filter else None,
                expand_files=expand_files
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
                "syntax_css": ""
            }
            return render_template("index.html", **error_data), 500

    @app.route("/api/status")
    def api_status() -> Response:
        """API endpoint for git status information (kept for compatibility)."""
        try:
            git_service = GitService()
            return jsonify(git_service.get_repository_status())
        except Exception as e:
            logger.error(f"Failed to get git status: {e}")
            return jsonify({
                "status": "error",
                "current_branch": "unknown",
                "repository_name": "unknown",
                "files_changed": 0,
                "git_available": False,
            })

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

        if not all([file_path, hunk_index is not None, direction]):
            return jsonify({
                "status": "error",
                "message": "Missing required parameters"
            }), 400

        try:
            git_service = GitService()
            result = git_service.get_file_lines(
                file_path,
                1,  # Will be calculated based on hunk and direction
                context_lines
            )
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
        base_commit = request.args.get("base_commit")
        target_commit = request.args.get("target_commit")

        try:
            diff_service = DiffService()
            grouped_data = diff_service.get_grouped_diffs(
                base_commit=base_commit,
                target_commit=target_commit,
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
                    "base_commit": base_commit,
                    "target_commit": target_commit,
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
