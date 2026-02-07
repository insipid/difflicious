# Extract Business Logic from Flask Routes to Service Layer

**Date:** 2025-07-29 19:18  
**Author:** Claude Code Analysis  
**Subject:** Detailed implementation guide for creating service layer architecture

## Overview

Extract business logic from Flask route handlers into a dedicated service layer, making the application more testable, maintainable, and following proper separation of concerns. The main target is the `get_real_git_diff()` function currently embedded in `app.py`.

## Current State Analysis

**Location:** `src/difflicious/app.py:12-68`

**Issues with Current Structure:**
- `get_real_git_diff()` function contains 56 lines of business logic in app.py
- Route handlers directly call git operations and perform data transformation
- Business logic mixed with HTTP concerns
- Difficult to unit test without Flask context
- No clear data flow separation

**Current Flow:**
```
HTTP Request → Flask Route → get_real_git_diff() → GitRepository → Response
```

**Target Flow:**
```
HTTP Request → Flask Route → DiffService → GitRepository → Response
```

## Implementation Plan

### Step 1: Create Service Layer Structure

Create new directory and files:
```
src/difflicious/services/
├── __init__.py
├── base_service.py
├── diff_service.py
├── git_service.py
└── exceptions.py
```

### Step 2: Implement Base Service Class

**File:** `src/difflicious/services/base_service.py`

```python
"""Base service class for common functionality."""

import logging
from typing import Optional
from difflicious.git_operations import GitRepository, get_git_repository

logger = logging.getLogger(__name__)

class BaseService:
    """Base class for all services with common functionality."""
    
    def __init__(self, repo_path: Optional[str] = None):
        """Initialize service with git repository.
        
        Args:
            repo_path: Optional path to git repository
        """
        self._repo = None
        self._repo_path = repo_path
    
    @property
    def repo(self) -> GitRepository:
        """Lazy-loaded git repository instance."""
        if self._repo is None:
            self._repo = get_git_repository(self._repo_path)
        return self._repo
    
    def _log_error(self, message: str, exception: Exception) -> None:
        """Consistent error logging across services."""
        logger.error(f"{self.__class__.__name__}: {message} - {exception}")
```

### Step 3: Create Service Exceptions

**File:** `src/difflicious/services/exceptions.py`

```python
"""Service layer exceptions."""

class ServiceError(Exception):
    """Base exception for service layer errors."""
    pass

class DiffServiceError(ServiceError):
    """Exception raised by diff service operations."""
    pass

class GitServiceError(ServiceError):
    """Exception raised by git service operations."""
    pass
```

### Step 4: Implement Diff Service

**File:** `src/difflicious/services/diff_service.py`

```python
"""Service for handling diff-related business logic."""

import logging
from typing import Dict, Any, Optional
from .base_service import BaseService
from .exceptions import DiffServiceError
from difflicious.git_operations import GitOperationError
from difflicious.diff_parser import parse_git_diff_for_rendering, DiffParseError

logger = logging.getLogger(__name__)

class DiffService(BaseService):
    """Service for diff-related operations and business logic."""
    
    def get_grouped_diffs(self, 
                         base_commit: Optional[str] = None,
                         target_commit: Optional[str] = None,
                         unstaged: bool = True,
                         untracked: bool = False,
                         file_path: Optional[str] = None) -> Dict[str, Any]:
        """Get processed diff data grouped by type.
        
        This method extracts the business logic currently in get_real_git_diff()
        from app.py and makes it independently testable.
        
        Args:
            base_commit: Base commit SHA to compare from
            target_commit: Target commit SHA to compare to
            unstaged: Whether to include unstaged changes
            untracked: Whether to include untracked files
            file_path: Optional specific file to diff
            
        Returns:
            Dictionary with grouped diff data
            
        Raises:
            DiffServiceError: If diff processing fails
        """
        try:
            # Get raw diff data from git operations
            grouped_diffs = self.repo.get_diff(
                base_commit=base_commit,
                target_commit=target_commit,
                unstaged=unstaged,
                untracked=untracked,
                file_path=file_path
            )

            # Process each group to parse diff content for rendering
            return self._process_diff_groups(grouped_diffs)
            
        except GitOperationError as e:
            self._log_error("Git operation failed during diff retrieval", e)
            raise DiffServiceError(f"Failed to retrieve diff data: {e}") from e
        except Exception as e:
            self._log_error("Unexpected error during diff processing", e)
            raise DiffServiceError(f"Diff processing failed: {e}") from e
    
    def _process_diff_groups(self, grouped_diffs: Dict[str, Any]) -> Dict[str, Any]:
        """Process raw diff groups into rendered format.
        
        Args:
            grouped_diffs: Raw diff data from git operations
            
        Returns:
            Processed diff data ready for frontend consumption
        """
        for group_name, group_data in grouped_diffs.items():
            formatted_files = []
            
            for diff in group_data['files']:
                processed_diff = self._process_single_diff(diff)
                formatted_files.append(processed_diff)
            
            group_data['files'] = formatted_files
            group_data['count'] = len(formatted_files)

        return grouped_diffs
    
    def _process_single_diff(self, diff: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single diff file.
        
        Args:
            diff: Raw diff data for a single file
            
        Returns:
            Processed diff data
        """
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
                    return formatted_diff
            except DiffParseError as e:
                logger.warning(f"Failed to parse diff for {diff['path']}: {e}")
                # Fall through to return raw diff
        
        # For files without content or parsing failures, return as-is
        return diff
    
    def get_diff_summary(self, **kwargs) -> Dict[str, Any]:
        """Get summary statistics for diffs.
        
        Args:
            **kwargs: Arguments passed to get_grouped_diffs
            
        Returns:
            Summary statistics dictionary
        """
        try:
            grouped_diffs = self.get_grouped_diffs(**kwargs)
            
            total_files = sum(group['count'] for group in grouped_diffs.values())
            total_additions = 0
            total_deletions = 0
            
            for group in grouped_diffs.values():
                for file_data in group['files']:
                    total_additions += file_data.get('additions', 0)
                    total_deletions += file_data.get('deletions', 0)
            
            return {
                'total_files': total_files,
                'total_additions': total_additions,
                'total_deletions': total_deletions,
                'total_changes': total_additions + total_deletions,
                'groups': {name: group['count'] for name, group in grouped_diffs.items()}
            }
            
        except DiffServiceError:
            raise
        except Exception as e:
            raise DiffServiceError(f"Failed to generate diff summary: {e}") from e
```

