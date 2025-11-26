"""Git operations wrapper using GitPython library.

All git operations use GitPython's semantic API for type-safe, Pythonic access
to git repositories. No subprocess calls or command-line parsing.
"""

import logging
import os
from pathlib import Path
from typing import Any, Optional, cast

from git import InvalidGitRepositoryError, Repo
from git.exc import GitCommandError, NoSuchPathError

from difflicious.config import DEFAULT_CONTEXT_LINES

logger = logging.getLogger(__name__)


# Common default branch names for fallback detection
COMMON_DEFAULT_BRANCHES = ["main", "master", "trunk"]


class GitOperationError(Exception):
    """Exception raised when git operations fail."""

    pass


class GitRepository:
    """GitPython-based wrapper for git operations."""

    def __init__(self, repo_path: Optional[str] = None):
        """Initialize git repository wrapper.

        Args:
            repo_path: Path to git repository. Defaults to current working directory.
        """
        self.repo_path = Path(repo_path) if repo_path else Path.cwd()
        try:
            self.repo = Repo(str(self.repo_path))
        except InvalidGitRepositoryError as e:
            raise GitOperationError(f"Not a git repository: {self.repo_path}") from e
        except NoSuchPathError as e:
            raise GitOperationError(
                f"Repository path does not exist: {self.repo_path}"
            ) from e

    def get_status(self) -> dict[str, Any]:
        """Get git repository status information.

        Returns:
            Dictionary containing git status information
        """
        try:
            # Get basic repository info
            current_branch = self.get_current_branch()

            # Count changed files (staged + unstaged + untracked)
            files_changed = 0

            # Count unstaged changes
            unstaged_diffs = self.repo.index.diff(None)
            files_changed += len(unstaged_diffs)

            # Count staged changes
            try:
                staged_diffs = self.repo.index.diff("HEAD")
                files_changed += len(staged_diffs)
            except GitCommandError:
                # No HEAD yet (empty repo)
                pass

            # Count untracked files
            files_changed += len(self.repo.untracked_files)

            # Check if git is available and working
            git_available = current_branch != "error"

            return {
                "git_available": git_available,
                "current_branch": current_branch,
                "files_changed": files_changed,
                "repository_path": str(self.repo_path),
                "is_clean": files_changed == 0,
            }

        except Exception as e:
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
                summary["untracked"]["count"] = len(self.repo.untracked_files)

            # Unstaged changes (working tree vs index)
            if include_unstaged:
                unstaged_diffs = self.repo.index.diff(None)
                summary["unstaged"]["count"] = len(unstaged_diffs)

            # Staged changes (index vs HEAD)
            try:
                staged_diffs = self.repo.index.diff("HEAD")
                summary["staged"]["count"] = len(staged_diffs)
            except GitCommandError:
                # No HEAD yet (empty repo)
                pass

        except Exception as e:
            logger.warning(f"summarize_changes failed: {e}")

        return summary

    def get_current_branch(self) -> str:
        """Get the currently checked-out branch."""
        try:
            # Check if HEAD is detached
            if self.repo.head.is_detached:
                return "detached"
            return self.repo.active_branch.name
        except Exception as e:
            logger.error(f"Failed to get current branch: {e}")
            return "error"

    def get_repository_name(self) -> str:
        """Get the repository name.

        Returns:
            Repository name derived from remote URL or directory name
        """
        try:
            # First try to get from remote origin URL
            if "origin" in self.repo.remotes:
                remote_url = self.repo.remotes.origin.url
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

        except Exception as e:
            logger.warning(f"Failed to get repository name from remote: {e}")
            # Final fallback to directory name
            return os.path.basename(self.repo_path)

    def get_branches(self) -> dict[str, Any]:
        """Get a list of all local and remote branches."""
        try:
            branches: list[str] = []

            # Get local branches
            for branch in self.repo.branches:
                branches.append(branch.name)

            # Get remote branches (from origin)
            if "origin" in self.repo.remotes:
                for ref in self.repo.remotes.origin.refs:
                    # Skip HEAD symbolic ref
                    if ref.name == "origin/HEAD":
                        continue
                    # Remove 'origin/' prefix
                    branch_name = ref.name.replace("origin/", "")
                    if branch_name and branch_name not in branches:
                        branches.append(branch_name)

            default_branch = self.get_main_branch(branches)
            return {"branches": sorted(set(branches)), "default_branch": default_branch}
        except Exception as e:
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

        # Try to get HEAD symbolic ref from origin
        try:
            if "origin" in self.repo.remotes:
                # Check if origin/HEAD exists and where it points
                for ref in self.repo.remotes.origin.refs:
                    if ref.name == "origin/HEAD":
                        # Get the branch it points to
                        try:
                            symbolic_ref = ref.reference
                            default_branch = symbolic_ref.name.replace("origin/", "")
                            if default_branch in branches:
                                self._cached_default_branch = default_branch
                                return str(default_branch)
                        except Exception:
                            continue
        except Exception as e:
            # Could not determine default branch from remote; will fall back to naming conventions.
            logger.debug(f"Failed to get default branch from remote: {e}")

        # Fallback to common naming conventions
        common_defaults = COMMON_DEFAULT_BRANCHES
        for default_branch in common_defaults:
            if default_branch in branches:
                self._cached_default_branch = default_branch
                return str(default_branch)

        # Final fallback: return first branch if any exist
        if branches:
            return str(branches[0])

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
                for fname in self.repo.untracked_files:
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

        # Check if it's a valid git reference using GitPython
        try:
            self.repo.commit(sha)
            return True
        except Exception:
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

    def _get_file_status_map(
        self, use_head: bool = False, reference_point: str = "HEAD"
    ) -> dict[str, str]:
        """Get a mapping of file paths to their git status.

        Uses GitPython Diff objects to build status map.

        Args:
            use_head: If True, get status for HEAD comparison, otherwise for branch comparison
            reference_point: The git reference to compare against (e.g. "HEAD", "main")

        Returns:
            Dictionary mapping file paths to status strings (added, modified, deleted, etc.)
        """
        status_map: dict[str, str] = {}
        change_type_map = {
            "M": "modified",
            "A": "added",
            "D": "deleted",
            "R": "renamed",
            "C": "copied",
            "T": "type changed",
        }

        try:
            if use_head:
                # For HEAD comparison, we need both unstaged and staged status

                # Get unstaged changes (working directory vs index)
                unstaged_diffs = self.repo.index.diff(None)
                for diff in unstaged_diffs:
                    file_path = diff.b_path if diff.b_path else diff.a_path
                    if file_path and diff.change_type:
                        status = change_type_map.get(diff.change_type, "modified")
                        status_map[file_path] = status

                # Get staged changes (index vs HEAD)
                try:
                    staged_diffs = self.repo.index.diff("HEAD")
                    for diff in staged_diffs:
                        file_path = diff.b_path if diff.b_path else diff.a_path
                        # For staged files, don't override unstaged status if it exists
                        if (
                            file_path
                            and diff.change_type
                            and file_path not in status_map
                        ):
                            status = change_type_map.get(diff.change_type, "modified")
                            status_map[file_path] = status
                except GitCommandError:
                    # No HEAD yet (empty repo)
                    pass
            else:
                # For branch comparison, get status of working directory vs reference branch
                diffs = self.repo.commit(reference_point).diff(None)
                for diff in diffs:
                    file_path = diff.b_path if diff.b_path else diff.a_path
                    if file_path and diff.change_type:
                        status = change_type_map.get(diff.change_type, "modified")
                        status_map[file_path] = status

        except Exception as e:
            logger.warning(f"Failed to get file status map: {e}")

        return status_map

    def _collect_diff_metadata(
        self, base_args: list[str], file_path: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Collect per-file additions/deletions and status for a diff invocation.

        Uses GitPython Diff objects instead of parsing git command output.

        Args:
            base_args: Arguments that determine what to compare
                - [] or empty: unstaged (working tree vs index)
                - ["--cached", "HEAD"]: staged (index vs HEAD)
                - ["--cached", ref]: staged (index vs ref)
                - [ref]: working tree vs ref
            file_path: Optional specific file to diff

        Returns:
            List of file metadata dictionaries
        """
        if file_path and not self._is_safe_file_path(file_path):
            raise GitOperationError(f"Unsafe file path: {file_path}")

        try:
            # Determine which diffs to get based on base_args
            diffs = None

            if not base_args or base_args == []:
                # Unstaged: working tree vs index
                diffs = self.repo.index.diff(None)
            elif "--cached" in base_args:
                # Staged: compare commit to index (not index to commit)
                # This ensures deletions show as "D" not "A"
                if len(base_args) == 1 or (
                    len(base_args) > 1 and str(base_args[1]).startswith("-")
                ):
                    commit_ref = "HEAD"
                else:
                    commit_ref = base_args[1]
                diffs = self.repo.commit(commit_ref).diff()
            else:
                # Working tree vs specific commit
                commit_ref = base_args[0]
                diffs = self.repo.commit(commit_ref).diff(None)

            if diffs is None:
                return []

            # Build file metadata from Diff objects
            files_dict = {}
            old_paths_from_renames = set()

            for diff in diffs:
                # Get file path (use b_path for new/modified, a_path for deleted)
                file_path_str = diff.b_path if diff.b_path else diff.a_path
                if not file_path_str:
                    continue

                # Filter by file_path if specified
                if file_path and file_path not in file_path_str:
                    continue

                # Map GitPython change types to our status strings
                change_type_map = {
                    "A": "added",
                    "D": "deleted",
                    "M": "modified",
                    "R": "renamed",
                    "T": "type changed",
                }
                status = change_type_map.get(
                    diff.change_type if diff.change_type else "M", "modified"
                )

                # Get stats (additions/deletions)
                additions = 0
                deletions = 0
                try:
                    # Stats may not be available for all diff types
                    if hasattr(diff, "diff") and diff.diff:
                        # Parse the diff to count lines
                        diff_text = (
                            diff.diff.decode("utf-8")
                            if isinstance(diff.diff, bytes)
                            else diff.diff
                        )
                        for line in diff_text.split("\n"):
                            if line.startswith("+") and not line.startswith("+++"):
                                additions += 1
                            elif line.startswith("-") and not line.startswith("---"):
                                deletions += 1
                except Exception:
                    # If we can't get stats, leave as 0
                    pass

                # Build file metadata
                file_data = {
                    "path": file_path_str,
                    "additions": additions,
                    "deletions": deletions,
                    "changes": additions + deletions,
                    "status": status,
                    "content": "",
                }

                # Handle renames
                if diff.renamed_file and diff.a_path:
                    file_data["old_path"] = diff.a_path
                    old_paths_from_renames.add(diff.a_path)

                files_dict[file_path_str] = file_data

            # Filter out old paths from renames (they would show as deleted)
            files_dict = {
                path: data
                for path, data in files_dict.items()
                if path not in old_paths_from_renames
            }

            return list(files_dict.values())

        except Exception as e:
            logger.warning(f"Failed to collect diff metadata: {e}")
            return []

    def _get_file_diff(
        self,
        file_path: str,
        base_commit: Optional[str] = None,
        target_commit: Optional[str] = None,
        use_cached: bool = False,
        context_lines: int = DEFAULT_CONTEXT_LINES,
    ) -> str:
        """Get detailed diff content for a specific file.

        Uses GitPython's git command interface to get diff text.

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

            # Build arguments for git diff
            diff_args = [f"-U{context_lines}", "--no-color"]

            # Handle commit comparison
            if base_commit and target_commit:
                diff_args.extend([base_commit, target_commit])
            elif base_commit:
                diff_args.append(base_commit)
            elif use_cached:
                diff_args.append("--cached")

            # Add file path
            diff_args.append(file_path)

            # Use GitPython's git command interface
            result: str = self.repo.git.diff(*diff_args)
            return result

        except Exception as e:
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

            diff_args = []

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

            # Add -- to separate revisions from paths, then add file path
            diff_args.extend(["--no-color", "--", file_path])

            # Use GitPython's git command interface
            result: str = self.repo.git.diff(*diff_args)
            return result

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

    def get_file_content_at_ref(self, file_path: str, ref: str = "HEAD") -> list[str]:
        """Get the complete content of a file at a specific git reference.

        This is useful for showing the full content of deleted files or
        viewing file content at a specific commit.

        Args:
            file_path: Path to the file relative to repository root
            ref: Git reference (commit SHA, branch name, tag, or "HEAD")

        Returns:
            List of lines from the file (without trailing newlines)

        Raises:
            GitOperationError: If file doesn't exist at ref or operation fails
        """
        if not self._is_safe_file_path(file_path):
            raise GitOperationError(f"Unsafe file path: {file_path}")

        if not self._is_safe_commit_sha(ref):
            raise GitOperationError(f"Unsafe git reference: {ref}")

        try:
            # Use GitPython to read file content from git object database
            commit = self.repo.commit(ref)

            # Get the file blob from the commit tree
            try:
                blob = commit.tree / file_path
            except KeyError as e:
                raise GitOperationError(
                    f"File '{file_path}' does not exist at ref '{ref}'"
                ) from e

            # Read the blob content and split into lines
            content = blob.data_stream.read()

            # Decode with error handling
            try:
                text_content = content.decode("utf-8")
            except UnicodeDecodeError:
                # Try with fallback encoding
                text_content = content.decode("utf-8", errors="replace")

            # Split into lines and remove trailing newlines
            lines: list[str] = text_content.splitlines()

            return lines

        except GitOperationError:
            raise
        except Exception as e:
            raise GitOperationError(f"Failed to get file content at {ref}: {e}") from e


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
