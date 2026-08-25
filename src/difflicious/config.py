"""Centralized configuration for Difflicious application."""

import os
from typing import Any, Optional

# Git diff configuration
DEFAULT_CONTEXT_LINES = 3  # Default number of context lines in diffs
DEFAULT_EXPANSION_CONTEXT_LINES = 10  # Default context lines when expanding
MAX_BRANCH_PREVIEW_LINES = 100  # Maximum lines to show in branch preview
UNLIMITED_CONTEXT_LINES = 1000000  # Effectively unlimited context lines

# Font configuration
AVAILABLE_FONTS = {
    "fira-code": {
        "name": "Fira Code",
        "css_family": "'Fira Code', monospace",
        "google_fonts_url": "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600&display=swap",
    },
    "jetbrains-mono": {
        "name": "JetBrains Mono",
        "css_family": "'JetBrains Mono', monospace",
        "google_fonts_url": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&display=swap",
    },
    "source-code-pro": {
        "name": "Source Code Pro",
        "css_family": "'Source Code Pro', monospace",
        "google_fonts_url": "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@300;400;500;600&display=swap",
    },
    "ibm-plex-mono": {
        "name": "IBM Plex Mono",
        "css_family": "'IBM Plex Mono', monospace",
        "google_fonts_url": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&display=swap",
    },
    "roboto-mono": {
        "name": "Roboto Mono",
        "css_family": "'Roboto Mono', monospace",
        "google_fonts_url": "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;400;500&display=swap",
    },
    "inconsolata": {
        "name": "Inconsolata",
        "css_family": "'Inconsolata', monospace",
        "google_fonts_url": "https://fonts.googleapis.com/css2?family=Inconsolata:wght@200;300;400;500;600;700;800;900&display=swap",
    },
}


# Theme configuration
#
# A theme supplies the palette and the semantic roles built on it. The scales,
# density knobs and back-compat aliases every theme shares live in
# `static/css/themes/_contract.css`, which is always loaded first. See
# docs/THEMING.md.
DEFAULT_THEME = "ledger"

AVAILABLE_THEMES = {
    "ledger": {
        "name": "Ledger",
        "description": "Warm paper and ink, with a single ochre accent",
        "file": "ledger.css",
        # A theme declares its own display/UI faces. Only the selected theme's
        # fonts are fetched, and only when Google Fonts are enabled at all.
        "google_fonts_url": (
            "https://fonts.googleapis.com/css2"
            "?family=IBM+Plex+Sans:wght@400;500;600"
            "&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700"
            "&display=swap"
        ),
    },
    "slate": {
        "name": "Slate",
        "description": "Cool neutral greys with an indigo accent",
        "file": "slate.css",
        "google_fonts_url": (
            "https://fonts.googleapis.com/css2"
            "?family=IBM+Plex+Sans:wght@400;500;600&display=swap"
        ),
    },
    "sorbet": {
        "name": "Sorbet",
        "description": "Bright and rounded, with heavy outlines and a turquoise accent",
        "file": "sorbet.css",
        "google_fonts_url": (
            "https://fonts.googleapis.com/css2"
            "?family=Fredoka:wght@500;600;700"
            "&family=Nunito:wght@400;600;700"
            "&display=swap"
        ),
    },
    # --- Candidates under review ------------------------------------------
    # Three proposals for a theme with more colour and more shape than the
    # first three. Registered so they can be rendered and screenshotted; one
    # or more will be kept and the rest dropped before this lands.
    "terrace": {
        "name": "Terrace",
        "description": "Warm plaster and clay, rounded, with a kiln-teal accent",
        "file": "terrace.css",
        "google_fonts_url": (
            "https://fonts.googleapis.com/css2"
            "?family=Fraunces:opsz,wght@9..144,600;9..144,700"
            "&family=Karla:wght@400;500;600;700"
            "&display=swap"
        ),
    },
    "draught": {
        "name": "Draught",
        "description": "Petrol-blue drafting board, squared off, with a mulberry accent",
        "file": "draught.css",
        "google_fonts_url": (
            "https://fonts.googleapis.com/css2"
            "?family=Space+Grotesk:wght@500;600;700"
            "&family=Archivo:wght@400;500;600"
            "&display=swap"
        ),
    },
    "riso": {
        "name": "Riso",
        "description": "Heather ground and cream stock, hard offset ink, slab type",
        "file": "riso.css",
        "google_fonts_url": (
            "https://fonts.googleapis.com/css2"
            "?family=Zilla+Slab:wght@500;600;700"
            "&family=Work+Sans:wght@400;500;600"
            "&display=swap"
        ),
    },
    "console": {
        "name": "Console",
        "description": "Monospace throughout, achromatic and square, ANSI magenta",
        # No fonts of its own: the interface adopts the runtime mono face, which
        # the font config has already fetched for the diff body.
        "file": "console.css",
        "google_fonts_url": "",
    },
}

