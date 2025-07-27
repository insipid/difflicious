"""Flask web application for Difflicious git diff visualization."""

from flask import Flask, render_template, jsonify, request
from typing import Dict, Any
import os
import json
import logging
from pathlib import Path
from difflicious.git_operations import get_git_repository, GitOperationError
from difflicious.diff_parser import parse_git_diff_for_rendering, DiffParseError

# Load sample diff data for testing
SAMPLE_DIFF_PATH = Path(__file__).parent.parent.parent / "tests" / "sample_01.diff"
SAMPLE_DIFF_DATA = None

# Load dummy status data
DUMMY_DATA_PATH = os.path.join(os.path.dirname(__file__), 'dummy_data.json')
with open(DUMMY_DATA_PATH, 'r') as f:
    DUMMY_STATUS_DATA = json.load(f)["status"]

# Parse the sample diff file for realistic diff data
if SAMPLE_DIFF_PATH.exists():
    try:
        sample_diff_content = SAMPLE_DIFF_PATH.read_text()
        SAMPLE_DIFF_DATA = parse_git_diff_for_rendering(sample_diff_content)
        print(f"✅ Loaded {len(SAMPLE_DIFF_DATA)} files from sample diff")
    except Exception as e:
        print(f"⚠️ Failed to load sample diff: {e}")
        SAMPLE_DIFF_DATA = []
else:
    print(f"⚠️ Sample diff file not found: {SAMPLE_DIFF_PATH}")
    SAMPLE_DIFF_DATA = []


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
        # Return dummy status data for demo purposes
        status_data = DUMMY_STATUS_DATA.copy()
        # Update file count to match our sample diff data
        if SAMPLE_DIFF_DATA:
            status_data["files_changed"] = len(SAMPLE_DIFF_DATA)
        return jsonify(status_data)
    
    @app.route('/api/diff')
    def api_diff() -> Dict[str, Any]:
        """API endpoint for git diff information."""
        # Get optional query parameters for future use
        staged = request.args.get('staged', 'false').lower() == 'true'
        file_path = request.args.get('file')
        
        # Use parsed sample diff data for demo purposes
        diff_data = SAMPLE_DIFF_DATA if SAMPLE_DIFF_DATA else []
        
        # Filter by file if requested
        if file_path:
            diff_data = [f for f in diff_data if file_path in f.get('path', '')]
        
        return jsonify({
            "status": "ok",
            "diffs": diff_data,
            "staged": staged,
            "file_filter": file_path,
            "total_files": len(diff_data)
        })
    
    return app


def run_server(host: str = "127.0.0.1", port: int = 5000, debug: bool = False) -> None:
    """Run the Flask development server."""
    app = create_app()
    app.run(host=host, port=port, debug=debug)