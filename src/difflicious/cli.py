"""Command-line interface for Difflicious."""

import os

import click

from difflicious import __version__
from difflicious.app import run_server
from difflicious.logging_config import configure_logging


@click.command()
@click.version_option(version=__version__)
@click.option(
    "--port",
    default=5000,
    help="Port to run the web server on (default: 5000)",
)
@click.option(
    "--host",
    default="127.0.0.1",
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
    auto_reload: bool,
    watch_debounce: float,
) -> None:
    """Start the Difflicious web application for git diff visualization.

    Font customization:
    Set DIFFLICIOUS_FONT to one of: fira-code, jetbrains-mono, source-code-pro,
    ibm-plex-mono, roboto-mono, inconsolata (default: jetbrains-mono)

    Set DIFFLICIOUS_DISABLE_GOOGLE_FONTS=true to disable Google Fonts CDN loading.
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

    # Validate watch-debounce parameter
    if not 0.1 <= watch_debounce <= 60.0:
        raise click.BadParameter(
            "watch-debounce must be between 0.1 and 60 seconds",
            param_hint="--watch-debounce",
        )

    # Configure logging before any other output
    configure_logging(debug=debug)

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

    # Print startup messages using click.echo for consistency with tests
    click.echo(f"Starting Difflicious v{__version__}")
    click.echo(f"Server running at http://{host}:{port}")

    if debug:
        click.echo("🔧 Debug mode enabled - verbose logging active")

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
