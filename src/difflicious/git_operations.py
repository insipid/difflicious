"""Secure git command execution wrapper for Difflicious."""

import logging
import os
import re
import subprocess
from pathlib import Path
from typing import Any, Optional, cast

logger = logging.getLogger(__name__)


# Common constants for git operations
COMMON_DEFAULT_BRANCHES = ["main", "master", "trunk"]

# Allowed git options for safety validation
SAFE_GIT_OPTIONS = {
    "--porcelain",
    "--short",
    "--branch",
    "--ahead-behind",
    "--no-renames",
    "--find-renames",
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
SAFE_SHORT_OPTIONS = {"-s", "-b", "-u", "-z", "-n", "-p", "-w", "-a"}


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
        # Validate command arguments (no shell quoting; pass as list)
        sanitized_args = self._sanitize_args(args)

        # Build full command
        cmd = ["git"] + sanitized_args

        logger.debug(f"Executing git command: {' '.join(cmd)}")

        try:
            env = {**os.environ, "GIT_OPTIONAL_LOCKS": "0"}
            result = subprocess.run(
                cmd,
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,  # We'll handle return codes manually
                env=env,
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
        """Validate git command arguments to prevent injection attacks.

        Args:
            args: Raw command arguments

        Returns:
            Validated arguments safe for subprocess execution
        """
        validated_args: list[str] = []
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

            validated_args.append(arg)

        return validated_args

    def _is_safe_git_option(self, option: str) -> bool:
        """Check if a git option is safe to use.

        Args:
            option: Git command option to validate

        Returns:
            True if option is safe, False otherwise
        """
        # Check for -U<number> pattern (unified diff with context lines)
        if re.match(r"^-U\d+$", option):
            return True

        return option in SAFE_GIT_OPTIONS or option in SAFE_SHORT_OPTIONS

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

    def _resolve_base_ref(
        self, use_head: bool = False, preferred_ref: Optional[str] = None
    ) -> str:
        """Resolve the base reference for comparisons.

        If use_head is True, return "HEAD". Otherwise, use preferred_ref if provided
        and valid; fall back to repository default branch; finally to "HEAD".
        """
        if use_head:
            return "HEAD"

        # If an explicit ref is provided and looks safe, try it first
        if preferred_ref and self._is_safe_commit_sha(preferred_ref):
            return str(preferred_ref)

        branches_info = self.get_branches()
        reference_point = branches_info.get("default_branch", "main") or "main"
        if not self._is_safe_commit_sha(str(reference_point)):
            reference_point = "HEAD"
        return str(reference_point)

    def summarize_changes(
        self, include_unstaged: bool = True, include_untracked: bool = True
    ) -> dict[str, Any]:
        """Return counts of changed files without fetching diff contents.

        Returns a dict with the same group keys as get_diff, but only 'count' fields
        populated. This is designed to be efficient for status endpoints.
        """
        summary: dict[str, dict[str, int]] = {
            "untracked": {"count": 0},
            "unstaged": {"count": 0},
            "staged": {"count": 0},
        }

        try:
            # Untracked files
            if include_untracked:
                stdout, _, rc = self._execute_git_command(["status", "--porcelain"])
                if rc == 0 and stdout:
                    summary["untracked"]["count"] = sum(
                        1 for line in stdout.split("\n") if line.startswith("??")
                    )

            # Unstaged changes (working tree vs index)
            if include_unstaged:
                stdout, _, rc = self._execute_git_command(["diff", "--name-only"])
                if rc == 0 and stdout:
                    summary["unstaged"]["count"] = sum(
                        1 for line in stdout.split("\n") if line.strip()
                    )

            # Staged changes (index vs HEAD)
            stdout, _, rc = self._execute_git_command(
                ["diff", "--cached", "--name-only", "HEAD"]
            )
            if rc == 0 and stdout:
                summary["staged"]["count"] = sum(
                    1 for line in stdout.split("\n") if line.strip()
                )

        except GitOperationError as e:
            logger.warning(f"summarize_changes failed: {e}")

        return summary

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
            return os.path.basename(self.repo_path)

        except GitOperationError as e:
            logger.warning(f"Failed to get repository name from remote: {e}")
            # Final fallback to directory name
            return os.path.basename(self.repo_path)

    def get_branches(self) -> dict[str, Any]:
        """Get a list of all local and remote branches."""
        try:
            stdout, _, return_code = self._execute_git_command(["branch", "-a"])
            if return_code != 0:
                return {"branches": [], "default_branch": None}

            branches: list[str] = []
            for raw_line in stdout.strip().split("\n"):
                line = raw_line.strip()
                if not line:
                    continue
                # Skip symbolic-refs like "origin/HEAD -> origin/main"
                if "->" in line:
                    continue

                # Remove common leading decorations from some git configs (e.g., '*', '+', '!')
                # and normalize by taking the first whitespace-delimited token (drops verbose/commit parts)
                cleaned = re.sub(r"^[*+!\s]+", "", line)
                if not cleaned:
                    continue
                token = cleaned.split()[0]

                # Clean up remote branch names
                if token.startswith("remotes/origin/"):
                    token = token[len("remotes/origin/") :]

                if token and token not in branches:
                    branches.append(token)
            default_branch = self.get_main_branch(branches)
            return {"branches": sorted(set(branches)), "default_branch": default_branch}
        except GitOperationError as e:
            logger.error(f"Failed to get branches: {e}")
            return {"branches": [], "default_branch": None}

    def get_main_branch(self, branches: list[str]) -> Optional[str]:
        """Determine the main branch from a list of branches.

        First tries to get the actual default branch from the remote,
        then falls back to common naming conventions.
        """
        # Prefer cached default branch if available
        cached = cast(Optional[str], getattr(self, "_cached_default_branch", None))
        if cached and cached in branches:
            return cached
        # First, try to get the actual default branch from remote
        try:
            # Method 1: git remote show origin
            stdout, stderr, return_code = self._execute_git_command(
                ["remote", "show", "origin"]
            )
            if return_code == 0 and stdout:
                for line in stdout.split("\n"):
                    if "HEAD branch:" in line:
                        default_branch = line.split("HEAD branch:")[1].strip()
                        if default_branch in branches:
                            self._cached_default_branch = default_branch
                            return str(default_branch)
        except GitOperationError:
            pass

        # Method 2: git symbolic-ref for remote HEAD
        try:
            stdout, stderr, return_code = self._execute_git_command(
                ["symbolic-ref", "refs/remotes/origin/HEAD"]
            )
            if return_code == 0 and stdout:
                # Output format: refs/remotes/origin/main
                default_branch = stdout.strip().split("/")[-1]
                if default_branch in branches:
                    self._cached_default_branch = default_branch
                    return str(default_branch)
        except GitOperationError:
            pass

        # Method 3: Check for origin/HEAD in remote branches
        try:
            stdout, stderr, return_code = self._execute_git_command(["branch", "-r"])
            if return_code == 0 and stdout:
                for line in stdout.split("\n"):
                    if "origin/HEAD" in line:
                        # Extract the branch it points to
                        parts = line.strip().split(" -> ")
                        if len(parts) == 2:
                            default_branch = parts[1].replace("origin/", "")
                            if default_branch in branches:
                                self._cached_default_branch = default_branch
                                return str(default_branch)
        except GitOperationError:
            pass

        # Fallback to common naming conventions
        common_defaults = COMMON_DEFAULT_BRANCHES
        for default_branch in common_defaults:
            if default_branch in branches:
                self._cached_default_branch = default_branch
                return str(default_branch)

        # Final fallback: look for a branch with a remote counterpart
        for branch in branches:
            if f"remotes/origin/{branch}" in branches:
                return str(branch)

        return None

    def get_diff(
        self,
        use_head: bool = False,
        include_unstaged: bool = True,
        include_untracked: bool = False,
        file_path: Optional[str] = None,
        base_ref: Optional[str] = None,
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

            # Resolve base reference
            reference_point = self._resolve_base_ref(
                use_head=use_head, preferred_ref=base_ref
            )

            # Untracked files
            if include_untracked:
                stdout, _, rc = self._execute_git_command(["status", "--porcelain"])
                if rc == 0 and stdout:
                    for line in stdout.strip().split("\n"):
                        if line.startswith("??"):
                            fname = line[3:].strip()
                            if not file_path or file_path in fname:
                                groups["untracked"]["files"].append(
                                    {
                                        "path": fname,
                                        "additions": 0,
                                        "deletions": 0,
                                        "changes": 0,
                                        "status": "added",
                                        "content": f"New untracked file: {fname}",
                                    }
                                )
                groups["untracked"]["count"] = len(groups["untracked"]["files"])

            # Unstaged (working tree) vs base
            if include_unstaged:
                base_args_unstaged: list[str] = [] if use_head else [reference_point]
                unstaged_files = self._collect_diff_metadata(
                    base_args_unstaged, file_path
                )
                groups["unstaged"]["files"].extend(unstaged_files)
                groups["unstaged"]["count"] = len(unstaged_files)

            # Staged (index) vs base (HEAD or branch)
            base_args_staged: list[str] = (
                ["--cached", "HEAD"] if use_head else ["--cached", reference_point]
            )
            staged_files = self._collect_diff_metadata(base_args_staged, file_path)
            groups["staged"]["files"].extend(staged_files)
            groups["staged"]["count"] = len(staged_files)

            # For each file, lazily fill content as before
            # Preserve previous behavior: include content strings in results
            for group_name in ("unstaged", "staged"):
                for diff_info in groups[group_name]["files"]:
                    if use_head and group_name == "unstaged":
                        content = self._get_file_diff(
                            diff_info["path"], None, None, False
                        )
                    elif group_name == "staged":
                        content = self._get_file_diff(
                            diff_info["path"], None, None, True
                        )
                    else:
                        content = self._get_file_diff(
                            diff_info["path"], reference_point, None, False
                        )
                    diff_info["content"] = content

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
        """Parse git diff --numstat output.

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
                            "status": "modified",  # Will be updated by caller with actual status
                            "content": "",  # Will be filled by caller
                        }
                    )
                except ValueError:
                    # Skip lines that don't parse correctly
                    continue

        return diffs

    def _get_file_status_map(
        self, use_head: bool = False, reference_point: str = "HEAD"
    ) -> dict[str, str]:
        """Get a mapping of file paths to their git status.

        Args:
            use_head: If True, get status for HEAD comparison, otherwise for branch comparison
            reference_point: The git reference to compare against (e.g. "HEAD", "main")

        Returns:
            Dictionary mapping file paths to status strings (added, modified, deleted, etc.)
        """
        status_map = {}

        # Convert git status codes to readable names
        git_status_map = {
            "M": "modified",
            "A": "added",
            "D": "deleted",
            "R": "renamed",
            "C": "copied",
            "T": "type changed",
            "U": "unmerged",
            "X": "unknown",
        }

        try:
            if use_head:
                # For HEAD comparison, we need both unstaged and staged status

                # Get unstaged changes (working directory vs index)
                unstaged_args = ["diff", "--name-status", "--find-renames"]
                stdout, stderr, return_code = self._execute_git_command(unstaged_args)
                if return_code == 0:
                    for line in stdout.strip().split("\n"):
                        if line.strip():
                            parts = line.split("\t")
                            if len(parts) >= 2:
                                status_code = parts[0]
                                filename = parts[1]
                                status = git_status_map.get(status_code, "modified")
                                status_map[filename] = status

                # Get staged changes (index vs HEAD)
                staged_args = ["diff", "--cached", "--name-status", "--find-renames"]
                stdout, stderr, return_code = self._execute_git_command(staged_args)
                if return_code == 0:
                    for line in stdout.strip().split("\n"):
                        if line.strip():
                            parts = line.split("\t")
                            if len(parts) >= 2:
                                status_code = parts[0]
                                filename = parts[1]
                                status = git_status_map.get(status_code, "modified")
                                # For staged files, don't override unstaged status if it exists
                                if filename not in status_map:
                                    status_map[filename] = status
            else:
                # For branch comparison, get status of working directory vs reference branch
                branch_args = [
                    "diff",
                    "--name-status",
                    "--find-renames",
                    reference_point,
                ]
                stdout, stderr, return_code = self._execute_git_command(branch_args)
                if return_code == 0:
                    for line in stdout.strip().split("\n"):
                        if line.strip():
                            parts = line.split("\t")
                            if len(parts) >= 2:
                                status_code = parts[0]
                                filename = parts[1]
                                status = git_status_map.get(status_code, "modified")
                                status_map[filename] = status

        except Exception as e:
            logger.warning(f"Failed to get file status map: {e}")

        return status_map

    def _collect_diff_metadata(
        self, base_args: list[str], file_path: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Collect per-file additions/deletions and status for a diff invocation.

        Runs git diff twice (numstat and name-status) with the same arguments
        and merges the results.
        """
        # Build args for numstat and name-status
        # Note: Avoid --find-renames to maintain compatibility with tests and
        # mocked expectations that rely on minimal arg lists.
        numstat_args = ["diff", "--numstat", *base_args]
        namestat_args = ["diff", "--name-status", *base_args]

        if file_path:
            if not self._is_safe_file_path(file_path):
                raise GitOperationError(f"Unsafe file path: {file_path}")
            numstat_args.append(file_path)
            namestat_args.append(file_path)

        # Parse numstat output
        numstat_stdout, _, rc_num = self._execute_git_command(numstat_args)
        files = {}
        if rc_num == 0 and numstat_stdout:
            for line in numstat_stdout.strip().split("\n"):
                if not line.strip():
                    continue
                parts = line.split("\t")
                if len(parts) >= 3:
                    add_str, del_str, path = parts[0], parts[1], parts[2]
                    try:
                        additions = int(add_str) if add_str != "-" else 0
                        deletions = int(del_str) if del_str != "-" else 0
                    except ValueError:
                        additions, deletions = 0, 0
                    files[path] = {
                        "path": path,
                        "additions": additions,
                        "deletions": deletions,
                        "changes": additions + deletions,
                        "status": "modified",
                        "content": "",
                    }

        # Parse name-status output
        namestat_stdout, _, rc_ns = self._execute_git_command(namestat_args)
        if rc_ns == 0 and namestat_stdout:
            # Track old paths from renames to filter them out
            old_paths_from_renames = set()

            for line in namestat_stdout.strip().split("\n"):
                if not line.strip():
                    continue
                parts = line.split("\t")
                if len(parts) >= 2:
                    status_code = parts[0]
                    # Handle renames/copies: last column is the new path
                    path = parts[-1]

                    # For renames, track the old path to filter it out later and store it
                    old_path_for_file = None
                    if status_code.startswith("R") and len(parts) >= 3:
                        old_path_for_file = parts[1]  # Second column is the old path
                        old_paths_from_renames.add(old_path_for_file)

                    status_map = {
                        "M": "modified",
                        "A": "added",
                        "D": "deleted",
                        "R": "renamed",
                        "C": "copied",
                        "T": "type changed",
                        "U": "unmerged",
                        "X": "unknown",
                    }
                    status = status_map.get(status_code[0], "modified")
                    if path in files:
                        files[path]["status"] = status
                        if old_path_for_file:
                            files[path]["old_path"] = old_path_for_file
                    else:
                        file_data = {
                            "path": path,
                            "additions": 0,
                            "deletions": 0,
                            "changes": 0,
                            "status": status,
                            "content": "",
                        }
                        if old_path_for_file:
                            file_data["old_path"] = old_path_for_file
                        files[path] = file_data

            # Filter out old paths from renames (they would show as deleted)
            files = {
                path: data
                for path, data in files.items()
                if path not in old_paths_from_renames
            }

        return list(files.values())

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

    def get_full_file_diff(
        self,
        file_path: str,
        base_ref: Optional[str] = None,
        use_head: bool = False,
        use_cached: bool = False,
    ) -> str:
        """Get complete diff content for a specific file with unlimited context.

        Args:
            file_path: Path to the file
            base_ref: Base reference for comparison (branch name or commit)
            use_head: Whether to compare against HEAD instead of branch
            use_cached: Whether to get staged diff

        Returns:
            Complete diff content as string with unlimited context

        Raises:
            GitOperationError: If diff operation fails
        """
        try:
            if not self._is_safe_file_path(file_path):
                raise GitOperationError(f"Unsafe file path: {file_path}")

            diff_args = ["diff"]

            # Use million lines of context for full diff view
            diff_args.append("-U1000000")

            # Determine comparison mode
            if use_cached:
                diff_args.append("--cached")
            elif use_head:
                # Compare working directory vs HEAD
                pass  # No additional args needed
            elif base_ref:
                # Compare working directory vs specified reference
                if not self._is_safe_commit_sha(base_ref):
                    raise GitOperationError(f"Unsafe base reference: {base_ref}")
                diff_args.append(base_ref)
            else:
                # Default to main branch comparison
                branches_info = self.get_branches()
                default_branch = branches_info.get("default_branch", "main")
                if default_branch and self._is_safe_commit_sha(default_branch):
                    diff_args.append(default_branch)

            diff_args.extend(["--no-color", file_path])

            stdout, stderr, return_code = self._execute_git_command(diff_args)

            if return_code != 0 and stderr:
                raise GitOperationError(f"Git diff failed: {stderr}")

            return stdout

        except GitOperationError:
            raise
        except Exception as e:
            raise GitOperationError(f"Failed to get full file diff: {e}") from e

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

            full_path = (self.repo_path / file_path).resolve()
            if not full_path.exists():
                raise GitOperationError(f"File does not exist: {file_path}")

            # Pure Python line counting, memory-efficient
            line_count = 0
            with full_path.open("rb") as f:
                for _ in f:
                    line_count += 1
            return line_count

        except Exception as e:
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

        full_path = (self.repo_path / file_path).resolve()
        if not full_path.is_file():
            raise GitOperationError(f"File not found: {file_path}")

        try:
            # Pure Python slicing
            lines: list[str] = []
            with full_path.open("r", encoding="utf-8", errors="replace") as f:
                for idx, line in enumerate(f, start=1):
                    if idx < start_line:
                        continue
                    if idx > end_line:
                        break
                    lines.append(line.rstrip("\n"))
            return lines

        except Exception as e:
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
