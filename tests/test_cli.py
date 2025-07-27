"""Tests for the CLI module."""

import pytest
from click.testing import CliRunner
from difflicious.cli import main
from difflicious import __version__


def test_cli_version():
    """Test that the CLI returns the correct version."""
    runner = CliRunner()
    result = runner.invoke(main, ["--version"])
    assert result.exit_code == 0
    assert __version__ in result.output


def test_cli_help():
    """Test that the CLI shows help information."""
    runner = CliRunner()
    result = runner.invoke(main, ["--help"])
    assert result.exit_code == 0
    assert "Start the Difflicious web application" in result.output


def test_cli_default_run():
    """Test that the CLI runs with default options."""
    runner = CliRunner()
    result = runner.invoke(main)
    assert result.exit_code == 0
    assert "Starting Difflicious" in result.output
    assert "http://127.0.0.1:5000" in result.output


def test_cli_custom_port_and_host():
    """Test that the CLI accepts custom port and host options."""
    runner = CliRunner()
    result = runner.invoke(main, ["--port", "8080", "--host", "0.0.0.0"])
    assert result.exit_code == 0
    assert "http://0.0.0.0:8080" in result.output