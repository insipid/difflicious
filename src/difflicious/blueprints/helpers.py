"""Helper functions for Flask blueprints."""

from typing import Any, Optional

from flask import Response, jsonify


def error_response(
    message: str, code: int = 400, context: Optional[dict[str, Any]] = None
) -> tuple[Response, int]:
    """Create a standardized error response for API endpoints.

    Args:
        message: Error message to display
        code: HTTP status code (default: 400)
        context: Additional context data to include in response

    Returns:
        Tuple of (JSON response, status code)
    """
    response_data: dict[str, Any] = {
        "status": "error",
        "message": message,
        "code": code,
    }

    if context:
        response_data.update(context)

    return jsonify(response_data), code
