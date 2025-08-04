"""Secure git command execution wrapper for Difflicious."""

import logging
import os
import shlex
import subprocess
from pathlib import Path
from typing import Any, Optional

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

    def _execute_git_command(
        self, args: list[str], timeout: int = 30
    ) -> tuple[str, str, int]:
        """Execute a git command with proper security and error handling.

        Args:
            args: List of git command arguments (without 'git' prefix)
            timeout: Command timeout in seconds

        Returns:
            Tuple of (stdout, stderr, return_code)

        Raises:
            GitOperationError: If git command fails or times out
        """
        self._validate_repository()
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
                check=False,  # We'll handle return codes manually
            )

            logger.debug(f"Git command completed with return code: {result.returncode}")
            return result.stdout, result.stderr, result.returncode

        except subprocess.TimeoutExpired:
            raise GitOperationError(
                f"Git command timed out after {timeout}s: {' '.join(cmd)}"
            ) from None
        except FileNotFoundError:
            raise GitOperationError(
                "Git executable not found. Please ensure git is installed."
            ) from None
        except Exception as e:
            raise GitOperationError(f"Failed to execute git command: {e}") from e

    def _sanitize_args(self, args: list[str]) -> list[str]:
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
            if any(
                char in arg for char in [";", "|", "&", "`", "$", "(", ")", ">", "<"]
            ):
                raise GitOperationError(
                    f"Dangerous characters detected in argument: {arg}"
                )

            # Prevent command injection via git options
            if arg.startswith("-") and not self._is_safe_git_option(arg):
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
        import re

        safe_options = {
            "--porcelain",
            "--short",
            "--branch",
            "--ahead-behind",
            "--no-renames",
            "--name-only",
            "--name-status",
            "--numstat",
            "--stat",
            "--patch",
            "--no-patch",
            "--raw",
            "--format",
            "--oneline",
            "--graph",
            "--decorate",
            "--all",
            "--color",
            "--no-color",
            "--word-diff",
            "--unified",
            "--context",
            "--show-current",
            "--cached",
            "--verify",
        }

        # Allow safe single-dash options
        safe_short_options = {"-s", "-b", "-u", "-z", "-n", "-p", "-w", "-a"}

        # Check for -U<number> pattern (unified diff with context lines)
        if re.match(r"^-U\d+$", option):
            return True

        return option in safe_options or option in safe_short_options

    def get_status(self) -> dict[str, Any]:
        """Get git repository status information.

        Returns:
            Dictionary containing git status information
        """
        try:
            # Get basic repository info
            current_branch = self.get_current_branch()

            # Get repository status
            status_stdout, _, status_code = self._execute_git_command(
                ["status", "--porcelain"]
            )

            # Parse status output
            files_changed = 0
            if status_code == 0:
                files_changed = len(
                    [line for line in status_stdout.strip().split("\n") if line.strip()]
                )

            # Check if git is available and working
            git_available = current_branch != "error" or status_code == 0

            return {
                "git_available": git_available,
                "current_branch": current_branch,
                "files_changed": files_changed,
                "repository_path": str(self.repo_path),
                "is_clean": files_changed == 0,
            }

        except GitOperationError as e:
            logger.error(f"Failed to get git status: {e}")
            return {
                "git_available": False,
                "current_branch": "error",
                "files_changed": 0,
                "repository_path": str(self.repo_path),
                "is_clean": True,
                "error": str(e),
            }

    def get_current_branch(self) -> str:
        """Get the currently checked-out branch."""
        try:
            stdout, _, return_code = self._execute_git_command(
                ["branch", "--show-current"]
            )
            if return_code == 0:
                return stdout.strip()
            return "unknown"
        except GitOperationError as e:
            logger.error(f"Failed to get current branch: {e}")
            return "error"

    def get_repository_name(self) -> str:
        """Get the repository name.

        Returns:
            Repository name derived from remote URL or directory name
        """
        try:
            # First try to get from remote origin URL
            stdout, stderr, return_code = self._execute_git_command(
                ["remote", "get-url", "origin"]
            )
            if return_code == 0 and stdout.strip():
                remote_url = stdout.strip()
                # Extract repo name from various URL formats:
                # https://github.com/user/repo.git -> repo
                # git@github.com:user/repo.git -> repo
                # /path/to/repo -> repo
                if remote_url.endswith(".git"):
                    remote_url = remote_url[:-4]
                repo_name = remote_url.split("/")[-1]
                if repo_name:
                    return repo_name

            # Fallback to directory name
            import os

            return os.path.basename(self.repo_path)

        except GitOperationError as e:
            logger.warning(f"Failed to get repository name from remote: {e}")
            # Final fallback to directory name
            import os

            return os.path.basename(self.repo_path)

    def get_branches(self) -> dict[str, Any]:
        """Get a list of all local and remote branches."""
        try:
            stdout, _, return_code = self._execute_git_command(["branch", "-a"])
            if return_code != 0:
                return {"branches": [], "default_branch": None}

            branches = []
            for line in stdout.strip().split("\n"):
                branch_name = line.strip()
                if "->" in branch_name:
                    continue
                if branch_name.startswith("* "):
                    branch_name = branch_name[2:]

                # Clean up remote branch names
                if branch_name.startswith("remotes/origin/"):
                    branch_name = branch_name[len("remotes/origin/") :]

                if branch_name not in branches:
                    branches.append(branch_name)
            default_branch = self.get_main_branch(branches)
            return {"branches": sorted(set(branches)), "default_branch": default_branch}
        except GitOperationError as e:
            logger.error(f"Failed to get branches: {e}")
            return {"branches": [], "default_branch": None}

    def get_main_branch(self, branches: list[str]) -> Optional[str]:
        """Determine the main branch from a list of branches."""
        if "main" in branches:
            return "main"
        if "master" in branches:
            return "master"

        # Fallback: look for a branch with a remote counterpart
        for branch in branches:
            if f"remotes/origin/{branch}" in branches:
                return branch

        return None

    def get_diff(
        self,
        use_head: bool = False,
        include_unstaged: bool = True,
        include_untracked: bool = False,
        file_path: Optional[str] = None,
    ) -> dict[str, Any]:
        """Get git diff information comparing working directory to a reference point.

        Args:
            use_head: If True, compare against HEAD. If False, compare against default branch.
            include_unstaged: If True, include unstaged changes in the output.
            include_untracked: If True, include untracked files in the output.
            file_path: Optional specific file to diff

        Returns:
            Dictionary containing grouped diff information
        """
        try:
            groups: dict[str, dict[str, Any]] = {
                "untracked": {"files": [], "count": 0},
                "unstaged": {"files": [], "count": 0},
                "staged": {"files": [], "count": 0},
            }

            # Determine reference point
            if use_head:
                reference_point = "HEAD"
            else:
                # Use default branch (main/master)
                branches_info = self.get_branches()
                reference_point = branches_info.get("default_branch", "main")
                if not self._is_safe_commit_sha(reference_point):
                    # Fallback to HEAD if default branch doesn't exist
                    reference_point = "HEAD"

            # Validate reference point
            if not self._is_safe_commit_sha(reference_point):
                raise GitOperationError(f"Invalid reference point: {reference_point}")

            # Get untracked files if requested
            if include_untracked:
                status_args = ["status", "--porcelain"]
                stdout, stderr, return_code = self._execute_git_command(status_args)
                if return_code == 0:
                    for line in stdout.strip().split("\n"):
                        if line.strip() and line.startswith("??"):
                            file_name = line[3:].strip()
                            if not file_path or file_path in file_name:
                                groups["untracked"]["files"].append(
                                    {
                                        "path": file_name,
                                        "additions": 0,
                                        "deletions": 0,
                                        "changes": 0,
                                        "status": "untracked",
                                        "content": f"New untracked file: {file_name}",
                                    }
                                )
                groups["untracked"]["count"] = len(groups["untracked"]["files"])

            # Get unstaged changes if requested
            if include_unstaged:
                if use_head:
                    # For HEAD comparison: show only working directory vs index (true unstaged)
                    diff_args = ["diff", "--numstat"]  # No reference point = working dir vs index
                else:
                    # For branch comparison: show working directory vs branch (staged + unstaged vs branch)
                    diff_args = ["diff", "--numstat", reference_point]
                    
                if file_path:
                    if not self._is_safe_file_path(file_path):
                        raise GitOperationError(f"Unsafe file path: {file_path}")
                    diff_args.append(file_path)

                stdout, stderr, return_code = self._execute_git_command(diff_args)
                if return_code != 0 and stderr:
                    logger.warning(f"Git diff warning: {stderr}")

                unstaged_diffs = self._parse_diff_output(stdout)
                for diff_info in unstaged_diffs:
                    if use_head:
                        # For HEAD comparison: get diff of working dir vs index
                        detailed_diff = self._get_file_diff(
                            diff_info["path"], None, None, False
                        )
                    else:
                        # For branch comparison: get diff of working dir vs branch
                        detailed_diff = self._get_file_diff(
                            diff_info["path"], reference_point, None, False
                        )
                    diff_info["content"] = detailed_diff
                    diff_info["status"] = "unstaged"
                    groups["unstaged"]["files"].append(diff_info)
                groups["unstaged"]["count"] = len(groups["unstaged"]["files"])

            # Always check for staged changes
            staged_args = ["diff", "--cached", "--numstat"]
            if file_path:
                if not self._is_safe_file_path(file_path):
                    raise GitOperationError(f"Unsafe file path: {file_path}")
                staged_args.append(file_path)

            stdout, stderr, return_code = self._execute_git_command(staged_args)
            if return_code == 0:  # Don't warn for staged diffs, often empty
                staged_diffs = self._parse_diff_output(stdout)
                for diff_info in staged_diffs:
                    detailed_diff = self._get_file_diff(
                        diff_info["path"], None, None, True
                    )
                    diff_info["content"] = detailed_diff
                    diff_info["status"] = "staged"
                    groups["staged"]["files"].append(diff_info)
                groups["staged"]["count"] = len(groups["staged"]["files"])

            return groups

        except GitOperationError as e:
            logger.error(f"Failed to get git diff: {e}")
            return {
                "untracked": {"files": [], "count": 0},
                "unstaged": {"files": [], "count": 0},
                "staged": {"files": [], "count": 0},
            }

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
        if any(
            char in sha for char in [";", "|", "&", "`", "$", "(", ")", ">", "<", " "]
        ):
            return False

        # Must be reasonable length (branch names, tags, or SHAs)
        if len(sha) < 1 or len(sha) > 100:
            return False

        # Check if it's a valid git reference
        try:
            _, _, return_code = self._execute_git_command(
                ["rev-parse", "--verify", sha]
            )
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

    def _parse_diff_output(self, output: str) -> list[dict[str, Any]]:
        """Parse git diff --numstat --name-status output.

        Args:
            output: Raw git diff output

        Returns:
            List of file diff information
        """
        diffs: list[dict[str, Any]] = []

        if not output.strip():
            return diffs

        lines = output.strip().split("\n")

        for line in lines:
            if not line.strip():
                continue

            # Parse numstat format: "additions\tdeletions\tfilename"
            parts = line.split("\t")
            if len(parts) >= 3:
                try:
                    additions = int(parts[0]) if parts[0] != "-" else 0
                    deletions = int(parts[1]) if parts[1] != "-" else 0
                    filename = parts[2]

                    diffs.append(
                        {
                            "path": filename,
                            "additions": additions,
                            "deletions": deletions,
                            "changes": additions + deletions,
                            "status": "modified",  # TODO: Parse actual status
                            "content": "",  # Will be filled by caller
                        }
                    )
                except ValueError:
                    # Skip lines that don't parse correctly
                    continue

        return diffs

    def _get_file_diff(
        self,
        file_path: str,
        base_commit: Optional[str] = None,
        target_commit: Optional[str] = None,
        use_cached: bool = False,
        context_lines: int = 3,
    ) -> str:
        """Get detailed diff content for a specific file.

        Args:
            file_path: Path to the file
            base_commit: Base commit to compare from
            target_commit: Target commit to compare to
            use_cached: Whether to get staged diff (used when no commits specified)
            context_lines: Number of context lines to include (default: 3)

        Returns:
            Diff content as string
        """
        try:
            if not self._is_safe_file_path(file_path):
                return f"Error: Unsafe file path: {file_path}"

            diff_args = ["diff"]

            # Add context lines argument
            diff_args.append(f"-U{context_lines}")

            # Handle commit comparison (same logic as main get_diff method)
            if base_commit or target_commit:
                if base_commit and target_commit:
                    diff_args.extend([base_commit, target_commit])
                elif base_commit:
                    diff_args.append(base_commit)
            else:
                if use_cached:
                    diff_args.append("--cached")

            diff_args.extend(["--no-color", file_path])

            stdout, stderr, return_code = self._execute_git_command(diff_args)

            if return_code != 0 and stderr:
                return f"Error getting diff: {stderr}"

            return stdout

        except GitOperationError as e:
            return f"Error: {e}"

    def get_file_line_count(self, file_path: str) -> int:
        """Get the total number of lines in a file.

        Args:
            file_path: Path to the file

        Returns:
            Number of lines in the file

        Raises:
            GitOperationError: If file cannot be read or counted
        """
        try:
            if not self._is_safe_file_path(file_path):
                raise GitOperationError(f"Unsafe file path: {file_path}")

            # Use wc -l to count lines
            import subprocess

            full_path = self.repo_path / file_path
            if not full_path.exists():
                raise GitOperationError(f"File does not exist: {file_path}")

            result = subprocess.run(
                ["wc", "-l", str(full_path)], capture_output=True, text=True, timeout=5
            )

            if result.returncode != 0:
                raise GitOperationError(f"Failed to count lines: {result.stderr}")

            # wc -l output format: "   123 filename"
            line_count = int(result.stdout.strip().split()[0])
            return line_count

        except (
            subprocess.TimeoutExpired,
            subprocess.CalledProcessError,
            ValueError,
        ) as e:
            raise GitOperationError(f"Failed to get file line count: {e}") from e

    def get_file_lines(
        self, file_path: str, start_line: int, end_line: int
    ) -> list[str]:
        """Get specific lines from a file using fast bash tools.

        Args:
            file_path: Path to the file relative to repository root
            start_line: Starting line number (1-based, inclusive)
            end_line: Ending line number (1-based, inclusive)

        Returns:
            List of lines from the file

        Raises:
            GitOperationError: If operation fails
        """
        if start_line < 1 or end_line < start_line:
            raise GitOperationError(f"Invalid line range: {start_line}-{end_line}")

        # Sanitize file path
        if not self._is_safe_file_path(file_path):
            raise GitOperationError(f"Unsafe file path: {file_path}")

        full_path = os.path.join(self.repo_path, file_path)
        if not os.path.isfile(full_path):
            raise GitOperationError(f"File not found: {file_path}")

        try:
            # Use sed for efficient line extraction: sed -n 'start,end p' file
            # This is faster than head/tail combination for random ranges
            cmd = ["sed", "-n", f"{start_line},{end_line}p", full_path]

            result = subprocess.run(
                cmd,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=30,
                check=True,
            )

            # Return lines, preserving empty lines but removing final newline if present
            lines = result.stdout.splitlines()
            return lines

        except (subprocess.TimeoutExpired, subprocess.CalledProcessError) as e:
            raise GitOperationError(
                f"Failed to get file lines {start_line}-{end_line}: {e}"
            ) from e


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
