"""Tests for the CLI module."""

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
    assert "Repository:" in result.output
    assert "Font:" in result.output
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


class TestCLIConfigurationDisplay:
    """Test cases for configuration display in CLI output."""

    @patch("difflicious.cli.run_server")
    def test_cli_shows_repository_path(self, mock_run_server):
        """Test that CLI displays repository path."""
        runner = CliRunner()
        result = runner.invoke(main)
        assert result.exit_code == 0
        assert "Repository:" in result.output

    @patch("difflicious.cli.run_server")
    def test_cli_shows_font_configuration(self, mock_run_server):
        """Test that CLI displays font configuration."""
        runner = CliRunner()
        result = runner.invoke(main)
        assert result.exit_code == 0
        assert "Font:" in result.output
        # Should show either "Google Fonts CDN" or "system fonts"
        assert "Google Fonts CDN" in result.output or "system fonts" in result.output

    @patch("difflicious.cli.run_server")
    def test_cli_shows_google_fonts_disabled(self, mock_run_server, monkeypatch):
        """Test that CLI shows when Google Fonts is disabled."""
        monkeypatch.setenv("DIFFLICIOUS_DISABLE_GOOGLE_FONTS", "true")
        runner = CliRunner()
        result = runner.invoke(main)
        assert result.exit_code == 0
        assert "system fonts" in result.output

    @patch("difflicious.cli.run_server")
    def test_cli_shows_custom_font(self, mock_run_server, monkeypatch):
        """Test that CLI shows custom font selection."""
        monkeypatch.setenv("DIFFLICIOUS_FONT", "fira-code")
        runner = CliRunner()
        result = runner.invoke(main)
        assert result.exit_code == 0
        assert "Fira Code" in result.output

    @patch("difflicious.cli.run_server")
    def test_cli_shows_watch_ignore_patterns(self, mock_run_server, monkeypatch):
        """Test that CLI shows custom watch ignore patterns."""
        monkeypatch.setenv("DIFFLICIOUS_WATCH_IGNORE", ".git,node_modules,__pycache__")
        runner = CliRunner()
        result = runner.invoke(main)
        assert result.exit_code == 0
        assert "Ignoring:" in result.output
        assert "node_modules" in result.output


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
