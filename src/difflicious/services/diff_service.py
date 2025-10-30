"""Service for handling diff-related business logic."""

import logging
from typing import Any, Optional

from difflicious.diff_parser import DiffParseError, parse_git_diff_for_rendering
from difflicious.git_operations import GitOperationError

from .base_service import BaseService
from .exceptions import DiffServiceError
from .syntax_service import SyntaxHighlightingService

logger = logging.getLogger(__name__)


class DiffService(BaseService):
    """Service for diff-related operations and business logic."""

    def __init__(self, repo_path: Optional[str] = None) -> None:
        """Initialize the diff service."""
        super().__init__(repo_path)
        self.syntax_service = SyntaxHighlightingService()

    def get_grouped_diffs(
        self,
        base_ref: Optional[str] = None,
        unstaged: bool = True,
        untracked: bool = False,
        file_path: Optional[str] = None,
    ) -> dict[str, Any]:
        """Get processed diff data grouped by type.

        This method extracts the business logic currently in get_real_git_diff()
        from app.py and makes it independently testable.

        Args:
            base_ref: Base reference for comparison (HEAD or branch)
            unstaged: Whether to include unstaged changes (mapped to include_unstaged)
            untracked: Whether to include untracked files (mapped to include_untracked)
            file_path: Optional specific file to diff

        Returns:
            Dictionary with grouped diff data

        Raises:
            DiffServiceError: If diff processing fails
        """
        try:
            # Determine comparison mode from base_ref
            # HEAD or current branch implies HEAD comparison; otherwise branch comparison
            current_branch = self.repo.get_current_branch()
            use_head = base_ref in ["HEAD", current_branch] if base_ref else False

            # Get raw diff data from git operations using new interface
            grouped_diffs = self.repo.get_diff(
                use_head=use_head,
                include_unstaged=unstaged,
                include_untracked=untracked,
                file_path=file_path,
                base_ref=base_ref,
            )

            # Process each group to parse diff content for rendering
            return self._process_diff_groups(grouped_diffs)

        except GitOperationError as e:
            self._log_error("Git operation failed during diff retrieval", e)
            raise DiffServiceError(f"Failed to retrieve diff data: {e}") from e
        except Exception as e:
            self._log_error("Unexpected error during diff processing", e)
            raise DiffServiceError(f"Diff processing failed: {e}") from e

    def _process_diff_groups(self, grouped_diffs: dict[str, Any]) -> dict[str, Any]:
        """Process raw diff groups into rendered format.

        Args:
            grouped_diffs: Raw diff data from git operations

        Returns:
            Processed diff data ready for frontend consumption
        """
        # Track old paths from renames to filter them out
        old_paths_from_renames = set()

        # First pass: identify old paths from renames
        for _group_name, group_data in grouped_diffs.items():
            for diff in group_data["files"]:
                if diff.get("status") == "renamed" and diff.get("old_path"):
                    old_paths_from_renames.add(diff["old_path"])

        # Second pass: process files and filter out old paths
        for _group_name, group_data in grouped_diffs.items():
            formatted_files = []

            for diff in group_data["files"]:
                # Skip old paths from renames
                if diff.get("path") in old_paths_from_renames:
                    continue

                # Skip files with rename notation in path (e.g., "{doc => docs}/..." or "old => new")
                path = diff.get("path", "")
                # Only filter if the path contains "=>" and looks like a file path (not just line numbers)
                if ("=>" in path and ("/" in path or path.startswith("{"))) or (
                    path.startswith("{") and "}" in path
                ):
                    continue

                processed_diff = self._process_single_diff(diff)
                formatted_files.append(processed_diff)

            group_data["files"] = formatted_files
            group_data["count"] = len(formatted_files)

        return grouped_diffs

    def _process_single_diff(self, diff: dict[str, Any]) -> dict[str, Any]:
        """Process a single diff file.

        Args:
            diff: Raw diff data for a single file

        Returns:
            Processed diff data
        """
        # Parse the diff content if available (but not for untracked files)
        if diff.get("content") and diff.get("status") != "untracked":
            try:
                parsed_diff = parse_git_diff_for_rendering(diff["content"])
                if parsed_diff:
                    # Take the first parsed diff item and update it with our metadata
                    formatted_diff = parsed_diff[0]
                    update_data = {
                        "path": diff["path"],
                        "additions": diff["additions"],
                        "deletions": diff["deletions"],
                        "changes": diff["changes"],
                        "status": diff["status"],
                    }
                    # Preserve old_path for renamed files
                    if "old_path" in diff:
                        update_data["old_path"] = diff["old_path"]
                    formatted_diff.update(update_data)
                    return formatted_diff
            except DiffParseError as e:
                logger.warning(f"Failed to parse diff for {diff['path']}: {e}")
                # Fall through to return raw diff

        # For files without content or parsing failures, return as-is
        return diff

    def get_diff_summary(self, **kwargs: Any) -> dict[str, Any]:
        """Get summary statistics for diffs.

        Args:
            **kwargs: Arguments passed to get_grouped_diffs

        Returns:
            Summary statistics dictionary
        """
        try:
            grouped_diffs = self.get_grouped_diffs(**kwargs)

            total_files = sum(group["count"] for group in grouped_diffs.values())
            total_additions = 0
            total_deletions = 0

            for group in grouped_diffs.values():
                for file_data in group["files"]:
                    total_additions += file_data.get("additions", 0)
                    total_deletions += file_data.get("deletions", 0)

            return {
                "total_files": total_files,
                "total_additions": total_additions,
                "total_deletions": total_deletions,
                "total_changes": total_additions + total_deletions,
                "groups": {
                    name: group["count"] for name, group in grouped_diffs.items()
                },
            }

        except DiffServiceError:
            raise
        except Exception as e:
            raise DiffServiceError(f"Failed to generate diff summary: {e}") from e

    def get_full_diff_data(
        self,
        file_path: str,
        base_ref: Optional[str] = None,
        use_head: bool = False,
        use_cached: bool = False,
    ) -> dict[str, Any]:
        """Get complete diff data for a specific file with unlimited context.

        Args:
            file_path: Path to the file to diff
            base_ref: Base reference for comparison (defaults to main branch)
            use_head: Whether to compare against HEAD instead of branch
            use_cached: Whether to get staged diff

        Returns:
            Dictionary containing full diff data with parsed content

        Raises:
            DiffServiceError: If diff processing fails
        """
        try:
            # Get raw full diff content
            full_diff_content = self.repo.get_full_file_diff(
                file_path=file_path,
                base_ref=base_ref,
                use_head=use_head,
                use_cached=use_cached,
            )

            if not full_diff_content.strip():
                # No diff content (files are identical)
                return {
                    "status": "ok",
                    "file_path": file_path,
                    "diff_content": "",
                    "has_changes": False,
                    "comparison_mode": self._get_comparison_mode_description(
                        base_ref, use_head, use_cached
                    ),
                }

            # Parse the diff content for rendering
            try:
                parsed_diff = parse_git_diff_for_rendering(full_diff_content)
                if parsed_diff and len(parsed_diff) > 0:
                    # Take the first parsed diff and enhance it
                    formatted_diff = parsed_diff[0]

                    # Apply syntax highlighting to the diff content
                    formatted_diff = self._apply_syntax_highlighting_to_diff(
                        formatted_diff, file_path
                    )

                    formatted_diff.update(
                        {
                            "path": file_path,
                            "full_context": True,
                            "comparison_mode": self._get_comparison_mode_description(
                                base_ref, use_head, use_cached
                            ),
                        }
                    )

                    return {
                        "status": "ok",
                        "file_path": file_path,
                        "diff_data": formatted_diff,
                        "has_changes": True,
                        "comparison_mode": self._get_comparison_mode_description(
                            base_ref, use_head, use_cached
                        ),
                    }
                else:
                    # Parsing failed, return highlighted raw content
                    highlighted_diff = self._apply_syntax_highlighting_to_raw_diff(
                        full_diff_content, file_path
                    )
                    return {
                        "status": "ok",
                        "file_path": file_path,
                        "diff_content": highlighted_diff,
                        "has_changes": True,
                        "comparison_mode": self._get_comparison_mode_description(
                            base_ref, use_head, use_cached
                        ),
                    }

            except DiffParseError as e:
                logger.warning(f"Failed to parse full diff for {file_path}: {e}")
                # Return highlighted raw content if parsing fails
                highlighted_diff = self._apply_syntax_highlighting_to_raw_diff(
                    full_diff_content, file_path
                )
                return {
                    "status": "ok",
                    "file_path": file_path,
                    "diff_content": highlighted_diff,
                    "has_changes": True,
                    "comparison_mode": self._get_comparison_mode_description(
                        base_ref, use_head, use_cached
                    ),
                }

        except GitOperationError as e:
            self._log_error("Git operation failed during full diff retrieval", e)
            raise DiffServiceError(f"Failed to retrieve full diff data: {e}") from e
        except Exception as e:
            self._log_error("Unexpected error during full diff processing", e)
            raise DiffServiceError(f"Full diff processing failed: {e}") from e

    def _apply_syntax_highlighting_to_diff(
        self, diff_data: dict[str, Any], file_path: str
    ) -> dict[str, Any]:
        """Apply syntax highlighting to diff data.

        Args:
            diff_data: Parsed diff data structure
            file_path: Path to determine language for highlighting

        Returns:
            Enhanced diff data with syntax highlighting applied
        """
        if "hunks" not in diff_data:
            return diff_data

        try:
            for hunk in diff_data["hunks"]:
                for line in hunk.get("lines", []):
                    # Apply syntax highlighting to left side content
                    if line.get("left") and line["left"].get("content"):
                        original_content = line["left"]["content"]
                        highlighted_content = self.syntax_service.highlight_diff_line(
                            original_content, file_path
                        )
                        line["left"]["content"] = highlighted_content

                    # Apply syntax highlighting to right side content
                    if line.get("right") and line["right"].get("content"):
                        original_content = line["right"]["content"]
                        highlighted_content = self.syntax_service.highlight_diff_line(
                            original_content, file_path
                        )
                        line["right"]["content"] = highlighted_content

        except Exception as e:
            logger.debug(f"Failed to apply syntax highlighting to diff: {e}")
            # Return original data if highlighting fails

        return diff_data

    def _apply_syntax_highlighting_to_raw_diff(
        self, raw_diff: str, file_path: str
    ) -> str:
        """Apply syntax highlighting to raw diff content.

        Args:
            raw_diff: Raw diff content as string
            file_path: Path to determine language for highlighting

        Returns:
            Syntax highlighted diff content
        """
        try:
            lines = raw_diff.split("\n")
            highlighted_lines = []

            for line in lines:
                # Skip diff headers and metadata
                if (
                    line.startswith("diff --git")
                    or line.startswith("index ")
                    or line.startswith("+++")
                    or line.startswith("---")
                    or line.startswith("@@")
                ):
                    highlighted_lines.append(line)
                    continue

                # Apply highlighting to content lines (context, additions, deletions)
                if line and len(line) > 1:
                    # Get the content without the leading diff marker (+, -, or space)
                    content = line[1:] if line[0] in ["+", "-", " "] else line
                    if content.strip():  # Only highlight non-empty content
                        highlighted_content = self.syntax_service.highlight_diff_line(
                            content, file_path
                        )
                        # Reconstruct the line with the diff marker
                        highlighted_line = (
                            line[0] + highlighted_content
                            if line[0] in ["+", "-", " "]
                            else highlighted_content
                        )
                        highlighted_lines.append(highlighted_line)
                    else:
                        highlighted_lines.append(line)
                else:
                    highlighted_lines.append(line)

            return "\n".join(highlighted_lines)

        except Exception as e:
            logger.debug(f"Failed to apply syntax highlighting to raw diff: {e}")
            return raw_diff  # Return original content if highlighting fails

    def _get_comparison_mode_description(
        self, base_ref: Optional[str], use_head: bool, use_cached: bool
    ) -> str:
        """Get a human-readable description of the comparison mode."""
        if use_cached:
            return "staged vs HEAD"
        elif use_head:
            return "working directory vs HEAD"
        elif base_ref:
            return f"working directory vs {base_ref}"
        else:
            return "working directory vs main branch"
