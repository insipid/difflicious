"""Tests for the Flask application."""

import pytest

from difflicious.app import create_app


@pytest.fixture
def app():
    """Create a test Flask application."""
    app = create_app()
    app.config["TESTING"] = True
    return app


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


def test_index_route(client):
    """Test that the index route returns the main page."""
    response = client.get("/")
    assert response.status_code == 200
    assert b"Difflicious" in response.data
    assert b"Git Diff Visualization" in response.data


def test_api_status_route(client):
    """Test that the API status endpoint returns JSON."""
    response = client.get("/api/status")
    assert response.status_code == 200
    assert response.is_json

    data = response.get_json()
    assert "status" in data
    assert data["status"] == "ok"
    assert "git_available" in data
    assert "current_branch" in data
    assert "files_changed" in data


def test_api_branches_route(client):
    """Test that the API branches endpoint returns JSON."""
    response = client.get("/api/branches")
    assert response.status_code == 200
    assert response.is_json

    data = response.get_json()
    assert "status" in data
    assert data["status"] == "ok"
    assert "branches" in data

    branches = data["branches"]
    assert "all" in branches
    assert "current" in branches
    assert "default" in branches
    assert "others" in branches

    assert isinstance(branches["all"], list)
    assert isinstance(branches["others"], list)


def test_api_diff_route(client):
    """Test that the API diff endpoint returns JSON."""
    response = client.get("/api/diff")
    assert response.status_code == 200
    assert response.is_json

    data = response.get_json()
    assert "status" in data
    assert data["status"] == "ok"
    assert "groups" in data
    assert isinstance(data["groups"], dict)
    assert "untracked" in data["groups"]
    assert "unstaged" in data["groups"]
    assert "staged" in data["groups"]


def test_api_diff_route_with_base_ref(client):
    """Test that the API diff endpoint accepts base_ref and forwards it."""
    response = client.get("/api/diff?base_ref=feature-x")
    assert response.status_code == 200
    assert response.is_json

    data = response.get_json()
    assert data["status"] == "ok"
    assert data.get("base_ref") == "feature-x"


class TestAPIDiffCommitComparison:
    """Test cases for API diff endpoint base_ref functionality."""

    def test_api_diff_with_base_ref_parameter(self, client):
        """Test API diff endpoint with base_ref parameter."""
        response = client.get("/api/diff?base_ref=abc123")
        assert response.status_code == 200
        assert response.is_json

        data = response.get_json()
        assert data["status"] == "ok"
        assert data["base_ref"] == "abc123"
        assert "groups" in data
        assert isinstance(data["groups"], dict)

    def test_api_diff_ignores_target_commit_parameter(self, client):
        """Target commit is ignored; API still returns ok and includes base_ref when set."""
        response = client.get("/api/diff?target_commit=def456")
        assert response.status_code == 200
        assert response.is_json

        data = response.get_json()
        assert data["status"] == "ok"
        assert "base_ref" in data
        assert "groups" in data
        assert isinstance(data["groups"], dict)

    def test_api_diff_with_base_ref_and_other_params(self, client):
        """Test API diff endpoint with base_ref and other parameters."""
        response = client.get(
            "/api/diff?base_ref=abc123&unstaged=true&untracked=false&file=test.txt"
        )
        assert response.status_code == 200
        assert response.is_json

        data = response.get_json()
        assert data["status"] == "ok"
        assert data["base_ref"] == "abc123"
        assert data["unstaged"] is True
        assert data["untracked"] is False
        assert data["file_filter"] == "test.txt"
        assert "groups" in data
        assert isinstance(data["groups"], dict)

    def test_api_diff_backward_compatibility(self, client):
        """Test API diff endpoint maintains backward compatibility."""
        # Test traditional parameters still work
        response = client.get("/api/diff?unstaged=true&untracked=false&file=test.txt")
        assert response.status_code == 200
        assert response.is_json

        data = response.get_json()
        assert data["status"] == "ok"
        assert data["unstaged"] is True
        assert data["untracked"] is False
        assert data["file_filter"] == "test.txt"
        assert "base_ref" in data
        assert "groups" in data
        assert isinstance(data["groups"], dict)

    def test_api_diff_empty_base_ref_parameter(self, client):
        """Test API diff endpoint with empty base_ref parameter."""
        response = client.get("/api/diff?base_ref=")
        assert response.status_code == 200
        assert response.is_json

        data = response.get_json()
        assert data["status"] == "ok"
        assert data.get("base_ref") == ""
        assert "groups" in data
        assert isinstance(data["groups"], dict)

    def test_api_diff_commit_parameters_with_special_characters(self, client):
        """Test API diff endpoint handles base_ref with various characters."""
        # Test with branch name containing slashes
        response = client.get("/api/diff?base_ref=feature/new-ui")
        assert response.status_code == 200

        data = response.get_json()
        assert data["base_ref"] == "feature/new-ui"

        # Test with HEAD references
        response = client.get("/api/diff?base_ref=HEAD~1")
        assert response.status_code == 200

        data = response.get_json()
        assert data["base_ref"] == "HEAD~1"

    def test_api_diff_response_format_consistency(self, client):
        """Test API diff endpoint response format is consistent."""
        # Test without commit parameters
        response1 = client.get("/api/diff")
        data1 = response1.get_json()

        # Test with commit parameters
        response2 = client.get("/api/diff?base_commit=abc123")
        data2 = response2.get_json()

        # Both should have the same basic structure
        required_fields = [
            "status",
            "groups",
            "unstaged",
            "untracked",
            "file_filter",
            "total_files",
        ]
        for field in required_fields:
            assert field in data1
            assert field in data2

        # base_ref should be present in both
        assert "base_ref" in data1
        assert "base_ref" in data2
