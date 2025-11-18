"""Main page routes for Difflicious web application."""

import base64
import logging

from flask import Blueprint, Response, render_template, request

from difflicious.services.exceptions import DiffServiceError, GitServiceError
from difflicious.services.git_service import GitService
from difflicious.services.template_service import TemplateRenderingService

logger = logging.getLogger(__name__)

views = Blueprint("views", __name__)


@views.route("/")
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
            except Exception as e:
                # Fallback: leave base_ref as None
                logger.warning(f"Could not determine current branch: {e}")

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

    except (
        ValueError,
        KeyError,
        OSError,
        RuntimeError,
        DiffServiceError,
        GitServiceError,
        Exception,
    ) as e:
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


@views.route("/installHook.js.map")
def devtools_stub_sourcemap() -> Response:
    """Serve minimal source map to avoid DevTools 404 warnings.

    DevTools extensions occasionally request a source map named installHook.js.map
    from the app origin, which causes 404 warnings. This serves a minimal, valid map.
    """
    stub_map = {
        "version": 3,
        "file": "installHook.js",
        "sources": [],
        "names": [],
        "mappings": "",
    }
    from flask import jsonify

    return jsonify(stub_map)


@views.route("/favicon.ico")
def favicon() -> Response:
    """Serve a tiny placeholder favicon to avoid 404s in the console.

    Returns:
        Response with a 16x16 transparent PNG image.
    """
    # 16x16 transparent PNG (very small) encoded as base64
    png_base64 = (
        "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAHElEQVR4AWP4//8/AyWYGKAA"
        "GDAwMDAwQwYAAH7iB8o1s3BuAAAAAElFTkSuQmCC"
    )
    png_bytes = base64.b64decode(png_base64)
    return Response(png_bytes, mimetype="image/png")
