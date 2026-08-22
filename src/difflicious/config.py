"""Centralized configuration for Difflicious application."""

import os
from typing import Any

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
}

THEME_CONTRACT_FILE = "_contract.css"


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


def get_theme_config() -> dict[str, Any]:
    """Get theme configuration based on environment variables.

    Returns:
        Dictionary containing the selected theme, the shared contract stylesheet
        and the full registry, for the template to render stylesheet links from.
    """
    selected_theme_key = os.getenv("DIFFLICIOUS_THEME", DEFAULT_THEME)

    if looks_like_stylesheet_url(selected_theme_key):
        return {
            "selected_theme_key": selected_theme_key,
            "selected_theme": theme_from_url(selected_theme_key),
            "available_themes": AVAILABLE_THEMES,
            "contract_file": THEME_CONTRACT_FILE,
        }

    # An unknown name falls back rather than failing: a typo in a shell profile
    # should not stop the tool starting. The CLI validates up front and reports
    # the mistake, which is where a user can actually act on it.
    if selected_theme_key not in AVAILABLE_THEMES:
        selected_theme_key = DEFAULT_THEME

    return {
        "selected_theme_key": selected_theme_key,
        "selected_theme": AVAILABLE_THEMES[selected_theme_key],
        "available_themes": AVAILABLE_THEMES,
        "contract_file": THEME_CONTRACT_FILE,
    }


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
