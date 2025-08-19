"""Command-line interface for Difflicious."""

import click

from difflicious import __version__
from difflicious.app import run_server


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
def main(port: int, host: str, debug: bool, list_fonts: bool) -> None:
    """Start the Difflicious web application for git diff visualization.

    Font customization:
    Set DIFFLICIOUS_FONT to one of: fira-code, jetbrains-mono, source-code-pro,
    ibm-plex-mono, roboto-mono, inconsolata (default: jetbrains-mono)

    Set DIFFLICIOUS_DISABLE_GOOGLE_FONTS=true to disable Google Fonts CDN loading.
    """
    if list_fonts:
        from difflicious.app import create_app

        app = create_app()
        with app.app_context():
            click.echo("Available fonts:")
            # Access the font config from the app context
            import os

            AVAILABLE_FONTS = {
                "fira-code": "Fira Code",
                "jetbrains-mono": "JetBrains Mono (default)",
                "source-code-pro": "Source Code Pro",
                "ibm-plex-mono": "IBM Plex Mono",
                "roboto-mono": "Roboto Mono",
                "inconsolata": "Inconsolata",
            }
            current_font = os.getenv("DIFFLICIOUS_FONT", "jetbrains-mono")
            for key, name in AVAILABLE_FONTS.items():
                marker = " ← currently selected" if key == current_font else ""
                click.echo(f"  {key}: {name}{marker}")
            click.echo(f"\nUsage: export DIFFLICIOUS_FONT={current_font}")
        return

    click.echo(f"Starting Difflicious v{__version__}")
    click.echo(f"Server will run at http://{host}:{port}")

    if debug:
        click.echo("🔧 Debug mode enabled - server will auto-reload on changes")

    try:
        run_server(host=host, port=port, debug=debug)
    except KeyboardInterrupt:
        click.echo("\n👋 Shutting down Difflicious server")


if __name__ == "__main__":
    main()
