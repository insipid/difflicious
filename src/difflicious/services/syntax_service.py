"""Service for server-side syntax highlighting using Pygments."""

import logging
import re
from pathlib import Path
from typing import Any

from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import get_lexer_by_name, guess_lexer_for_filename
from pygments.util import ClassNotFound

logger = logging.getLogger(__name__)


class SyntaxHighlightingService:
    """Service for server-side code syntax highlighting."""

    def __init__(self) -> None:
        """Initialize the syntax highlighting service."""
        # Configure HTML formatters for both themes
        self.light_formatter = HtmlFormatter(
            nowrap=True,  #        # Don't wrap in <pre> tags
            noclasses=True,  #     # Use inline styles for consistency
            style="default",  #    # Use default theme for light mode
            cssclass="highlight",  # CSS class for highlighted code
        )

        self.dark_formatter = HtmlFormatter(
            nowrap=True,  #        # Don't wrap in <pre> tags
            noclasses=True,  #     # Use inline styles for consistency
            style="one-dark",  #   # Use one-dark theme for dark mode
            cssclass="highlight",  # CSS class for highlighted code
        )

        # Cache lexers by file extension for performance
        self._lexer_cache: dict[str, Any] = {}

        # Language detection mapping (same as current frontend)
        self.language_map = {
            "js": "javascript",
            "jsx": "javascript",
            "ts": "typescript",
            "tsx": "typescript",
            "py": "python",
            "html": "html",
            "htm": "html",
            "css": "css",
            "scss": "scss",
            "sass": "sass",
            "less": "less",
            "json": "json",
            "xml": "xml",
            "yaml": "yaml",
            "yml": "yaml",
            "md": "markdown",
            "sh": "bash",
            "bash": "bash",
            "zsh": "bash",
            "php": "php",
            "rb": "ruby",
            "go": "go",
            "rs": "rust",
            "java": "java",
            "c": "c",
            "cpp": "cpp",
            "cc": "cpp",
            "cxx": "cpp",
            "h": "c",
            "hpp": "cpp",
            "cs": "csharp",
            "sql": "sql",
            "r": "r",
            "swift": "swift",
            "kt": "kotlin",
            "scala": "scala",
            "clj": "clojure",
            "ex": "elixir",
            "exs": "elixir",
            "dockerfile": "dockerfile",
        }

    def highlight_diff_line(
        self, content: str, file_path: str, theme: str = "light"
    ) -> str:
        """Highlight a single line of diff content.

        Args:
            content: The code content to highlight
            file_path: Path to determine language
            theme: Theme to use ("light" or "dark")

        Returns:
            HTML-highlighted code content
        """
        if not content or not content.strip():
            return content

        try:
            # Preserve only leading indentation explicitly using nbsp; leave the rest normal
            leading_match = re.match(r"^[\t ]+", content)
            leading = leading_match.group(0) if leading_match else ""
            rest = content[len(leading) :]

            # Convert leading spaces/tabs to non-breaking spaces (tabs -> 4 spaces)
            nbsp_prefix = (
                leading.replace("\t", " " * 4).replace(" ", "&nbsp;") if leading else ""
            )

            lexer = self._get_cached_lexer(file_path)
            formatter = self.dark_formatter if theme == "dark" else self.light_formatter
            highlighted = highlight(rest, lexer, formatter)
            return (nbsp_prefix + str(highlighted)).rstrip("\n")
        except Exception as e:
            logger.debug(f"Highlighting failed for {file_path}: {e}")
            return content  # Fallback to plain text

    def _get_cached_lexer(self, file_path: str) -> Any:
        """Get lexer for file, using cache for performance."""
        file_ext = Path(file_path).suffix.lower().lstrip(".")

        if file_ext not in self._lexer_cache:
            try:
                # Try mapped language first
                if file_ext in self.language_map:
                    language = self.language_map[file_ext]
                    lexer = get_lexer_by_name(language)
                else:
                    # Fall back to filename-based detection
                    lexer = guess_lexer_for_filename(file_path, "")

                self._lexer_cache[file_ext] = lexer
                logger.debug(
                    f"Cached lexer for {file_ext}: {getattr(lexer, 'name', 'unknown')}"
                )

            except ClassNotFound:
                # Default to text lexer for unknown files
                lexer = get_lexer_by_name("text")
                self._lexer_cache[file_ext] = lexer
                logger.debug(f"Using text lexer for unknown extension: {file_ext}")

        return self._lexer_cache[file_ext]

    def get_css_styles(self) -> str:
        """Get CSS styles for syntax highlighting for both light and dark themes.

        Returns:
            CSS styles as string with theme-specific rules
        """
        light_styles = str(self.light_formatter.get_style_defs(".highlight"))
        dark_styles = str(
            self.dark_formatter.get_style_defs('[data-theme="dark"] .highlight')
        )

        return f"""
/* Light theme syntax highlighting */
{light_styles}

/* Dark theme syntax highlighting */
{dark_styles}
"""
