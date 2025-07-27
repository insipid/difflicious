"""Command-line interface for Difflicious."""

import click
from difflicious import __version__


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
def main(port: int, host: str) -> None:
    """Start the Difflicious web application for git diff visualization."""
    click.echo(f"Starting Difflicious v{__version__}")
    click.echo(f"Server will run at http://{host}:{port}")
    
    # TODO: Import and start Flask app when implemented
    click.echo("🚧 Flask backend not yet implemented - coming soon!")
    click.echo("Check the development progress at: https://github.com/insipid/difflicious")


if __name__ == "__main__":
    main()