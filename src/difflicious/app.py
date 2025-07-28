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
# SAMPLE_DIFF_PATH = Path(__file__).parent.parent.parent / "tests" / "sample_01.word.diff"
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


def get_real_git_diff(base_commit: str = None, target_commit: str = None,
                      staged: bool = False, file_path: str = None) -> list:
    """Get real git diff data using git operations.
    
    Args:
        base_commit: Base commit SHA to compare from
        target_commit: Target commit SHA to compare to  
        staged: Whether to get staged changes
        file_path: Optional specific file to diff
        
    Returns:
        List of diff data or empty list on error
    """
    try:
        repo = get_git_repository()
        diffs = repo.get_diff(base_commit=base_commit, target_commit=target_commit,
                             staged=staged, file_path=file_path)

        # Convert to format expected by frontend
        formatted_diffs = []
        for diff in diffs:
            # Parse the diff content if available
            if diff.get('content'):
                try:
                    parsed_diff = parse_git_diff_for_rendering(diff['content'])
                    if parsed_diff:
                        formatted_diffs.extend(parsed_diff)
                except DiffParseError as e:
                    logging.warning(f"Failed to parse diff for {diff['file']}: {e}")

        return formatted_diffs
    except GitOperationError as e:
        logging.error(f"Git operation failed: {e}")
        return []


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
        # Get optional query parameters
        staged = request.args.get('staged', 'false').lower() == 'true'
        file_path = request.args.get('file')
        base_commit = request.args.get('base_commit')
        target_commit = request.args.get('target_commit')

        # Set hardcoded default commits if none provided
        if not base_commit and not target_commit and not staged:
            # Default to comparing recent commits for demonstration
            # These are actual commits from this repository
            base_commit = 'a29759f'  # File navigation commit
            target_commit = 'fa8e68e'  # Commit comparison functionality commit
            # Reference commits used for testing
            # base_commit = 'be9d'
            # target_commit = '871c'

        # Try to get real git diff data
        try:
            diff_data = get_real_git_diff(
                base_commit=base_commit,
                target_commit=target_commit,
                staged=staged,
                file_path=file_path
            )

            # If no real data available, fall back to sample data
            if not diff_data:
                diff_data = SAMPLE_DIFF_DATA if SAMPLE_DIFF_DATA else []
                # Filter by file if requested
                if file_path:
                    diff_data = [f for f in diff_data if file_path in f.get('path', '')]

        except Exception as e:
            logger.error(f"Failed to get real git diff: {e}")
            # Fall back to sample data on any error
            diff_data = SAMPLE_DIFF_DATA if SAMPLE_DIFF_DATA else []
            if file_path:
                diff_data = [f for f in diff_data if file_path in f.get('path', '')]

        return jsonify({
            "status": "ok",
            "diffs": diff_data,
            "staged": staged,
            "file_filter": file_path,
            "base_commit": base_commit,
            "target_commit": target_commit,
            "total_files": len(diff_data),
            "using_sample_data": diff_data == SAMPLE_DIFF_DATA
        })

    return app


def run_server(host: str = "127.0.0.1", port: int = 5000, debug: bool = False) -> None:
    """Run the Flask development server."""
    app = create_app()
    app.run(host=host, port=port, debug=debug)
