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
