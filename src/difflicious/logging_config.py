"""Logging configuration for Difflicious application."""

import logging
import sys


class DiffliciousFormatter(logging.Formatter):
    """Custom formatter that provides clean output for user-facing messages."""

    def format(self, record: logging.LogRecord) -> str:
        """Format log record with appropriate styling.

        Args:
            record: Log record to format

        Returns:
            Formatted log message
        """
        # For INFO level messages from difflicious modules, show clean output
        if record.levelno == logging.INFO and record.name.startswith("difflicious"):
            return record.getMessage()

        # For other levels or external modules, use default formatting
        return super().format(record)


def configure_logging(debug: bool = False) -> None:
    """Configure logging for Difflicious application.

    In debug mode: Show all logs including Flask/Werkzeug internals
    In normal mode: Show only essential user-facing messages

    Args:
        debug: Whether to enable debug mode with verbose logging
    """
    # Remove any existing handlers
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    if debug:
        # Debug mode: verbose output with full details
        logging.basicConfig(
            level=logging.DEBUG,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            stream=sys.stdout,
        )

        # Set all loggers to DEBUG
        logging.getLogger("difflicious").setLevel(logging.DEBUG)
        logging.getLogger("werkzeug").setLevel(logging.DEBUG)
        logging.getLogger("watchdog").setLevel(logging.DEBUG)

    else:
        # Normal mode: clean output for user-facing messages only
        # Configure root logger to WARNING (to suppress most library output)
        logging.basicConfig(
            level=logging.WARNING,
            format="%(message)s",
            stream=sys.stderr,
        )

        # Create a separate handler for difflicious messages
        difflicious_logger = logging.getLogger("difflicious")
        difflicious_logger.setLevel(logging.INFO)
        difflicious_logger.propagate = False

        # Create handler that outputs to stdout with clean formatting
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)
        handler.setFormatter(DiffliciousFormatter())
        difflicious_logger.addHandler(handler)

        # Suppress Flask/Werkzeug request logs (but keep errors)
        logging.getLogger("werkzeug").setLevel(logging.ERROR)

        # Suppress watchdog debug messages
        logging.getLogger("watchdog").setLevel(logging.ERROR)


def get_logger(name: str) -> logging.Logger:
    """Get a logger for a Difflicious module.

    Args:
        name: Name of the module (typically __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)
