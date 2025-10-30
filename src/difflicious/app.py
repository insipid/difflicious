"""Flask web application for Difflicious git diff visualization."""

import base64
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

    # Font configuration
    AVAILABLE_FONTS = {
        "fira-code": {
            "name": "Fira Code",
            "css_family": "'Fira Code', monospace",
            "google_fonts_url": "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600&display=swap",
        },
        "jetbrains-mono": {
            "name": "JetBrains Mono",
            "css_family": "'JetBrains Mono', monospace",
            "google_fonts_url": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap",
        },
        "source-code-pro": {
            "name": "Source Code Pro",
            "css_family": "'Source Code Pro', monospace",
            "google_fonts_url": "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@300;400;500;600&display=swap",
        },
        "ibm-plex-mono": {
            "name": "IBM Plex Mono",
            "css_family": "'IBM Plex Mono', monospace",
            "google_fonts_url": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap",
        },
        "roboto-mono": {
            "name": "Roboto Mono",
            "css_family": "'Roboto Mono', monospace",
            "google_fonts_url": "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;400;500&display=swap",
        },
        "inconsolata": {
            "name": "Inconsolata",
            "css_family": "'Inconsolata', monospace",
            "google_fonts_url": "https://fonts.googleapis.com/css2?family=Inconsolata:wght@200;300;400;500;600;700;800;900&display=swap",
        },
    }

    # Get font selection from environment variable with default
    selected_font_key = os.getenv("DIFFLICIOUS_FONT", "jetbrains-mono")

    # Validate font selection and fallback to default
    if selected_font_key not in AVAILABLE_FONTS:
        selected_font_key = "jetbrains-mono"

    selected_font = AVAILABLE_FONTS[selected_font_key]

    # Font configuration for templates
    FONT_CONFIG = {
        "selected_font_key": selected_font_key,
        "selected_font": selected_font,
        "available_fonts": AVAILABLE_FONTS,
        "google_fonts_enabled": os.getenv(
            "DIFFLICIOUS_DISABLE_GOOGLE_FONTS", "false"
        ).lower()
        != "true",
    }

    # Register jinja-partials extension
    import jinja_partials  # type: ignore[import-untyped]

    jinja_partials.register_extensions(app)

    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    @app.context_processor
    def inject_font_config() -> dict[str, dict]:
        """Inject font configuration into all templates."""
        return {"font_config": FONT_CONFIG}

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

            # If no base_ref specified, default to current checked-out branch to trigger HEAD comparison mode
            if not base_ref:
                try:
                    git_service = GitService()
                    repo_status = git_service.get_repository_status()
                    current_branch = repo_status.get("current_branch", None)
                    # Use current_branch if available so service treats it as HEAD comparison
                    if current_branch and current_branch not in ("unknown", "error"):
                        base_ref = current_branch
                except Exception:
                    # Fallback: leave base_ref as None
                    pass

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

    # DevTools extensions occasionally request a source map named installHook.js.map
    # from the app origin, which causes 404 warnings. Serve a minimal, valid map.
    @app.route("/installHook.js.map")
    def devtools_stub_sourcemap() -> Response:
        stub_map = {
            "version": 3,
            "file": "installHook.js",
            "sources": [],
            "names": [],
            "mappings": "",
        }
        return jsonify(stub_map)

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
            # Use template service logic for proper branch comparison handling
            template_service = TemplateRenderingService()

            # Get basic repository information
            repo_status = template_service.git_service.get_repository_status()
            current_branch = repo_status.get("current_branch", "unknown")

            # Determine if this is a HEAD comparison
            is_head_comparison = (
                base_ref in ["HEAD", current_branch] if base_ref else False
            )

            if is_head_comparison:
                # Working directory vs HEAD comparison - use diff service directly
                diff_service = DiffService()
                grouped_data = diff_service.get_grouped_diffs(
                    base_ref="HEAD",
                    unstaged=unstaged,
                    untracked=untracked,
                    file_path=file_path,
                )
            else:
                # Working directory vs branch comparison - use template service logic
                # This ensures proper combining of staged/unstaged into "changes" group
                template_data = template_service.prepare_diff_data_for_template(
                    base_ref=base_ref,
                    unstaged=unstaged,
                    staged=True,  # Always include staged for branch comparisons
                    untracked=untracked,
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

    @app.route("/api/diff/full")
    def api_diff_full() -> Union[Response, tuple[Response, int]]:
        """API endpoint for complete file diff with unlimited context."""
        file_path = request.args.get("file_path")
        if not file_path:
            return (
                jsonify(
                    {"status": "error", "message": "file_path parameter is required"}
                ),
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

    # Serve a tiny placeholder favicon to avoid 404s in the console.
    @app.route("/favicon.ico")
    def favicon() -> Response:
        # 16x16 transparent PNG (very small) encoded as base64
        png_base64 = (
            "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAHElEQVR4AWP4//8/AyWYGKAA"
            "GDAwMDAwQwYAAH7iB8o1s3BuAAAAAElFTkSuQmCC"
        )
        png_bytes = base64.b64decode(png_base64)
        return Response(png_bytes, mimetype="image/png")

    return app


def run_server(host: str = "127.0.0.1", port: int = 5000, debug: bool = False) -> None:
    """Run the Flask development server."""
    app = create_app()
    app.run(host=host, port=port, debug=debug)