### Step 5: Implement Git Service (Optional Enhancement)

**File:** `src/difflicious/services/git_service.py`

```python
"""Service for git-related business logic."""

from typing import Dict, Any, List
from .base_service import BaseService
from .exceptions import GitServiceError
from difflicious.git_operations import GitOperationError

class GitService(BaseService):
    """Service for git repository operations."""
    
    def get_repository_status(self) -> Dict[str, Any]:
        """Get comprehensive repository status.
        
        Returns:
            Repository status dictionary
        """
        try:
            current_branch = self.repo.get_current_branch()
            repo_name = self.repo.get_repository_name()
            
            # Get diff data to count changed files
            diff_data = self.repo.get_diff(unstaged=True, untracked=True)
            total_files = sum(group.get('count', 0) for group in diff_data.values())
            
            return {
                'current_branch': current_branch,
                'repository_name': repo_name,
                'files_changed': total_files,
                'git_available': True,
                'status': 'ok'
            }
        except GitOperationError as e:
            return {
                'current_branch': 'unknown',
                'repository_name': 'unknown',
                'files_changed': 0,
                'git_available': False,
                'status': 'error',
                'error': str(e)
            }
    
    def get_branch_information(self) -> Dict[str, Any]:
        """Get branch information with error handling.
        
        Returns:
            Branch information dictionary
        """
        try:
            branch_info = self.repo.get_branches()
            current_branch = self.repo.get_current_branch()
            
            all_branches = branch_info['branches']
            default_branch = branch_info['default_branch']
            
            other_branches = [
                b for b in all_branches 
                if b != default_branch and b != current_branch
            ]

            return {
                "status": "ok",
                "branches": {
                    "all": all_branches,
                    "current": current_branch,
                    "default": default_branch,
                    "others": other_branches,
                }
            }
        except GitOperationError as e:
            raise GitServiceError(f"Failed to get branch information: {e}") from e
    
    def get_file_lines(self, file_path: str, start_line: int, end_line: int) -> Dict[str, Any]:
        """Get specific lines from a file with validation.
        
        Args:
            file_path: Path to file
            start_line: Starting line number  
            end_line: Ending line number
            
        Returns:
            File lines data
            
        Raises:
            GitServiceError: If operation fails
        """
        # Validation
        if start_line < 1 or end_line < start_line:
            raise GitServiceError("Invalid line range")
            
        if end_line - start_line > 100:
            raise GitServiceError("Line range too large (max 100 lines)")
        
        try:
            lines = self.repo.get_file_lines(file_path, start_line, end_line)
            
            return {
                "status": "ok",
                "file_path": file_path,
                "start_line": start_line,
                "end_line": end_line,
                "lines": lines,
                "line_count": len(lines)
            }
        except GitOperationError as e:
            raise GitServiceError(f"Failed to get file lines: {e}") from e
```

