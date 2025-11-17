"""Data Transfer Objects (DTOs) for API requests and responses.

Provides type-safe dataclasses for API contracts with validation.
"""

from dataclasses import asdict, dataclass, field
from typing import Any, Optional


@dataclass
class StatusResponse:
    """Response DTO for git status information."""

    status: str
    current_branch: str
    repository_name: str
    files_changed: int
    git_available: bool

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)


@dataclass
class BranchesResponse:
    """Response DTO for git branch information."""

    status: str
    branches: dict[str, Any] = field(default_factory=dict)
    message: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        # Remove None values for cleaner JSON
        return {k: v for k, v in result.items() if v is not None}


@dataclass
class ExpandContextRequest:
    """Request DTO for context expansion."""

    file_path: str
    hunk_index: int
    direction: str
    context_lines: int = 10
    output_format: str = "plain"
    target_start: Optional[int] = None
    target_end: Optional[int] = None

    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate request parameters.

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not self.file_path:
            return False, "file_path is required"
        if self.hunk_index is None:
            return False, "hunk_index is required"
        if not self.direction:
            return False, "direction is required"
        if self.direction not in ["before", "after"]:
            return False, "direction must be 'before' or 'after'"
        if self.output_format not in ["plain", "pygments"]:
            return False, "Invalid format parameter. Must be 'plain' or 'pygments'"
        return True, None


@dataclass
class ExpandContextResponse:
    """Response DTO for context expansion."""

    status: str
    lines: list[Any] = field(default_factory=list)
    start_line: int = 0
    end_line: int = 0
    file_path: str = ""
    output_format: str = "plain"
    css_styles: Optional[str] = None
    message: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization.

        Maps field names to maintain backward compatibility with existing API contract.
        """
        result = asdict(self)
        # Map 'output_format' to 'format' for backward compatibility
        if "output_format" in result:
            result["format"] = result.pop("output_format")
        # Remove None values for cleaner JSON
        return {k: v for k, v in result.items() if v is not None}


@dataclass
class DiffRequest:
    """Request DTO for diff information."""

    base_ref: Optional[str] = None
    unstaged: bool = True
    untracked: bool = False
    file_path: Optional[str] = None
    use_head: bool = False


@dataclass
class DiffResponse:
    """Response DTO for diff information."""

    status: str
    groups: dict[str, Any] = field(default_factory=dict)
    total_files: int = 0
    unstaged: bool = True
    untracked: bool = False
    file_filter: Optional[str] = None
    use_head: bool = False
    base_ref: Optional[str] = None
    message: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        # Keep base_ref and file_filter even if None for backward compatibility
        # Only remove 'message' if None (used for error responses)
        if "message" in result and result["message"] is None:
            del result["message"]
        return result


@dataclass
class FileLinesRequest:
    """Request DTO for fetching file lines."""

    file_path: str
    start_line: int
    end_line: int

    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate request parameters.

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not self.file_path:
            return False, "file_path parameter is required"
        if self.start_line is None or self.end_line is None:
            return False, "start_line and end_line parameters are required"
        if not isinstance(self.start_line, int) or not isinstance(self.end_line, int):
            return False, "start_line and end_line must be valid numbers"
        return True, None


@dataclass
class FileLinesResponse:
    """Response DTO for file lines."""

    status: str
    lines: list[str] = field(default_factory=list)
    start_line: int = 0
    end_line: int = 0
    file_path: str = ""
    message: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        # Remove None values for cleaner JSON
        return {k: v for k, v in result.items() if v is not None}


@dataclass
class FullDiffRequest:
    """Request DTO for full diff data."""

    file_path: str
    base_ref: Optional[str] = None
    use_head: bool = False
    use_cached: bool = False

    def validate(self) -> tuple[bool, Optional[str]]:
        """Validate request parameters.

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not self.file_path:
            return False, "file_path parameter is required"
        return True, None


@dataclass
class FullDiffResponse:
    """Response DTO for full diff data."""

    status: str
    file_path: str = ""
    diff_data: Optional[dict[str, Any]] = None
    message: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        # Remove None values for cleaner JSON
        return {k: v for k, v in result.items() if v is not None}
