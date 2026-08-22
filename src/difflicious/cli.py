"""Command-line interface for Difflicious."""

import os
from typing import Optional

import click

from difflicious import __version__
from difflicious.app import run_server


@click.command()
@click.version_option(version=__version__)
@click.option(
    "--port",
    "-p",
    default=5000,
    envvar="DIFFLICIOUS_PORT",
    help="Port to run the web server on (default: 5000)",
)
@click.option(
    "--host",
    "-h",
    default="127.0.0.1",
    envvar="DIFFLICIOUS_HOST",
    help="Host to bind the web server to (default: 127.0.0.1)",
)
@click.option(
    "--debug",
    is_flag=True,
    help="Run in debug mode with auto-reload",
)
@click.option(
    "--list-fonts",
    is_flag=True,
    help="List available fonts and exit",
)
@click.option(
    "--theme",
    default=None,
    envvar="DIFFLICIOUS_THEME",
    help="Colour theme to use (see --list-themes)",
)
@click.option(
    "--list-themes",
    is_flag=True,
    help="List available themes and exit",
)
@click.option(
    "--auto-reload/--no-auto-reload",
    default=True,
    help="Enable/disable auto-reload on file changes (default: enabled)",
    envvar="DIFFLICIOUS_AUTO_RELOAD",
)
@click.option(
    "--watch-debounce",
    default=1.0,
    type=float,
    help="Debounce delay in seconds for file watch events (default: 1.0)",
    envvar="DIFFLICIOUS_WATCH_DEBOUNCE",
)
def main(
    port: int,
    host: str,
    debug: bool,
    list_fonts: bool,
    theme: Optional[str],
    list_themes: bool,
    auto_reload: bool,
    watch_debounce: float,
) -> None:
    """Start the Difflicious web application for git diff visualization.

    Font customization:
    Set DIFFLICIOUS_FONT to one of: fira-code, jetbrains-mono, source-code-pro,
    ibm-plex-mono, roboto-mono, inconsolata (default: jetbrains-mono)

    Set DIFFLICIOUS_DISABLE_GOOGLE_FONTS=true to disable Google Fonts CDN loading.

    Theme:
    Set DIFFLICIOUS_THEME or pass --theme to choose a colour theme
    (see --list-themes; default: ledger)
    """
    if list_fonts:
        from difflicious.config import AVAILABLE_FONTS

        click.echo("Available fonts:")
        current_font = os.getenv("DIFFLICIOUS_FONT", "jetbrains-mono")
        for key, font_config in AVAILABLE_FONTS.items():
            name = font_config["name"]
            default_marker = " (default)" if key == "jetbrains-mono" else ""
            selection_marker = " ← currently selected" if key == current_font else ""
            click.echo(f"  {key}: {name}{default_marker}{selection_marker}")
        click.echo(f"\nUsage: export DIFFLICIOUS_FONT={current_font}")
        return

    if list_themes:
        from difflicious.config import AVAILABLE_THEMES, DEFAULT_THEME

        click.echo("Available themes:")
        current_theme = theme or os.getenv("DIFFLICIOUS_THEME", DEFAULT_THEME)
        for key, theme_entry in AVAILABLE_THEMES.items():
            default_marker = " (default)" if key == DEFAULT_THEME else ""
            selected = " \u2190 currently selected" if key == current_theme else ""
            click.echo(
                f"  {key}: {theme_entry['name']}{default_marker}{selected}\n"
                f"      {theme_entry['description']}"
            )
        click.echo(f"\nUsage: export DIFFLICIOUS_THEME={current_theme}")
        return

    # A bad theme name is worth failing on here, where the user can see and fix
    # it. The app itself falls back to the default so a stale shell profile
    # cannot stop it starting.
    if theme is not None:
        from difflicious.config import AVAILABLE_THEMES, looks_like_stylesheet_url

        if not looks_like_stylesheet_url(theme) and theme not in AVAILABLE_THEMES:
            raise click.BadParameter(
                f"unknown theme {theme!r}. "
                f"Available: {', '.join(sorted(AVAILABLE_THEMES))}, "
                f"or a URL ending in .css",
                param_hint="--theme",
            )
        os.environ["DIFFLICIOUS_THEME"] = theme

    # Validate watch-debounce parameter
    if not 0.1 <= watch_debounce <= 60.0:
        raise click.BadParameter(
            "watch-debounce must be between 0.1 and 60 seconds",
            param_hint="--watch-debounce",
        )

    # Check if we're in a git repository before starting server
    try:
        from git import InvalidGitRepositoryError, Repo

        try:
            Repo(os.getcwd())
        except InvalidGitRepositoryError:
            click.echo("")
            click.echo("❌ Error: Not a git repository", err=True)
            click.echo("", err=True)
            click.echo(
                "Difflicious must be run from within a git repository.", err=True
            )
            click.echo("", err=True)
            click.echo("To use difflicious:", err=True)
            click.echo(
                "  1. Navigate to a git repository: cd /path/to/your/repo", err=True
            )
            click.echo("  2. Run difflicious again", err=True)
            click.echo("", err=True)
            raise click.exceptions.Exit(1) from None
    except ImportError:
        # GitPython not available, skip check (will fail later in app)
        pass

    # Store auto-reload configuration in environment for app to access
    os.environ["DIFFLICIOUS_AUTO_RELOAD"] = str(auto_reload).lower()
    os.environ["DIFFLICIOUS_WATCH_DEBOUNCE"] = str(watch_debounce)

    click.echo(f"Starting Difflicious v{__version__}")
    click.echo(f"Server will run at http://{host}:{port}")

    if debug:
        click.echo("🔧 Debug mode enabled - server will auto-reload on changes")

    if auto_reload:
        click.echo(
            f"🔄 Auto-reload enabled (debounce: {watch_debounce}s) - page will refresh when files change"
        )
    else:
        click.echo("⏸️  Auto-reload disabled")

    try:
        run_server(host=host, port=port, debug=debug)
    except KeyboardInterrupt:
        click.echo("\n👋 Shutting down Difflicious server")


if __name__ == "__main__":
    main()
