"""Flask web application for Difflicious git diff visualization."""

from flask import Flask, render_template, jsonify, request
from typing import Dict, Any
import os
import logging
from difflicious.git_operations import get_git_repository, GitOperationError


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
        try:
            # Get git repository (defaults to current working directory)
            repo = get_git_repository()
            status_info = repo.get_status()
            
            return jsonify({
                "status": "ok",
                **status_info
            })
            
        except GitOperationError as e:
            logger.error(f"Git status error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e),
                "git_available": False,
                "current_branch": "error",
                "files_changed": 0
            }), 500
        except Exception as e:
            logger.error(f"Unexpected error in git status: {e}")
            return jsonify({
                "status": "error", 
                "message": "Internal server error",
                "git_available": False,
                "current_branch": "error",
                "files_changed": 0
            }), 500
    
    @app.route('/api/diff')
    def api_diff() -> Dict[str, Any]:
        """API endpoint for git diff information."""
        try:
            # Get optional query parameters
            staged = request.args.get('staged', 'false').lower() == 'true'
            file_path = request.args.get('file')
            
            # Get git repository
            repo = get_git_repository()
            diffs = repo.get_diff(staged=staged, file_path=file_path)
            
            return jsonify({
                "status": "ok",
                "diffs": diffs,
                "staged": staged,
                "file_filter": file_path
            })
            
        except GitOperationError as e:
            logger.error(f"Git diff error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e),
                "diffs": []
            }), 500
        except Exception as e:
            logger.error(f"Unexpected error in git diff: {e}")
            return jsonify({
                "status": "error",
                "message": "Internal server error", 
                "diffs": []
            }), 500
    
    return app


def run_server(host: str = "127.0.0.1", port: int = 5000, debug: bool = False) -> None:
    """Run the Flask development server."""
    app = create_app()
    app.run(host=host, port=port, debug=debug)