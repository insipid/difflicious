"""Tests for the CLI module."""

import os
from unittest.mock import patch

from click.testing import CliRunner

from difflicious import __version__
from difflicious.cli import main


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


@patch("difflicious.cli.run_server")
def test_cli_default_run(mock_run_server):
    """Test that the CLI runs with default options."""
    runner = CliRunner()
    result = runner.invoke(main)
    assert result.exit_code == 0
    assert "Starting Difflicious" in result.output
    assert "http://127.0.0.1:5000" in result.output
    mock_run_server.assert_called_once_with(host="127.0.0.1", port=5000, debug=False)


@patch("difflicious.cli.run_server")
def test_cli_custom_port_and_host(mock_run_server):
    """Test that the CLI accepts custom port and host options."""
    runner = CliRunner()
    result = runner.invoke(main, ["--port", "8080", "--host", "0.0.0.0"])
    assert result.exit_code == 0
    assert "http://0.0.0.0:8080" in result.output
    mock_run_server.assert_called_once_with(host="0.0.0.0", port=8080, debug=False)


@patch("difflicious.cli.run_server")
def test_cli_debug_mode(mock_run_server):
    """Test that the CLI accepts debug flag."""
    runner = CliRunner()
    result = runner.invoke(main, ["--debug"])
    assert result.exit_code == 0
    assert "Starting Difflicious" in result.output
    assert "🔧 Debug mode enabled" in result.output
    mock_run_server.assert_called_once_with(host="127.0.0.1", port=5000, debug=True)


class TestCLIFonts:
    """Test cases for CLI font listing functionality."""

    def test_cli_list_fonts(self):
        """Test that --list-fonts lists available fonts."""
        runner = CliRunner()
        result = runner.invoke(main, ["--list-fonts"])

        assert result.exit_code == 0
        assert "Available fonts:" in result.output
        assert "fira-code" in result.output
        assert "jetbrains-mono" in result.output
        assert "source-code-pro" in result.output

    def test_cli_list_fonts_shows_current(self):
        """Test that --list-fonts shows the currently selected font."""
        runner = CliRunner()
        result = runner.invoke(main, ["--list-fonts"])

        assert result.exit_code == 0
        # Should show current font marker (may depend on environment)
        assert (
            "JetBrains Mono" in result.output or "currently selected" in result.output
        )


class TestCLIErrorHandling:
    """Test error handling in CLI."""

    @patch("difflicious.cli.run_server")
    def test_cli_keyboard_interrupt(self, mock_run_server):
        """Test that CLI handles KeyboardInterrupt gracefully."""
        mock_run_server.side_effect = KeyboardInterrupt()

        runner = CliRunner()
        result = runner.invoke(main)

        assert result.exit_code == 0
        assert "Shutting down" in result.output

    @patch("difflicious.cli.run_server")
    def test_cli_server_startup_error(self, mock_run_server):
        """Test that CLI handles server startup errors."""
        mock_run_server.side_effect = Exception("Server failed to start")

        runner = CliRunner()
        result = runner.invoke(main)

        # Should exit with non-zero code due to unhandled exception
        assert result.exit_code != 0


class TestThemeSelection:
    """Theme selection via --theme / DIFFLICIOUS_THEME."""

    def test_list_themes_shows_registry_and_marks_default(self):
        runner = CliRunner()
        result = runner.invoke(main, ["--list-themes"])

        assert result.exit_code == 0
        assert "ledger" in result.output
        assert "slate" in result.output
        assert "(default)" in result.output

    def test_unknown_theme_is_rejected_with_the_valid_names(self):
        runner = CliRunner()
        result = runner.invoke(main, ["--theme", "nonsense"])

        assert result.exit_code != 0
        assert "unknown theme" in result.output
        assert "ledger" in result.output

    def test_theme_option_is_published_to_the_environment(self, monkeypatch):
        """The app factory reads DIFFLICIOUS_THEME, so --theme must set it."""
        monkeypatch.delenv("DIFFLICIOUS_THEME", raising=False)
        runner = CliRunner()

        with patch("difflicious.cli.run_server"):
            runner.invoke(main, ["--theme", "slate"])

        assert os.environ.get("DIFFLICIOUS_THEME") == "slate"


class TestThemeUrls:
    """A URL is a valid --theme value and bypasses registry validation."""

    def test_url_theme_is_accepted(self, monkeypatch):
        monkeypatch.delenv("DIFFLICIOUS_THEME", raising=False)
        runner = CliRunner()

        with patch("difflicious.cli.run_server"):
            result = runner.invoke(main, ["--theme", "https://example.com/neon.css"])

        assert result.exit_code == 0
        assert os.environ.get("DIFFLICIOUS_THEME") == "https://example.com/neon.css"

    def test_error_message_mentions_the_url_option(self):
        runner = CliRunner()
        result = runner.invoke(main, ["--theme", "nonsense"])

        assert result.exit_code != 0
        assert ".css" in result.output
