"""Flask web application for Difflicious git diff visualization."""

import logging
import os
from pathlib import Path
from typing import Optional

from flask import Flask

from difflicious.config import get_font_config
from difflicious.services import DiffService, GitService, TemplateRenderingService


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

    # Get font configuration
    font_config = get_font_config()

    # Register jinja-partials extension
    import jinja_partials  # type: ignore[import-untyped]

    jinja_partials.register_extensions(app)

    # Configure logging
    logging.basicConfig(level=logging.INFO)

    @app.context_processor
    def inject_font_config() -> dict[str, dict]:
        """Inject font configuration into all templates."""
        return {"font_config": font_config}

    @app.context_processor
    def inject_auto_reload_config() -> dict[str, bool]:
        """Inject auto-reload configuration into all templates."""
        auto_reload_enabled = (
            os.getenv("DIFFLICIOUS_AUTO_RELOAD", "true").lower() == "true"
        )
        return {"auto_reload_enabled": auto_reload_enabled}

    @app.context_processor
    def inject_debug_config() -> dict[str, bool]:
        """Inject debug configuration into all templates."""
        debug_enabled = os.getenv("DIFFLICIOUS_DEBUG", "false").lower() == "true"
        return {"debug_enabled": debug_enabled}

    # Store service instances on app for blueprints to use
    # These can be injected for testing or created fresh
    app.git_service = git_service  # type: ignore[attr-defined]
    app.diff_service = diff_service  # type: ignore[attr-defined]
    app.template_service = template_service  # type: ignore[attr-defined]

    # Register blueprints
    from difflicious.blueprints import (
        auto_reload_api,
        context_api,
        diff_api,
        git_api,
        views,
    )

    app.register_blueprint(views)
    app.register_blueprint(git_api)
    app.register_blueprint(diff_api)
    app.register_blueprint(context_api)
    app.register_blueprint(auto_reload_api)

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
