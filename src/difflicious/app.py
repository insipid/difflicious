"""Flask web application for Difflicious git diff visualization."""

from flask import Flask, render_template, jsonify, request
from typing import Dict, Any
import os
import json
import logging
from pathlib import Path
from difflicious.git_operations import get_git_repository, GitOperationError
from difflicious.diff_parser import parse_git_diff_for_rendering, DiffParseError

def get_real_git_diff(base_commit: str = None, target_commit: str = None,
                      unstaged: bool = True, untracked: bool = False, file_path: str = None) -> dict:
    """Get real git diff data using git operations.
    
    Args:
        base_commit: Base commit SHA to compare from
        target_commit: Target commit SHA to compare to (defaults to working directory)
        unstaged: Whether to include unstaged changes
        untracked: Whether to include untracked files
        file_path: Optional specific file to diff
        
    Returns:
        Dictionary with grouped diff data or empty groups on error
    """
    try:
        repo = get_git_repository()
        grouped_diffs = repo.get_diff(base_commit=base_commit, target_commit=target_commit,
                                     unstaged=unstaged, untracked=untracked, file_path=file_path)

        # Process each group to parse diff content for rendering
        for group_name, group_data in grouped_diffs.items():
            formatted_files = []
            for diff in group_data['files']:
                # Parse the diff content if available (but not for untracked files)
                if diff.get('content') and diff.get('status') != 'untracked':
                    try:
                        parsed_diff = parse_git_diff_for_rendering(diff['content'])
                        if parsed_diff:
                            # Take the first parsed diff item and update it with our metadata
                            formatted_diff = parsed_diff[0]
                            formatted_diff.update({
                                'path': diff['path'],
                                'additions': diff['additions'],
                                'deletions': diff['deletions'],
                                'changes': diff['changes'],
                                'status': diff['status']
                            })
                            formatted_files.append(formatted_diff)
                    except DiffParseError as e:
                        logging.warning(f"Failed to parse diff for {diff['path']}: {e}")
                        # Add the raw diff info if parsing fails
                        formatted_files.append(diff)
                else:
                    # For files without content or untracked files, add as-is
                    formatted_files.append(diff)
            
            group_data['files'] = formatted_files
            group_data['count'] = len(formatted_files)

        return grouped_diffs
    except GitOperationError as e:
        logging.error(f"Git operation failed: {e}")
        return {
            'untracked': {'files': [], 'count': 0},
            'unstaged': {'files': [], 'count': 0},
            'staged': {'files': [], 'count': 0}
        }


def create_app() -> Flask:

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
            repo = get_git_repository()
            current_branch = repo.get_current_branch()
            repo_name = repo.get_repository_name()
            
            # Get diff data to count changed files
            diff_data = repo.get_diff(unstaged=True, untracked=True)
            total_files = sum(group.get('count', 0) for group in diff_data.values())
            
            return jsonify({
                'status': 'ok',
                'current_branch': current_branch,
                'repository_name': repo_name,
                'files_changed': total_files,
                'git_available': True
            })
        except Exception as e:
            logger.error(f"Failed to get git status: {e}")
            return jsonify({
                'status': 'error',
                'current_branch': 'unknown',
                'repository_name': 'unknown',
                'files_changed': 0,
                'git_available': False
            })

    @app.route('/api/branches')
    def api_branches() -> Dict[str, Any]:
        """API endpoint for git branch information."""
        try:
            repo = get_git_repository()
            branch_info = repo.get_branches()
            all_branches = branch_info['branches']
            default_branch = branch_info['default_branch']
            current_branch = repo.get_current_branch()
            
            other_branches = [
                b for b in all_branches 
                if b != default_branch and b != current_branch
            ]

            return jsonify({
                "status": "ok",
                "branches": {
                    "all": all_branches,
                    "current": current_branch,
                    "default": default_branch,
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
            grouped_data = get_real_git_diff(
                base_commit=base_commit,
                target_commit=target_commit,
                unstaged=unstaged,
                untracked=untracked,
                file_path=file_path
            )

        except Exception as e:
            logger.error(f"Failed to get real git diff: {e}")
            grouped_data = {
                'untracked': {'files': [], 'count': 0},
                'unstaged': {'files': [], 'count': 0},
                'staged': {'files': [], 'count': 0}
            }

        # Calculate total files across all groups
        total_files = sum(group['count'] for group in grouped_data.values())

        return jsonify({
            "status": "ok",
            "groups": grouped_data,
            "unstaged": unstaged,
            "untracked": untracked,
            "file_filter": file_path,
            "base_commit": base_commit,
            "target_commit": target_commit,
            "total_files": total_files
        })

    @app.route('/api/diff/context')
    def api_diff_context() -> Dict[str, Any]:
        """API endpoint for fetching extended context for a specific file."""
        # Get required parameters
        file_path = request.args.get('file_path')
        if not file_path:
            return jsonify({"status": "error", "message": "file_path parameter is required"}), 400

        # Get optional parameters
        base_commit = request.args.get('base_commit')
        target_commit = request.args.get('target_commit')
        use_cached = request.args.get('use_cached', 'false').lower() == 'true'
        context_lines = request.args.get('context_lines', '20')

        try:
            context_lines = int(context_lines)
            if context_lines < 1 or context_lines > 100:
                return jsonify({"status": "error", "message": "context_lines must be between 1 and 100"}), 400
        except ValueError:
            return jsonify({"status": "error", "message": "context_lines must be a valid number"}), 400

        try:
            repo = get_git_repository()
            extended_diff = repo.get_extended_context(
                file_path=file_path,
                base_commit=base_commit,
                target_commit=target_commit,
                use_cached=use_cached,
                context_lines=context_lines
            )
            
            # Get file line count for boundary detection
            try:
                file_line_count = repo.get_file_line_count(file_path)
            except Exception:
                file_line_count = None

            # Parse the extended diff content
            if extended_diff and not extended_diff.startswith('Error'):
                try:
                    parsed_diff = parse_git_diff_for_rendering(extended_diff)
                    if parsed_diff:
                        extended_file_data = parsed_diff[0]
                        extended_file_data.update({
                            'path': file_path,
                            'context_lines': context_lines,
                            'file_line_count': file_line_count
                        })
                        return jsonify({
                            "status": "ok",
                            "file": extended_file_data,
                            "context_lines": context_lines,
                            "file_line_count": file_line_count
                        })
                except DiffParseError as e:
                    logger.warning(f"Failed to parse extended diff for {file_path}: {e}")

            return jsonify({
                "status": "ok",
                "file": None,
                "context_lines": context_lines,
                "file_line_count": file_line_count,
                "message": "No extended context available"
            })

        except Exception as e:
            logger.error(f"Failed to get extended context for {file_path}: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

    return app


def run_server(host: str = "127.0.0.1", port: int = 5000, debug: bool = False) -> None:
    """Run the Flask development server."""
    app = create_app()
    app.run(host=host, port=port, debug=debug)
