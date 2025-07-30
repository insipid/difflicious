"""Service for handling diff-related business logic."""

import logging
from typing import Any, Dict, Optional

from difflicious.diff_parser import DiffParseError, parse_git_diff_for_rendering
from difflicious.git_operations import GitOperationError

from .base_service import BaseService
from .exceptions import DiffServiceError

logger = logging.getLogger(__name__)


class DiffService(BaseService):
    """Service for diff-related operations and business logic."""

    def get_grouped_diffs(
        self,
        base_commit: Optional[str] = None,
        target_commit: Optional[str] = None,
        unstaged: bool = True,
        untracked: bool = False,
        file_path: Optional[str] = None,
    ) -> Dict[str, Any]:
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
                file_path=file_path,
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
        for _group_name, group_data in grouped_diffs.items():
            formatted_files = []

            for diff in group_data["files"]:
                processed_diff = self._process_single_diff(diff)
                formatted_files.append(processed_diff)

            group_data["files"] = formatted_files
            group_data["count"] = len(formatted_files)

        return grouped_diffs

    def _process_single_diff(self, diff: Dict[str, Any]) -> Dict[str, Any]:
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
                    formatted_diff.update(
                        {
                            "path": diff["path"],
                            "additions": diff["additions"],
                            "deletions": diff["deletions"],
                            "changes": diff["changes"],
                            "status": diff["status"],
                        }
                    )
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
