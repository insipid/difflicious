"""Flask web application for Difflicious git diff visualization."""

import base64
import logging
import os
from pathlib import Path
from typing import Optional, Union

from flask import Flask, Response, jsonify, render_template, request

# Import services and configuration
from difflicious.config import AVAILABLE_FONTS
from difflicious.services import (
    BranchesResponse,
    DiffRequest,
    DiffResponse,
    DiffService,
    DiffServiceError,
    ExpandContextRequest,
    ExpandContextResponse,
    FileLinesRequest,
    FileLinesResponse,
    FullDiffRequest,
    FullDiffResponse,
    GitService,
    GitServiceError,
    StatusResponse,
    TemplateRenderingService,
)


def create_app(
    git_service: Optional[GitService] = None,
    diff_service: Optional[DiffService] = None,
    template_service: Optional[TemplateRenderingService] = None,
) -> Flask:
    """Create and configure the Flask application.

    Args:
        git_service: Optional GitService instance for dependency injection
        diff_service: Optional DiffService instance for dependency injection
        template_service: Optional TemplateRenderingService instance for dependency injection

    Returns:
        Configured Flask application instance
    """

    # Configure template directory to be relative to package
    template_dir = os.path.join(os.path.dirname(__file__), "templates")
    static_dir = os.path.join(os.path.dirname(__file__), "static")

    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)

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

    # Create services once at app scope for reuse across all requests
    # Services operate on current directory and don't hold request-specific state
    # Can be injected for testing via create_app parameters
    if git_service is None:
        git_service = GitService()
    if diff_service is None:
        diff_service = DiffService()
    if template_service is None:
        template_service = TemplateRenderingService(
            diff_service=diff_service,
            git_service=git_service,
        )

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
                    repo_status = git_service.get_repository_status()
                    current_branch = repo_status.get("current_branch", None)
                    # Use current_branch if available so service treats it as HEAD comparison
                    if current_branch and current_branch not in ("unknown", "error"):
                        base_ref = current_branch
                except Exception:
                    # Fallback: leave base_ref as None
                    pass

            # Prepare template data using app-scoped service
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

    @app.route("/api/v1/status")
    def api_v1_status() -> Response:
        """API endpoint for git status information."""
        try:
            status_data = git_service.get_repository_status()
            response = StatusResponse(
                status=status_data.get("status", "ok"),
                current_branch=status_data.get("current_branch", "unknown"),
                repository_name=status_data.get("repository_name", "unknown"),
                files_changed=status_data.get("files_changed", 0),
                git_available=status_data.get("git_available", True),
            )
            return jsonify(response.to_dict())
        except Exception as e:
            logger.error(f"Failed to get git status: {e}")
            response = StatusResponse(
                status="error",
                current_branch="unknown",
                repository_name="unknown",
                files_changed=0,
                git_available=False,
            )
            return jsonify(response.to_dict())

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

    @app.route("/api/v1/branches")
    def api_v1_branches() -> Union[Response, tuple[Response, int]]:
        """API endpoint for git branch information."""
        try:
            branch_data = git_service.get_branch_information()
            response = BranchesResponse(
                status=branch_data.get("status", "ok"),
                branches=branch_data.get("branches", {}),
            )
            return jsonify(response.to_dict())
        except GitServiceError as e:
            logger.error(f"Failed to get branch info: {e}")
            response = BranchesResponse(status="error", message=str(e))
            return jsonify(response.to_dict()), 500

    @app.route("/api/v1/expand-context")
    def api_v1_expand_context() -> Union[Response, tuple[Response, int]]:
        """API endpoint for context expansion (AJAX for dynamic updates)."""
        # Parse request parameters into DTO
        req = ExpandContextRequest(
            file_path=request.args.get("file_path", ""),
            hunk_index=request.args.get("hunk_index", type=int) or 0,
            direction=request.args.get("direction", ""),
            context_lines=request.args.get("context_lines", 10, type=int),
            output_format=request.args.get("format", "plain"),
            target_start=request.args.get("target_start", type=int),
            target_end=request.args.get("target_end", type=int),
        )

        # Validate request
        is_valid, error_message = req.validate()
        if not is_valid:
            response = ExpandContextResponse(status="error", message=error_message)
            return jsonify(response.to_dict()), 400

        try:
            # Use the target range provided by the frontend if available
            if req.target_start is not None and req.target_end is not None:
                start_line = req.target_start
                end_line = req.target_end
            else:
                # Fallback: try to calculate from diff data
                grouped_diffs = diff_service.get_grouped_diffs(file_path=req.file_path)

                # Find the specific file and hunk
                target_hunk = None
                for group_data in grouped_diffs.values():
                    for file_data in group_data["files"]:
                        if file_data["path"] == req.file_path and file_data.get(
                            "hunks"
                        ):
                            if req.hunk_index < len(file_data["hunks"]):
                                target_hunk = file_data["hunks"][req.hunk_index]
                                break
                    if target_hunk:
                        break

                if not target_hunk:
                    response = ExpandContextResponse(
                        status="error",
                        message=f"Hunk {req.hunk_index} not found in file {req.file_path}",
                    )
                    return jsonify(response.to_dict()), 404

                # Calculate the line range to fetch based on hunk and direction
                new_start = target_hunk.get("new_start", 1)
                new_count = target_hunk.get("new_count", 0)
                new_end = new_start + max(new_count, 0) - 1

                if req.direction == "before":
                    # Always anchor the fetch to the right side (new file)
                    end_line = new_start - 1
                    start_line = max(1, end_line - req.context_lines + 1)
                else:  # direction == "after"
                    # Always anchor the fetch to the right side (new file)
                    start_line = new_end + 1
                    end_line = start_line + req.context_lines - 1

            # Fetch the actual lines
            result = git_service.get_file_lines(req.file_path, start_line, end_line)

            # Create response DTO
            response = ExpandContextResponse(
                status=result.get("status", "ok"),
                lines=result.get("lines", []),
                start_line=result.get("start_line", start_line),
                end_line=result.get("end_line", end_line),
                file_path=result.get("file_path", req.file_path),
                output_format=req.output_format,
            )

            # If pygments format requested, enhance the result with syntax highlighting
            if req.output_format == "pygments" and response.status == "ok":
                from difflicious.services.syntax_service import (
                    SyntaxHighlightingService,
                )

                syntax_service = SyntaxHighlightingService()

                enhanced_lines = []
                for line_content in response.lines:
                    if line_content:
                        highlighted_content = syntax_service.highlight_diff_line(
                            line_content, req.file_path
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

                response.lines = enhanced_lines
                response.css_styles = syntax_service.get_css_styles()

            return jsonify(response.to_dict())

        except GitServiceError as e:
            logger.error(f"Context expansion error: {e}")
            response = ExpandContextResponse(status="error", message=str(e))
            return jsonify(response.to_dict()), 500

    @app.route("/api/v1/diff")
    def api_v1_diff() -> Union[Response, tuple[Response, int]]:
        """API endpoint for git diff information."""
        # Parse request parameters into DTO
        req = DiffRequest(
            base_ref=request.args.get("base_ref"),
            unstaged=request.args.get("unstaged", "true").lower() == "true",
            untracked=request.args.get("untracked", "false").lower() == "true",
            file_path=request.args.get("file"),
            use_head=request.args.get("use_head", "false").lower() == "true",
        )

        try:
            # Use template service logic for proper branch comparison handling
            # Get basic repository information
            repo_status = template_service.git_service.get_repository_status()
            current_branch = repo_status.get("current_branch", "unknown")

            # Determine if this is a HEAD comparison
            is_head_comparison = (
                req.base_ref in ["HEAD", current_branch] if req.base_ref else False
            )

            if is_head_comparison:
                # Working directory vs HEAD comparison - use diff service directly
                grouped_data = diff_service.get_grouped_diffs(
                    base_ref="HEAD",
                    unstaged=req.unstaged,
                    untracked=req.untracked,
                    file_path=req.file_path,
                )
            else:
                # Working directory vs branch comparison - use template service logic
                # This ensures proper combining of staged/unstaged into "changes" group
                template_data = template_service.prepare_diff_data_for_template(
                    base_ref=req.base_ref,
                    unstaged=req.unstaged,
                    staged=True,  # Always include staged for branch comparisons
                    untracked=req.untracked,
                    file_path=req.file_path,
                )
                grouped_data = template_data["groups"]
                # Normalize group structure for consistent API response
                if "unstaged" not in grouped_data and "changes" in grouped_data:
                    grouped_data["unstaged"] = grouped_data["changes"]
                if "staged" not in grouped_data:
                    grouped_data["staged"] = {"files": [], "count": 0}

            # Calculate total files across all groups
            total_files = sum(group["count"] for group in grouped_data.values())

            # Create response DTO
            response = DiffResponse(
                status="ok",
                groups=grouped_data,
                total_files=total_files,
                unstaged=req.unstaged,
                untracked=req.untracked,
                file_filter=req.file_path,
                use_head=req.use_head,
                base_ref=req.base_ref,
            )
            return jsonify(response.to_dict())

        except DiffServiceError as e:
            logger.error(f"Diff service error: {e}")
            response = DiffResponse(
                status="error",
                message=str(e),
                groups={
                    "untracked": {"files": [], "count": 0},
                    "unstaged": {"files": [], "count": 0},
                    "staged": {"files": [], "count": 0},
                },
            )
            return jsonify(response.to_dict()), 500

    @app.route("/api/v1/file/lines")
    def api_v1_file_lines() -> Union[Response, tuple[Response, int]]:
        """API endpoint for fetching specific lines from a file."""
        # Parse request parameters
        start_line_str = request.args.get("start_line")
        end_line_str = request.args.get("end_line")

        # Check for missing parameters first
        if not start_line_str or not end_line_str:
            response = FileLinesResponse(
                status="error",
                message="start_line and end_line parameters are required",
            )
            return jsonify(response.to_dict()), 400

        try:
            req = FileLinesRequest(
                file_path=request.args.get("file_path", ""),
                start_line=int(start_line_str),
                end_line=int(end_line_str),
            )
        except (ValueError, TypeError):
            response = FileLinesResponse(
                status="error",
                message="start_line and end_line must be valid numbers",
            )
            return jsonify(response.to_dict()), 400

        # Validate request
        is_valid, error_message = req.validate()
        if not is_valid:
            response = FileLinesResponse(status="error", message=error_message)
            return jsonify(response.to_dict()), 400

        try:
            result = git_service.get_file_lines(
                req.file_path, req.start_line, req.end_line
            )
            response = FileLinesResponse(
                status=result.get("status", "ok"),
                lines=result.get("lines", []),
                start_line=result.get("start_line", req.start_line),
                end_line=result.get("end_line", req.end_line),
                file_path=result.get("file_path", req.file_path),
            )
            return jsonify(response.to_dict())

        except GitServiceError as e:
            logger.error(f"Git service error: {e}")
            response = FileLinesResponse(status="error", message=str(e))
            return jsonify(response.to_dict()), 500

    @app.route("/api/v1/diff/full")
    def api_v1_diff_full() -> Union[Response, tuple[Response, int]]:
        """API endpoint for complete file diff with unlimited context."""
        # Parse request parameters into DTO
        req = FullDiffRequest(
            file_path=request.args.get("file_path", ""),
            base_ref=request.args.get("base_ref"),
            use_head=request.args.get("use_head", "false").lower() == "true",
            use_cached=request.args.get("use_cached", "false").lower() == "true",
        )

        # Validate request
        is_valid, error_message = req.validate()
        if not is_valid:
            response = FullDiffResponse(status="error", message=error_message)
            return jsonify(response.to_dict()), 400

        try:
            result = diff_service.get_full_diff_data(
                file_path=req.file_path,
                base_ref=req.base_ref,
                use_head=req.use_head,
                use_cached=req.use_cached,
            )
            response = FullDiffResponse(
                status=result.get("status", "ok"),
                file_path=result.get("file_path", req.file_path),
                diff_data=result.get("diff_data"),
            )
            return jsonify(response.to_dict())

        except DiffServiceError as e:
            logger.error(f"Full diff service error: {e}")
            response = FullDiffResponse(
                status="error",
                file_path=req.file_path,
                message=str(e),
            )
            return jsonify(response.to_dict()), 500

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
    """Run the Flask development server.

    When debug mode is enabled, automatically watches all HTML templates,
    JavaScript, and CSS files for changes to trigger server reloads.

    Args:
        host: Host to bind the server to
        port: Port to run the server on
        debug: Enable debug mode with auto-reload
    """
    app = create_app()

    # When debug mode is enabled, automatically watch all frontend files
    extra_files = None
    if debug:
        template_dir = os.path.join(os.path.dirname(__file__), "templates")
        static_dir = os.path.join(os.path.dirname(__file__), "static")

        extra_files = []

        # Collect all HTML templates
        template_path = Path(template_dir)
        if template_path.exists():
            for html_file in template_path.rglob("*.html"):
                extra_files.append(str(html_file.resolve()))

        # Collect all JavaScript and CSS files from static directory
        static_path = Path(static_dir)
        if static_path.exists():
            for js_file in static_path.rglob("*.js"):
                extra_files.append(str(js_file.resolve()))
            for css_file in static_path.rglob("*.css"):
                extra_files.append(str(css_file.resolve()))

    # Flask's app.run() accepts extra_files parameter for watching additional files in debug mode
    if extra_files:
        app.run(host=host, port=port, debug=debug, extra_files=extra_files)
    else:
        app.run(host=host, port=port, debug=debug)
