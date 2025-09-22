"""Service for preparing data for Jinja2 template rendering."""

import logging
from typing import Any, Optional

from .base_service import BaseService
from .diff_service import DiffService
from .git_service import GitService
from .syntax_service import SyntaxHighlightingService

logger = logging.getLogger(__name__)


class TemplateRenderingService(BaseService):
    """Service for preparing diff data for template rendering."""

    def __init__(self, repo_path: Optional[str] = None):
        """Initialize template rendering service."""
        super().__init__(repo_path)
        self.diff_service = DiffService(repo_path)
        self.git_service = GitService(repo_path)
        self.syntax_service = SyntaxHighlightingService()

    def prepare_diff_data_for_template(
        self,
        base_commit: Optional[str] = None,
        target_commit: Optional[str] = None,
        unstaged: bool = True,
        staged: bool = True,
        untracked: bool = False,
        file_path: Optional[str] = None,
        search_filter: Optional[str] = None,
        expand_files: bool = False,
        base_ref: Optional[str] = None,
    ) -> dict[str, Any]:
        """Prepare complete diff data optimized for Jinja2 template rendering.

        Args:
            base_commit: Base commit for comparison
            target_commit: Target commit for comparison
            unstaged: Include unstaged changes
            untracked: Include untracked files
            file_path: Filter to specific file
            search_filter: Search term for filtering files
            expand_files: Whether to expand files by default

        Returns:
            Dictionary containing all data needed for template rendering
        """
        try:
            # Get basic repository information
            repo_status = self.git_service.get_repository_status()
            branch_info = self.git_service.get_branch_information()

            # Get diff data with explicit logic for the two main use cases
            current_branch = repo_status.get("current_branch", "unknown")
            is_head_comparison = (
                base_ref in ["HEAD", current_branch] if base_ref else False
            )

            logger.info(
                f"Template service: base_ref='{base_ref}', current_branch='{current_branch}', use_head={is_head_comparison}"
            )

            if base_ref:
                if is_head_comparison:
                    # Working directory vs HEAD comparison
                    # Always get both staged and unstaged files, keep them separate
                    grouped_diffs = self.diff_service.get_grouped_diffs(
                        base_ref="HEAD",
                        unstaged=True,  # Always get unstaged files for HEAD comparisons
                        untracked=untracked,
                        file_path=file_path,
                    )

                    # For HEAD comparisons, staged changes are always visible
                    # Files can appear in both groups if they have both staged AND unstaged changes
                    # This is correct behavior - it shows what's ready to commit vs what's still being worked on

                    # Remove unstaged group based on checkbox selection (staged always visible)
                    if not unstaged and "unstaged" in grouped_diffs:
                        del grouped_diffs["unstaged"]

                    # Ensure staged changes are always included in HEAD comparison mode
                    # The git operations always include staged changes, so we don't need to modify the request
                else:
                    # Working directory vs branch comparison - always show changes
                    grouped_diffs = self.diff_service.get_grouped_diffs(
                        base_ref=base_ref,
                        unstaged=True,  # Always show changes for branch comparisons
                        untracked=untracked,
                        file_path=file_path,
                    )

                    grouped_diffs = self._combine_unstaged_and_staged_as_changes(
                        grouped_diffs
                    )
            else:
                # Default behavior: compare to default branch - always show changes
                grouped_diffs = self.diff_service.get_grouped_diffs(
                    base_ref=base_ref,
                    unstaged=True,  # Always show changes for branch comparisons
                    untracked=untracked,
                    file_path=file_path,
                )
                grouped_diffs = self._combine_unstaged_and_staged_as_changes(
                    grouped_diffs
                )

            # Process and enhance diff data for template rendering
            enhanced_groups = self._enhance_diff_data_for_templates(
                grouped_diffs, search_filter, expand_files
            )

            # Calculate totals
            total_files = sum(group["count"] for group in enhanced_groups.values())

            # Pass through the UI state parameters as received from the user
            ui_unstaged = unstaged
            ui_staged = staged

            logger.info(
                f"Template final: base_ref='{base_ref}', current_branch='{current_branch}', is_head_comparison={is_head_comparison}"
            )

            return {
                # Repository info
                "repo_status": repo_status,
                "branches": branch_info.get("branches", {}),
                "current_branch": current_branch,
                # Diff data
                "groups": enhanced_groups,
                "total_files": total_files,
                # UI state
                # Dropdown selection: default to current branch if not specified in URL
                "current_base_ref": base_ref or current_branch,
                "unstaged": ui_unstaged,
                "staged": ui_staged,
                "untracked": untracked,
                "search_filter": search_filter,
                # Template helpers
                "syntax_css": self.syntax_service.get_css_styles(),
                "loading": False,
                # Comparison mode
                "is_head_comparison": is_head_comparison,
            }

        except Exception as e:
            logger.error(f"Failed to prepare template data: {e}")
            return self._get_error_template_data(str(e))

    def _enhance_diff_data_for_templates(
        self,
        grouped_diffs: dict[str, Any],
        search_filter: Optional[str] = None,
        expand_files: bool = False,
    ) -> dict[str, Any]:
        """Enhance diff data with syntax highlighting and template-specific features."""

        enhanced_groups: dict[str, Any] = {}

        for group_key, group_data in grouped_diffs.items():
            enhanced_files: list[dict[str, Any]] = []

            for file_data in group_data.get("files", []):
                # Apply search filter
                if (
                    search_filter is not None
                    and search_filter.lower() not in file_data.get("path", "").lower()
                ):
                    continue

                # Add template-specific properties
                enhanced_file = {
                    **file_data,
                    "expanded": expand_files,  # Control initial expansion state
                }

                # Process hunks with syntax highlighting
                if file_data.get("hunks"):
                    enhanced_file["hunks"] = self._process_hunks_for_template(
                        file_data["hunks"],
                        file_data.get("path", ""),
                        file_data.get(
                            "line_count"
                        ),  # Pass file line count for boundary checks
                    )

                enhanced_files.append(enhanced_file)

            enhanced_groups[group_key] = {
                "files": enhanced_files,
                "count": len(enhanced_files),
            }

        return enhanced_groups

    def _combine_unstaged_and_staged_as_changes(
        self, grouped_diffs: dict[str, Any]
    ) -> dict[str, Any]:
        """Combine 'unstaged' and 'staged' groups into a single 'changes' group.

        Removes the original groups if present.
        """
        # Deduplicate by file path. Prefer unstaged entry (represents latest state).
        path_to_file: dict[str, dict[str, Any]] = {}

        # First, add unstaged files if present
        for file_entry in grouped_diffs.get("unstaged", {}).get("files", []):
            path = file_entry.get("path")
            if path and path not in path_to_file:
                path_to_file[path] = file_entry

        # Then add staged files that are not already present
        for file_entry in grouped_diffs.get("staged", {}).get("files", []):
            path = file_entry.get("path")
            if path and path not in path_to_file:
                path_to_file[path] = file_entry

        changes_files = list(path_to_file.values())

        grouped_diffs["changes"] = {
            "files": changes_files,
            "count": len(changes_files),
        }

        if "unstaged" in grouped_diffs:
            del grouped_diffs["unstaged"]
        if "staged" in grouped_diffs:
            del grouped_diffs["staged"]

        return grouped_diffs

    def _process_hunks_for_template(
        self,
        hunks: list[dict[str, Any]],
        file_path: str,
        file_line_count: Optional[int] = None,
    ) -> list[dict[str, Any]]:
        """Process hunks with syntax highlighting for template rendering."""

        processed_hunks = []

        for hunk_index, hunk in enumerate(hunks):
            # Calculate canonical old/new ranges from hunk metadata (not row count)
            right_start = hunk.get("new_start", 1)
            right_count = hunk.get("new_count", 0)
            right_end = right_start + max(right_count, 0) - 1

            left_start = hunk.get("old_start", 1)
            left_count = hunk.get("old_count", 0)
            left_end = left_start + max(left_count, 0) - 1

            # Find the last line of the previous hunk, if it exists
            previous_hunk = hunks[hunk_index - 1] if hunk_index > 0 else None
            previous_hunk_end = (
                previous_hunk.get("new_start", 1)
                + previous_hunk.get("new_count", 0)
                - 1
                if previous_hunk
                else 0
            )

            # Find the first line of the next hunk, if it exists
            next_hunk = hunks[hunk_index + 1] if hunk_index < len(hunks) - 1 else None
            next_hunk_start = (
                next_hunk.get("new_start", 1) if next_hunk else file_line_count
            )

            # Calculate expansion target ranges (10 lines by default)
            expand_before_start = max(previous_hunk_end + 1, right_start - 10)
            expand_before_end = right_start - 1
            expand_after_start = right_end + 1
            expand_after_end = min(
                next_hunk_start - 1 if next_hunk_start else right_end + 10,
                right_end + 10,
            )

            processed_hunk = {
                **hunk,
                "index": hunk_index,
                "can_expand_before": self._can_expand_context(
                    hunks, hunk_index, "before"
                ),
                "can_expand_after": self._can_expand_context(
                    hunks, hunk_index, "after"
                ),
                # Right side (new file) visible range
                "line_start": right_start,
                "line_end": right_end,
                "line_count": max(right_count, 0),
                # Left side (old file) visible range for numbering continuity
                "left_start": left_start,
                "left_end": left_end,
                "expand_before_start": expand_before_start,
                "expand_before_end": expand_before_end,
                "expand_after_start": expand_after_start,
                "expand_after_end": expand_after_end,
                "file_line_count": file_line_count,
                "lines": [],
            }

            # Process each line with syntax highlighting
            for line in hunk.get("lines", []):
                processed_line = {
                    **line,
                    "left": self._process_line_side(line.get("left"), file_path),
                    "right": self._process_line_side(line.get("right"), file_path),
                }
                processed_hunk["lines"].append(processed_line)

            processed_hunks.append(processed_hunk)

        return processed_hunks

    def _process_line_side(
        self, line_side: Optional[dict[str, Any]], file_path: str
    ) -> Optional[dict[str, Any]]:
        """Process one side of a diff line with syntax highlighting."""

        if not line_side or not line_side.get("content"):
            return line_side

        # Add highlighted content
        highlighted_content = self.syntax_service.highlight_diff_line(
            line_side["content"], file_path
        )

        return {**line_side, "highlighted_content": highlighted_content}

    def _can_expand_context(
        self, hunks: list[dict[str, Any]], hunk_index: int, direction: str
    ) -> bool:
        """Determine if context can be expanded for a hunk."""

        if direction == "before":
            # Can expand before if doesn't start at line 1
            current_hunk = hunks[hunk_index]
            hunk_start = current_hunk.get("new_start", 1)
            return bool(hunk_start > 1)
        elif direction == "after":
            # Can expand after only if:
            # 1. Not the last hunk (there are more hunks below) AND
            # 2. There's actually space between this hunk and the next hunk
            if hunk_index >= len(hunks) - 1:
                return False  # This is the last hunk

            # Check if there's space between current hunk and next hunk
            current_hunk = hunks[hunk_index]
            next_hunk = hunks[hunk_index + 1]

            # Calculate end using the actual line count, not new_count
            current_line_count = len(current_hunk.get("lines", []))
            current_end = current_hunk.get("new_start", 1) + current_line_count - 1
            next_start = next_hunk.get("new_start", 1)

            # Only show down arrow if there's at least 1 line gap between hunks
            return bool(next_start > current_end + 1)

        return False

    def _get_error_template_data(self, error_message: str) -> dict[str, Any]:
        """Get template data for error states."""
        return {
            "repo_status": {"current_branch": "error", "git_available": False},
            "branches": {"all": [], "current": "error", "default": "main"},
            "groups": {
                "untracked": {"files": [], "count": 0},
                "unstaged": {"files": [], "count": 0},
                "staged": {"files": [], "count": 0},
            },
            "total_files": 0,
            "current_base_ref": "main",
            "unstaged": True,
            "staged": True,
            "untracked": False,
            "search_filter": "",
            "syntax_css": "",
            "loading": False,
            "error": error_message,
            "is_head_comparison": False,
        }
