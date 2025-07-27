"""Flask web application for Difflicious git diff visualization."""

from flask import Flask, render_template, jsonify, request
from typing import Dict, Any
import os
import json
import logging
from difflicious.git_operations import get_git_repository, GitOperationError

# Load dummy data
DUMMY_DATA_PATH = os.path.join(os.path.dirname(__file__), 'dummy_data.json')
with open(DUMMY_DATA_PATH, 'r') as f:
    DUMMY_DATA = json.load(f)


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__)
    
    # Configure template directory to be relative to package
    template_dir = os.path.join(os.path.dirname(__file__), 'templates')
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    
    app = Flask(__name__, 
                template_folder=template_dir,
                static_folder=static_dir)
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    @app.route('/')
    def index() -> str:
        """Main diff visualization page."""
        return render_template('index.html')
    
    @app.route('/api/status')
    def api_status() -> Dict[str, Any]:
        """API endpoint for git status information."""
        # Return dummy data for demo purposes
        return jsonify(DUMMY_DATA["status"])
    
    @app.route('/api/diff')
    def api_diff() -> Dict[str, Any]:
        """API endpoint for git diff information."""
        # Get optional query parameters for future use
        staged = request.args.get('staged', 'false').lower() == 'true'
        file_path = request.args.get('file')
        
        # Return dummy data for demo purposes
        return jsonify({
            "status": "ok",
            "diffs": DUMMY_DATA["diffs"],
            "staged": staged,
            "file_filter": file_path
        })
    
    return app


def run_server(host: str = "127.0.0.1", port: int = 5000, debug: bool = False) -> None:
    """Run the Flask development server."""
    app = create_app()
    app.run(host=host, port=port, debug=debug)