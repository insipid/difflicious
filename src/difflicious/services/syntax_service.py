"""Service for server-side syntax highlighting using Pygments."""

import json
import logging
import re
from pathlib import Path
from typing import Any

from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import get_lexer_by_name, guess_lexer_for_filename
from pygments.util import ClassNotFound

logger = logging.getLogger(__name__)


def _load_language_map() -> dict[str, str]:
    """Load language map from shared JSON configuration file.

    Returns:
        Dictionary mapping file extensions to language names

    Raises:
        FileNotFoundError: If language_map.json is not found
        json.JSONDecodeError: If language_map.json is invalid
    """
    config_path = Path(__file__).parent.parent / "static" / "data" / "language_map.json"
    with open(config_path) as f:
        data: dict[str, str] = json.load(f)
        return data


class SyntaxHighlightingService:
    """Service for server-side code syntax highlighting."""

    def __init__(self) -> None:
        """Initialize the syntax highlighting service."""
        # A single class-based formatter serves both themes.
        #
        # Highlighting happens once, server-side, but the theme is switched in the
        # browser. Inline styles (noclasses=True) would bake one theme's colours
        # into the markup and could not be overridden by a stylesheet, which left
        # dark mode showing light-theme code colours. Emitting CSS classes instead
        # lets `theme.css` own the palette for both themes.
        self.formatter = HtmlFormatter(
            nowrap=True,  #        # Don't wrap in <pre> tags
            noclasses=False,  #    # Emit CSS classes so themes can restyle them
            cssclass="highlight",  # CSS class for highlighted code
        )

        # Cache lexers by file extension for performance
        self._lexer_cache: dict[str, Any] = {}

        # Load language detection mapping from shared JSON configuration
        self.language_map = _load_language_map()

    def highlight_diff_line(
        self, content: str, file_path: str, theme: str = "light"
    ) -> str:
        """Highlight a single line of diff content.

        Args:
            content: The code content to highlight
            file_path: Path to determine language
            theme: Retained for API compatibility. Token colours are now supplied
                by CSS variables, so both themes share one set of markup.

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
            highlighted = highlight(rest, lexer, self.formatter)
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

    #: Pygments token classes grouped by the design token that colours them.
    #: Mapping to variables rather than to a Pygments style keeps every colour
    #: decision in `theme.css`, and means both themes are served by one ruleset.
    _TOKEN_GROUPS: dict[str, tuple[str, ...]] = {
        "keyword": ("k", "kc", "kd", "kn", "kp", "kr", "kt", "ow"),
        "string": (
            "s",
            "sa",
            "sb",
            "sc",
            "dl",
            "sd",
            "s2",
            "se",
            "sh",
            "si",
            "sx",
            "sr",
            "s1",
            "ss",
        ),
        "number": ("m", "mb", "mf", "mh", "mi", "mo", "il"),
        "comment": ("c", "ch", "cm", "cp", "cpf", "c1", "cs"),
        "function": ("nf", "fm", "nd"),
        "class": ("nc", "nn", "ne", "no", "nt"),
        "builtin": ("nb", "bp", "nv", "vc", "vg", "vi", "vm"),
        "operator": ("o", "p"),
        "name": ("n", "na", "nl", "nx", "py", "ni"),
        "error": ("err", "gr"),
    }

    def get_css_styles(self) -> str:
        """Get CSS rules mapping Pygments token classes to theme variables.

        The rules are theme-agnostic: each token class points at a
        ``--syntax-*`` custom property, and the active theme decides the value.

        Returns:
            CSS styles as string
        """
        rules = []
        for token, classes in self._TOKEN_GROUPS.items():
            selector = ", ".join(f".highlight .{cls}" for cls in classes)
            rules.append(f"{selector} {{ color: var(--syntax-{token}); }}")

        body = "\n".join(rules)
        return f"""
/* Syntax highlighting — colours resolve from theme.css for the active theme */
.highlight {{ color: var(--syntax-name); }}
{body}
.highlight .gh, .highlight .gu {{ color: var(--syntax-class); }}
.highlight .gd {{ color: inherit; }}
.highlight .gi {{ color: inherit; }}
.highlight .ge {{ font-style: italic; }}
.highlight .gs {{ font-weight: var(--font-weight-semibold); }}
"""
