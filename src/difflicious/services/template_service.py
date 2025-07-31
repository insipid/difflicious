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
        untracked: bool = False,
        file_path: Optional[str] = None,
        search_filter: Optional[str] = None,
        expand_files: bool = False
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

            # Get diff data
            grouped_diffs = self.diff_service.get_grouped_diffs(
                base_commit=base_commit,
                target_commit=target_commit,
                unstaged=unstaged,
                untracked=untracked,
                file_path=file_path
            )

            # Process and enhance diff data for template rendering
            enhanced_groups = self._enhance_diff_data_for_templates(
                grouped_diffs,
                search_filter,
                expand_files
            )

            # Calculate totals
            total_files = sum(group["count"] for group in enhanced_groups.values())

            return {
                # Repository info
                "repo_status": repo_status,
                "branches": branch_info.get("branches", {}),
                "current_branch": repo_status.get("current_branch", "unknown"),

                # Diff data
                "groups": enhanced_groups,
                "total_files": total_files,

                # UI state
                "current_base_branch": base_commit or branch_info.get("branches", {}).get("default", "main"),
                "unstaged": unstaged,
                "untracked": untracked,
                "search_filter": search_filter,

                # Template helpers
                "syntax_css": self.syntax_service.get_css_styles(),
                "loading": False
            }

        except Exception as e:
            logger.error(f"Failed to prepare template data: {e}")
            return self._get_error_template_data(str(e))

    def _enhance_diff_data_for_templates(
        self,
        grouped_diffs: dict[str, Any],
        search_filter: Optional[str] = None,
        expand_files: bool = False
    ) -> dict[str, Any]:
        """Enhance diff data with syntax highlighting and template-specific features."""

        enhanced_groups = {}

        for group_key, group_data in grouped_diffs.items():
            enhanced_files = []

            for file_data in group_data["files"]:
                # Apply search filter
                if search_filter and search_filter.lower() not in file_data["path"].lower():
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
                        file_data["path"]
                    )

                enhanced_files.append(enhanced_file)

            enhanced_groups[group_key] = {
                "files": enhanced_files,
                "count": len(enhanced_files)
            }

        return enhanced_groups

    def _process_hunks_for_template(
        self,
        hunks: list[dict[str, Any]],
        file_path: str
    ) -> list[dict[str, Any]]:
        """Process hunks with syntax highlighting for template rendering."""

        processed_hunks = []

        for hunk_index, hunk in enumerate(hunks):
            processed_hunk = {
                **hunk,
                "can_expand_before": self._can_expand_context(hunks, hunk_index, "before"),
                "can_expand_after": self._can_expand_context(hunks, hunk_index, "after"),
                "lines": []
            }

            # Process each line with syntax highlighting
            for line in hunk.get("lines", []):
                processed_line = {
                    **line,
                    "left": self._process_line_side(line.get("left"), file_path),
                    "right": self._process_line_side(line.get("right"), file_path)
                }
                processed_hunk["lines"].append(processed_line)

            processed_hunks.append(processed_hunk)

        return processed_hunks

    def _process_line_side(
        self,
        line_side: Optional[dict[str, Any]],
        file_path: str
    ) -> Optional[dict[str, Any]]:
        """Process one side of a diff line with syntax highlighting."""

        if not line_side or not line_side.get("content"):
            return line_side

        # Add highlighted content
        highlighted_content = self.syntax_service.highlight_diff_line(
            line_side["content"],
            file_path
        )

        return {
            **line_side,
            "highlighted_content": highlighted_content
        }

    def _can_expand_context(
        self,
        hunks: list[dict[str, Any]],
        hunk_index: int,
        direction: str
    ) -> bool:
        """Determine if context can be expanded for a hunk."""

        if direction == "before":
            if hunk_index == 0:
                # First hunk: can expand if doesn't start at line 1
                return hunks[0].get("new_start", 1) > 1
            else:
                # Other hunks: can always expand before
                return True
        elif direction == "after":
            # Can expand after if not the first hunk
            return hunk_index > 0

        return False

    def _get_error_template_data(self, error_message: str) -> dict[str, Any]:
        """Get template data for error states."""
        return {
            "repo_status": {"current_branch": "error", "git_available": False},
            "branches": {"all": [], "current": "error", "default": "main"},
            "groups": {
                "untracked": {"files": [], "count": 0},
                "unstaged": {"files": [], "count": 0},
                "staged": {"files": [], "count": 0}
            },
            "total_files": 0,
            "current_base_branch": "main",
            "unstaged": True,
            "untracked": False,
            "search_filter": "",
            "syntax_css": "",
            "loading": False,
            "error": error_message
        }

