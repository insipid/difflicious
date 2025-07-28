"""Secure git command execution wrapper for Difflicious."""

import subprocess
import shlex
import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path


logger = logging.getLogger(__name__)


class GitOperationError(Exception):
    """Exception raised when git operations fail."""
    pass


class GitRepository:
    """Secure wrapper for git operations with subprocess sanitization."""

    def __init__(self, repo_path: Optional[str] = None):
        """Initialize git repository wrapper.

        Args:
            repo_path: Path to git repository. Defaults to current working directory.
        """
        self.repo_path = Path(repo_path) if repo_path else Path.cwd()
        self._validate_repository()

    def _validate_repository(self) -> None:
        """Validate that the path contains a git repository."""
        if not self.repo_path.exists():
            raise GitOperationError(f"Repository path does not exist: {self.repo_path}")

        git_dir = self.repo_path / ".git"
        if not (git_dir.exists() or (self.repo_path / ".git").is_file()):
            raise GitOperationError(f"Not a git repository: {self.repo_path}")

    def _execute_git_command(self, args: List[str], timeout: int = 30) -> Tuple[str, str, int]:
        """Execute a git command with proper security and error handling.

        Args:
            args: List of git command arguments (without 'git' prefix)
            timeout: Command timeout in seconds

        Returns:
            Tuple of (stdout, stderr, return_code)

        Raises:
            GitOperationError: If git command fails or times out
        """
        # Sanitize command arguments
        sanitized_args = self._sanitize_args(args)

        # Build full command
        cmd = ["git"] + sanitized_args

        logger.debug(f"Executing git command: {' '.join(cmd)}")

        try:
            result = subprocess.run(
                cmd,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False  # We'll handle return codes manually
            )

            logger.debug(f"Git command completed with return code: {result.returncode}")
            return result.stdout, result.stderr, result.returncode

        except subprocess.TimeoutExpired as e:
            raise GitOperationError(f"Git command timed out after {timeout}s: {' '.join(cmd)}")
        except FileNotFoundError:
            raise GitOperationError("Git executable not found. Please ensure git is installed.")
        except Exception as e:
            raise GitOperationError(f"Failed to execute git command: {e}")

    def _sanitize_args(self, args: List[str]) -> List[str]:
        """Sanitize git command arguments to prevent injection attacks.

        Args:
            args: Raw command arguments

        Returns:
            Sanitized arguments safe for subprocess execution
        """
        sanitized = []
        for arg in args:
            if not isinstance(arg, str):
                raise GitOperationError(f"Invalid argument type: {type(arg)}")

            # Remove dangerous characters and patterns
            if any(char in arg for char in [';', '|', '&', '`', '$', '(', ')', '>', '<']):
                raise GitOperationError(f"Dangerous characters detected in argument: {arg}")

            # Prevent command injection via git options
            if arg.startswith('-') and not self._is_safe_git_option(arg):
                raise GitOperationError(f"Unsafe git option: {arg}")

            sanitized.append(shlex.quote(arg))

        return sanitized

    def _is_safe_git_option(self, option: str) -> bool:
        """Check if a git option is safe to use.

        Args:
            option: Git command option to validate

        Returns:
            True if option is safe, False otherwise
        """
        safe_options = {
            '--porcelain', '--short', '--branch', '--ahead-behind',
            '--no-renames', '--name-only', '--name-status', '--numstat',
            '--stat', '--patch', '--no-patch', '--raw', '--format',
            '--oneline', '--graph', '--decorate', '--all', '--color',
            '--no-color', '--word-diff', '--unified', '--context',
            '--show-current', '--cached', '--verify'
        }

        # Allow safe single-dash options
        safe_short_options = {'-s', '-b', '-u', '-z', '-n', '-p', '-w', '-a'}

        return option in safe_options or option in safe_short_options

    def get_status(self) -> Dict[str, Any]:
        """Get git repository status information.

        Returns:
            Dictionary containing git status information
        """
        try:
            # Get basic repository info
            current_branch = self.get_current_branch()

            # Get repository status
            status_stdout, _, status_code = self._execute_git_command(['status', '--porcelain'])

            # Parse status output
            files_changed = 0
            if status_code == 0:
                files_changed = len([line for line in status_stdout.strip().split('\n') if line.strip()])

            # Check if git is available and working
            git_available = current_branch != 'error' or status_code == 0

            return {
                'git_available': git_available,
                'current_branch': current_branch,
                'files_changed': files_changed,
                'repository_path': str(self.repo_path),
                'is_clean': files_changed == 0
            }

        except GitOperationError as e:
            logger.error(f"Failed to get git status: {e}")
            return {
                'git_available': False,
                'current_branch': 'error',
                'files_changed': 0,
                'repository_path': str(self.repo_path),
                'is_clean': True,
                'error': str(e)
            }

    def get_current_branch(self) -> str:
        """Get the currently checked-out branch."""
        try:
            stdout, _, return_code = self._execute_git_command(['branch', '--show-current'])
            if return_code == 0:
                return stdout.strip()
            return 'unknown'
        except GitOperationError as e:
            logger.error(f"Failed to get current branch: {e}")
            return 'error'

    def get_branches(self) -> List[str]:
        """Get a list of all local and remote branches."""
        try:
            stdout, _, return_code = self._execute_git_command(['branch', '-a'])
            if return_code != 0:
                return []

            branches = []
            for line in stdout.strip().split('\n'):
                branch_name = line.strip()
                if '->' in branch_name:
                    continue
                if branch_name.startswith('* '):
                    branch_name = branch_name[2:]

                # Clean up remote branch names
                if branch_name.startswith('remotes/origin/'):
                    branch_name = branch_name[len('remotes/origin/'):]

                if branch_name not in branches:
                    branches.append(branch_name)
            return sorted(list(set(branches)))
        except GitOperationError as e:
            logger.error(f"Failed to get branches: {e}")
            return []

    def get_main_branch(self, branches: List[str]) -> Optional[str]:
        """Determine the main branch from a list of branches."""
        if 'main' in branches:
            return 'main'
        if 'master' in branches:
            return 'master'

        # Fallback: look for a branch with a remote counterpart
        for branch in branches:
            if f'remotes/origin/{branch}' in branches:
                return branch

        return None


    def get_diff(self,
                 base_commit: Optional[str] = None,
                 target_commit: Optional[str] = None,
                 staged: bool = False,
                 file_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get git diff information between two commits or working directory.

        Args:
            base_commit: Base commit SHA to compare from. Defaults to 'main' if target_commit specified.
            target_commit: Target commit SHA to compare to. Defaults to working directory.
            staged: If True, get staged changes (only used when no commits specified).
            file_path: Optional specific file to diff

        Returns:
            List of dictionaries containing diff information for each file
        """
        try:
            # Build diff command
            diff_args = ['diff']

            # Handle commit comparison
            if base_commit or target_commit:
                # If comparing commits, validate them
                if base_commit:
                    if not self._is_safe_commit_sha(base_commit):
                        raise GitOperationError(f"Invalid or unsafe base commit: {base_commit}")
                else:
                    # Default to main if target_commit is specified
                    base_commit = 'main'
                    if not self._is_safe_commit_sha(base_commit):
                        # Fallback to HEAD if main doesn't exist
                        base_commit = 'HEAD'

                if target_commit:
                    if not self._is_safe_commit_sha(target_commit):
                        raise GitOperationError(f"Invalid or unsafe target commit: {target_commit}")
                    diff_args.extend([base_commit, target_commit])
                else:
                    # Compare base_commit to working directory
                    diff_args.append(base_commit)
            else:
                # Traditional staged/working directory diff
                if staged:
                    diff_args.append('--cached')

            # Add safe diff options
            diff_args.append('--numstat')

            if file_path:
                # Validate file path is within repository
                if not self._is_safe_file_path(file_path):
                    raise GitOperationError(f"Unsafe file path: {file_path}")
                diff_args.append(file_path)

            # Execute diff command
            stdout, stderr, return_code = self._execute_git_command(diff_args)

            if return_code != 0 and stderr:
                logger.warning(f"Git diff warning: {stderr}")

            # Parse diff output
            diffs = self._parse_diff_output(stdout)

            # Get detailed diff for each file
            for diff_info in diffs:
                detailed_diff = self._get_file_diff(diff_info['file'], base_commit, target_commit, staged)
                diff_info['content'] = detailed_diff

            return diffs

        except GitOperationError as e:
            logger.error(f"Failed to get git diff: {e}")
            return []

    def _is_safe_commit_sha(self, sha: str) -> bool:
        """Validate that a commit SHA is safe to use.

        Args:
            sha: Commit SHA or reference to validate

        Returns:
            True if SHA is safe, False otherwise
        """
        if not isinstance(sha, str):
            return False

        # Allow branch names, tag names, and SHAs
        # Reject dangerous characters
        if any(char in sha for char in [';', '|', '&', '`', '$', '(', ')', '>', '<', ' ']):
            return False

        # Must be reasonable length (branch names, tags, or SHAs)
        if len(sha) < 1 or len(sha) > 100:
            return False

        # Check if it's a valid git reference
        try:
            _, _, return_code = self._execute_git_command(['rev-parse', '--verify', sha])
            return return_code == 0
        except GitOperationError:
            return False

    def _is_safe_file_path(self, file_path: str) -> bool:
        """Validate that a file path is safe and within the repository.

        Args:
            file_path: File path to validate

        Returns:
            True if path is safe, False otherwise
        """
        try:
            # Resolve path relative to repository
            full_path = (self.repo_path / file_path).resolve()

            # Ensure path is within repository
            return str(full_path).startswith(str(self.repo_path.resolve()))

        except Exception:
            return False

    def _parse_diff_output(self, output: str) -> List[Dict[str, Any]]:
        """Parse git diff --numstat --name-status output.

        Args:
            output: Raw git diff output

        Returns:
            List of file diff information
        """
        diffs = []

        if not output.strip():
            return diffs

        lines = output.strip().split('\n')

        for line in lines:
            if not line.strip():
                continue

            # Parse numstat format: "additions\tdeletions\tfilename"
            parts = line.split('\t')
            if len(parts) >= 3:
                try:
                    additions = int(parts[0]) if parts[0] != '-' else 0
                    deletions = int(parts[1]) if parts[1] != '-' else 0
                    filename = parts[2]

                    diffs.append({
                        'file': filename,
                        'additions': additions,
                        'deletions': deletions,
                        'changes': additions + deletions,
                        'status': 'modified',  # TODO: Parse actual status
                        'content': ''  # Will be filled by caller
                    })
                except ValueError:
                    # Skip lines that don't parse correctly
                    continue

        return diffs

    def _get_file_diff(self, file_path: str, base_commit: Optional[str] = None,
                       target_commit: Optional[str] = None, staged: bool = False) -> str:
        """Get detailed diff content for a specific file.

        Args:
            file_path: Path to the file
            base_commit: Base commit to compare from
            target_commit: Target commit to compare to
            staged: Whether to get staged or working directory diff (used when no commits specified)

        Returns:
            Diff content as string
        """
        try:
            if not self._is_safe_file_path(file_path):
                return f"Error: Unsafe file path: {file_path}"

            diff_args = ['diff']

            # Handle commit comparison (same logic as main get_diff method)
            if base_commit or target_commit:
                if base_commit and target_commit:
                    diff_args.extend([base_commit, target_commit])
                elif base_commit:
                    diff_args.append(base_commit)
            else:
                if staged:
                    diff_args.append('--cached')

            diff_args.extend(['--no-color', file_path])

            stdout, stderr, return_code = self._execute_git_command(diff_args)

            if return_code != 0 and stderr:
                return f"Error getting diff: {stderr}"

            return stdout

        except GitOperationError as e:
            return f"Error: {e}"


def get_git_repository(repo_path: Optional[str] = None) -> GitRepository:
    """Factory function to create a GitRepository instance.

    Args:
        repo_path: Optional path to git repository

    Returns:
        GitRepository instance

    Raises:
        GitOperationError: If repository is invalid
    """
    return GitRepository(repo_path)
