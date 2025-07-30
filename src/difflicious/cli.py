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
def main(port: int, host: str, debug: bool) -> None:
    """Start the Difflicious web application for git diff visualization."""
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