THEME_CONTRACT_FILE = "_contract.css"

# Per-request theme selection. Nothing in the app writes this cookie yet; it is
# set out of band until there is a settings UI to own it. See docs/THEMING.md.
THEME_COOKIE_NAME = "difflicious_theme"


def looks_like_stylesheet_url(value: str) -> bool:
    """Is this theme value a stylesheet reference rather than a registry key?

    Args:
        value: The raw theme selection, from the CLI or the environment.

    Returns:
        True if it should be treated as a URL pointing at a stylesheet.
    """
    return value.startswith(("http://", "https://", "//")) or value.endswith(".css")


def theme_from_url(url: str) -> dict[str, str]:
    """Build a theme entry for a stylesheet supplied by URL.

    The theme is named after the CSS file, so `.../midnight-neon.css` presents
    itself as "Midnight Neon". It still loads on top of the contract, so it only
    has to supply a palette.

    Args:
        url: URL of the stylesheet.

    Returns:
        A theme entry in the same shape as the registry's built-ins.
    """
    filename = url.rstrip("/").rsplit("/", 1)[-1]
    stem = filename[:-4] if filename.endswith(".css") else filename
    name = stem.replace("-", " ").replace("_", " ").strip().title() or "Custom"

    return {
        "name": name,
        "description": f"Custom stylesheet from {url}",
        "url": url,
        # Custom themes declare their own faces inside the stylesheet; the app
        # will not fetch fonts on their behalf.
        "google_fonts_url": "",
    }


def _theme_config(
    selected_theme_key: str, selected_theme: dict[str, str]
) -> dict[str, Any]:
    """Assemble the payload the templates render stylesheet links from."""
    return {
        "selected_theme_key": selected_theme_key,
        "selected_theme": selected_theme,
        "available_themes": AVAILABLE_THEMES,
        "contract_file": THEME_CONTRACT_FILE,
    }


def theme_from_cookie(value: Optional[str]) -> Optional[str]:
    """Resolve a theme cookie value to a registry key, or None to ignore it.

    Only names already in the registry are accepted. In particular a cookie may
    never name a stylesheet URL, the way `DIFFLICIOUS_THEME` can: a cookie is
    attacker-settable in ways the server's own environment is not, and a remote
    stylesheet can both restyle the page and read data out of it through
    attribute selectors. The environment is trusted because whoever sets it is
    already running the process.

    Args:
        value: Raw cookie value, or None when the cookie is absent.

    Returns:
        A key into AVAILABLE_THEMES, or None if the value names no known theme.
    """
    if not value:
        return None

    key = value.strip().lower()

    return key if key in AVAILABLE_THEMES else None


def get_theme_config(requested_theme: Optional[str] = None) -> dict[str, Any]:
    """Get theme configuration for a single request.

    Resolution order: the theme requested by this request, then
    `DIFFLICIOUS_THEME` from the environment, then the default.

    Args:
        requested_theme: Theme asked for by this request, from the theme cookie.
            Honoured only when it names a registered theme; anything else is
            ignored in favour of the server's own selection.

    Returns:
        Dictionary containing the selected theme, the shared contract stylesheet
        and the full registry, for the template to render stylesheet links from.
    """
    cookie_key = theme_from_cookie(requested_theme)
    if cookie_key:
        return _theme_config(cookie_key, AVAILABLE_THEMES[cookie_key])

    selected_theme_key = os.getenv("DIFFLICIOUS_THEME", DEFAULT_THEME)

    if looks_like_stylesheet_url(selected_theme_key):
        return _theme_config(selected_theme_key, theme_from_url(selected_theme_key))

    # An unknown name falls back rather than failing: a typo in a shell profile
    # should not stop the tool starting. The CLI validates up front and reports
    # the mistake, which is where a user can actually act on it.
    if selected_theme_key not in AVAILABLE_THEMES:
        selected_theme_key = DEFAULT_THEME

    return _theme_config(selected_theme_key, AVAILABLE_THEMES[selected_theme_key])


def get_font_config() -> dict[str, Any]:
    """Get font configuration based on environment variables.

    Returns:
        Dictionary containing selected font, available fonts, and Google Fonts status.
    """
    # Get font selection from environment variable with default
    selected_font_key = os.getenv("DIFFLICIOUS_FONT", "jetbrains-mono")

    # Validate font selection and fallback to default
    if selected_font_key not in AVAILABLE_FONTS:
        selected_font_key = "jetbrains-mono"

    selected_font = AVAILABLE_FONTS[selected_font_key]

    # Font configuration for templates
    return {
        "selected_font_key": selected_font_key,
        "selected_font": selected_font,
        "available_fonts": AVAILABLE_FONTS,
        "google_fonts_enabled": os.getenv(
            "DIFFLICIOUS_DISABLE_GOOGLE_FONTS", "false"
        ).lower()
        != "true",
    }
