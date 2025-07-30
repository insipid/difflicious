"""Service layer exceptions."""


class ServiceError(Exception):
    """Base exception for service layer errors."""

    pass


class DiffServiceError(ServiceError):
    """Exception raised by diff service operations."""

    pass


class GitServiceError(ServiceError):
    """Exception raised by git service operations."""

    pass