### Step 6: Update Flask Routes

**Modified:** `src/difflicious/app.py`

```python
"""Flask web application for Difflicious git diff visualization."""

from flask import Flask, render_template, jsonify, request
from typing import Dict, Any
import os
import logging
from pathlib import Path

# Import services
from difflicious.services.diff_service import DiffService
from difflicious.services.git_service import GitService
from difflicious.services.exceptions import DiffServiceError, GitServiceError

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
            git_service = GitService()
            return jsonify(git_service.get_repository_status())
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
            git_service = GitService()
            return jsonify(git_service.get_branch_information())
        except GitServiceError as e:
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
        target_commit = request.args.get('target_commit')

        try:
            diff_service = DiffService()
            grouped_data = diff_service.get_grouped_diffs(
                base_commit=base_commit,
                target_commit=target_commit,
                unstaged=unstaged,
                untracked=untracked,
                file_path=file_path
            )

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

        except DiffServiceError as e:
            logger.error(f"Diff service error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e),
                "groups": {
                    'untracked': {'files': [], 'count': 0},
                    'unstaged': {'files': [], 'count': 0},
                    'staged': {'files': [], 'count': 0}
                }
            }), 500

    @app.route('/api/file/lines')
    def api_file_lines() -> Dict[str, Any]:
        """API endpoint for fetching specific lines from a file."""
        file_path = request.args.get('file_path')
        if not file_path:
            return jsonify({"status": "error", "message": "file_path parameter is required"}), 400

        start_line = request.args.get('start_line')
        end_line = request.args.get('end_line')
        
        if not start_line or not end_line:
            return jsonify({"status": "error", "message": "start_line and end_line parameters are required"}), 400

        try:
            start_line = int(start_line)
            end_line = int(end_line)
        except ValueError:
            return jsonify({"status": "error", "message": "start_line and end_line must be valid numbers"}), 400

        try:
            git_service = GitService()
            return jsonify(git_service.get_file_lines(file_path, start_line, end_line))

        except GitServiceError as e:
            logger.error(f"Git service error: {e}")
            return jsonify({"status": "error", "message": str(e)}), 500

    return app

def run_server(host: str = "127.0.0.1", port: int = 5000, debug: bool = False) -> None:
    """Run the Flask development server."""
    app = create_app()
    app.run(host=host, port=port, debug=debug)
```

### Step 7: Create Service Tests

**File:** `tests/services/test_diff_service.py`

```python
"""Tests for diff service."""

import pytest
from unittest.mock import Mock, patch
from difflicious.services.diff_service import DiffService
from difflicious.services.exceptions import DiffServiceError

class TestDiffService:
    def setup_method(self):
        self.service = DiffService()
    
    @patch('difflicious.services.diff_service.get_git_repository')
    def test_get_grouped_diffs_success(self, mock_get_repo):
        """Test successful diff retrieval and processing."""
        # Setup mocks
        mock_repo = Mock()
        mock_get_repo.return_value = mock_repo
        mock_repo.get_diff.return_value = {
            'unstaged': {
                'files': [
                    {
                        'path': 'test.py',
                        'content': 'mock diff content',
                        'status': 'modified',
                        'additions': 5,
                        'deletions': 2,
                        'changes': 7
                    }
                ],
                'count': 1
            }
        }
        
        # Test
        result = self.service.get_grouped_diffs(unstaged=True)
        
        # Assertions
        assert result['unstaged']['count'] == 1
        assert len(result['unstaged']['files']) == 1
        mock_repo.get_diff.assert_called_once()
    
    def test_get_diff_summary(self):
        """Test diff summary generation."""
        # This would test the summary functionality
        pass
```

## Migration Steps

1. **Create service directory structure** and base classes
2. **Implement DiffService** with extracted business logic
3. **Update Flask routes** to use services (keep old function as fallback)
4. **Add comprehensive tests** for service layer
5. **Remove old `get_real_git_diff()` function** after verification
6. **Update imports** and documentation

## Benefits Achieved

- **Testability:** Business logic now unit testable without Flask context
- **Separation of concerns:** HTTP handling separate from business logic
- **Reusability:** Services can be used in CLI tools, tests, or other interfaces
- **Error handling:** Consistent error handling across service layer
- **Maintainability:** Clear data flow and single responsibility

## Success Criteria

- [ ] All Flask routes use service layer instead of direct git operations
- [ ] Service layer has >95% test coverage
- [ ] No functionality regression in API endpoints
- [ ] Response times remain equivalent or improve
- [ ] Services can be instantiated and tested independently
- [ ] Clear error messages propagated to API responses