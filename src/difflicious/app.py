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
                      unstaged: bool = True, untracked: bool = False, file_path: str = None) -> list:
    """Get real git diff data using git operations.
    
    Args:
        base_commit: Base commit SHA to compare from
        target_commit: Target commit SHA to compare to (defaults to working directory)
        unstaged: Whether to include unstaged changes
        untracked: Whether to include untracked files
        file_path: Optional specific file to diff
        
    Returns:
        List of diff data or empty list on error
    """
    try:
        repo = get_git_repository()
        diffs = repo.get_diff(base_commit=base_commit, target_commit=target_commit,
                             unstaged=unstaged, untracked=untracked, file_path=file_path)

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

    @app.route('/api/branches')
    def api_branches() -> Dict[str, Any]:
        """API endpoint for git branch information."""
        try:
            repo = get_git_repository()
            all_branches = repo.get_branches()
            current_branch = repo.get_current_branch()
            main_branch = repo.get_main_branch(all_branches)
            
            other_branches = [
                b for b in all_branches 
                if b != main_branch and b != current_branch
            ]

            return jsonify({
                "status": "ok",
                "branches": {
                    "all": all_branches,
                    "current": current_branch,
                    "main": main_branch,
                    "others": other_branches,
                }
            })
        except GitOperationError as e:
            logger.error(f"Failed to get branch info: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

    @app.route('/api/diff')
    def api_diff() -> Dict[str, Any]:
        """API endpoint for git diff information."""
        # Get optional query parameters
        unstaged = request.args.get('unstaged', 'true').lower() == 'true'
        untracked = request.args.get('untracked', 'false').lower() == 'true'
        file_path = request.args.get('file')
        base_commit = request.args.get('base_commit')
        target_commit = request.args.get('target_commit')  # Kept for future use, defaults to None

        # Try to get real git diff data
        try:
            diff_data = get_real_git_diff(
                base_commit=base_commit,
                target_commit=target_commit,
                unstaged=unstaged,
                untracked=untracked,
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
            "unstaged": unstaged,
            "untracked": untracked,
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
