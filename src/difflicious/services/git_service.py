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