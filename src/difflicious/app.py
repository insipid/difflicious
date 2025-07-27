"""Flask web application for Difflicious git diff visualization."""

from flask import Flask, render_template, jsonify
from typing import Dict, Any
import os


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Configure template directory to be relative to package
    template_dir = os.path.join(os.path.dirname(__file__), 'templates')
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    
    app = Flask(__name__, 
                template_folder=template_dir,
                static_folder=static_dir)
    
    @app.route('/')
    def index() -> str:
        """Main diff visualization page."""
        return render_template('index.html')
    
    @app.route('/api/status')
    def api_status() -> Dict[str, Any]:
        """API endpoint for git status information."""
        # TODO: Implement git status fetching
        return jsonify({
            "status": "ok",
            "message": "Git status API endpoint - implementation coming soon",
            "git_available": True,  # TODO: Check if git is available
            "current_branch": "main",  # TODO: Get actual current branch
            "files_changed": 0  # TODO: Get actual file count
        })
    
    @app.route('/api/diff')
    def api_diff() -> Dict[str, Any]:
        """API endpoint for git diff information."""
        # TODO: Implement git diff fetching
        return jsonify({
            "status": "ok", 
            "message": "Git diff API endpoint - implementation coming soon",
            "diffs": []  # TODO: Return actual diff data
        })
    
    return app


def run_server(host: str = "127.0.0.1", port: int = 5000, debug: bool = False) -> None:
    """Run the Flask development server."""
    app = create_app()
    app.run(host=host, port=port, debug=debug)