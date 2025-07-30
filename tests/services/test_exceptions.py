"""Tests for service exceptions."""

from difflicious.services.exceptions import (
    DiffServiceError,
    GitServiceError,
    ServiceError,
)


def test_service_error_inheritance():
    """Test that ServiceError is an Exception."""
    error = ServiceError("Test error")

    assert isinstance(error, Exception)
    assert str(error) == "Test error"


def test_diff_service_error_inheritance():
    """Test that DiffServiceError inherits from ServiceError."""
    error = DiffServiceError("Diff error")

    assert isinstance(error, ServiceError)
    assert isinstance(error, Exception)
    assert str(error) == "Diff error"


def test_git_service_error_inheritance():
    """Test that GitServiceError inherits from ServiceError."""
    error = GitServiceError("Git error")

    assert isinstance(error, ServiceError)
    assert isinstance(error, Exception)
    assert str(error) == "Git error"


def test_exception_chaining():
    """Test exception chaining with service exceptions."""
    original_error = ValueError("Original error")

    try:
        raise DiffServiceError("Service error") from original_error
    except DiffServiceError as e:
        assert str(e) == "Service error"
        assert e.__cause__ is original_error
        assert isinstance(e.__cause__, ValueError)
