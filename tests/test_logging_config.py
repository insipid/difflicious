"""Tests for logging configuration."""

import logging

from difflicious.logging_config import DiffliciousFormatter, configure_logging


class TestDiffliciousFormatter:
    """Test cases for DiffliciousFormatter."""

    def test_format_info_level_difflicious_module(self):
        """Test formatting of INFO level messages from difflicious modules."""
        formatter = DiffliciousFormatter()
        record = logging.LogRecord(
            name="difflicious.cli",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="Test message",
            args=(),
            exc_info=None,
        )

        result = formatter.format(record)
        assert result == "Test message"

    def test_format_debug_level(self):
        """Test formatting of DEBUG level messages."""
        formatter = DiffliciousFormatter()
        record = logging.LogRecord(
            name="difflicious.cli",
            level=logging.DEBUG,
            pathname="",
            lineno=0,
            msg="Debug message",
            args=(),
            exc_info=None,
        )

        result = formatter.format(record)
        # Debug should use default formatting (not clean output)
        assert "Debug message" in result

    def test_format_external_module(self):
        """Test formatting of messages from external modules."""
        formatter = DiffliciousFormatter()
        record = logging.LogRecord(
            name="werkzeug",
            level=logging.INFO,
            pathname="",
            lineno=0,
            msg="External message",
            args=(),
            exc_info=None,
        )

        result = formatter.format(record)
        # External modules should use default formatting
        assert "External message" in result


class TestConfigureLogging:
    """Test cases for configure_logging function."""

    def setup_method(self):
        """Reset logging configuration before each test."""
        # Remove all handlers from root logger
        root_logger = logging.getLogger()
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)

        # Remove handlers from difflicious logger
        difflicious_logger = logging.getLogger("difflicious")
        for handler in difflicious_logger.handlers[:]:
            difflicious_logger.removeHandler(handler)

    def test_debug_mode_configuration(self):
        """Test logging configuration in debug mode."""
        configure_logging(debug=True)

        root_logger = logging.getLogger()
        assert root_logger.level == logging.DEBUG

        difflicious_logger = logging.getLogger("difflicious")
        assert difflicious_logger.level == logging.DEBUG

        werkzeug_logger = logging.getLogger("werkzeug")
        assert werkzeug_logger.level == logging.DEBUG

    def test_normal_mode_configuration(self):
        """Test logging configuration in normal mode."""
        configure_logging(debug=False)

        root_logger = logging.getLogger()
        assert root_logger.level == logging.WARNING

        difflicious_logger = logging.getLogger("difflicious")
        assert difflicious_logger.level == logging.INFO

        werkzeug_logger = logging.getLogger("werkzeug")
        assert werkzeug_logger.level == logging.ERROR

    def test_normal_mode_difflicious_handler(self):
        """Test that difflicious logger has proper handler in normal mode."""
        configure_logging(debug=False)

        difflicious_logger = logging.getLogger("difflicious")
        assert len(difflicious_logger.handlers) > 0

        # Should have a StreamHandler
        handlers = [
            h
            for h in difflicious_logger.handlers
            if isinstance(h, logging.StreamHandler)
        ]
        assert len(handlers) > 0

        # Handler should use DiffliciousFormatter
        handler = handlers[0]
        assert isinstance(handler.formatter, DiffliciousFormatter)

    def test_normal_mode_suppresses_werkzeug(self):
        """Test that werkzeug logs are suppressed in normal mode."""
        configure_logging(debug=False)

        werkzeug_logger = logging.getLogger("werkzeug")
        # Should be set to ERROR to suppress INFO/DEBUG logs
        assert werkzeug_logger.level == logging.ERROR

    def test_debug_mode_includes_werkzeug(self):
        """Test that werkzeug logs are included in debug mode."""
        configure_logging(debug=True)

        werkzeug_logger = logging.getLogger("werkzeug")
        assert werkzeug_logger.level == logging.DEBUG

    def test_configure_removes_existing_handlers(self):
        """Test that configure_logging removes existing handlers."""
        # Add a test handler
        root_logger = logging.getLogger()
        test_handler = logging.StreamHandler()
        root_logger.addHandler(test_handler)

        initial_handler_count = len(root_logger.handlers)
        assert initial_handler_count > 0

        # Configure logging should remove existing handlers
        configure_logging(debug=False)

        # Should have different handlers now
        assert test_handler not in root_logger.handlers

    def test_difflicious_logger_propagate_setting(self):
        """Test that difflicious logger propagate is set correctly."""
        configure_logging(debug=False)

        difflicious_logger = logging.getLogger("difflicious")
        # In normal mode, should not propagate to avoid duplicate output
        assert difflicious_logger.propagate is False

    def test_watchdog_logger_suppressed_in_normal_mode(self):
        """Test that watchdog logger is suppressed in normal mode."""
        configure_logging(debug=False)

        watchdog_logger = logging.getLogger("watchdog")
        assert watchdog_logger.level == logging.ERROR
