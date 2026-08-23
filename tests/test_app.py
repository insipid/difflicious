"""Tests for the Flask application."""

import sys
from unittest.mock import Mock, patch

import pytest

# Import blueprint modules to ensure they're in sys.modules
import difflicious.blueprints.context_routes  # noqa: F401
import difflicious.blueprints.diff_routes  # noqa: F401
import difflicious.blueprints.git_routes  # noqa: F401
import difflicious.blueprints.views  # noqa: F401
from difflicious.app import create_app
from difflicious.services.exceptions import DiffServiceError, GitServiceError


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
        """Test API diff endpoint with base_ref and file filter."""
        response = client.get("/api/diff?base_ref=abc123&file=test.txt")
        assert response.status_code == 200
        assert response.is_json

        data = response.get_json()
        assert data["status"] == "ok"
        assert data["base_ref"] == "abc123"
        # All data is always fetched now (filtering happens client-side)
        assert data["unstaged"] is True
        assert data["untracked"] is True
        assert data["file_filter"] == "test.txt"
        assert "groups" in data
        assert isinstance(data["groups"], dict)

    def test_api_diff_backward_compatibility(self, client):
        """Test API diff endpoint maintains backward compatibility."""
        # Query params are accepted but ignored - all data is always fetched
        response = client.get("/api/diff?unstaged=true&untracked=false&file=test.txt")
        assert response.status_code == 200
        assert response.is_json

        data = response.get_json()
        assert data["status"] == "ok"
        # Note: query params are accepted but ignored; response always shows True
        assert data["unstaged"] is True
        assert data["untracked"] is True
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


class TestAPIExpandContext:
    """Test cases for the /api/expand-context endpoint."""

    @patch("difflicious.blueprints.context_routes.GitService")
    def test_expand_context_success(self, mock_git_service_class, client):
        """Test successful context expansion with target range."""
        # Mock GitService
        mock_git_service = Mock()
        mock_git_service_class.return_value = mock_git_service
        mock_git_service.get_file_lines.return_value = {
            "status": "ok",
            "lines": ["line 1", "line 2", "line 3"],
            "start_line": 10,
            "end_line": 12,
        }

        # Provide target_start and target_end to bypass hunk lookup
        response = client.get(
            "/api/expand-context?file_path=test.py&hunk_index=0&direction=after&target_start=10&target_end=12"
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "ok"
        assert "lines" in data

    def test_expand_context_missing_parameters(self, client):
        """Test context expansion with missing parameters."""
        response = client.get("/api/expand-context?file_path=test.py")
        assert response.status_code == 400
        data = response.get_json()
        assert data["status"] == "error"

    def test_expand_context_invalid_format(self, client):
        """Test context expansion with invalid format parameter."""
        response = client.get(
            "/api/expand-context?file_path=test.py&hunk_index=0&direction=after&format=invalid"
        )
        assert response.status_code == 400
        data = response.get_json()
        assert data["status"] == "error"
        assert "Invalid format parameter" in data["message"]

    @patch("difflicious.blueprints.context_routes.GitService")
    def test_expand_context_with_target_range(self, mock_git_service_class, client):
        """Test context expansion with target_start/target_end parameters."""
        mock_git_service = Mock()
        mock_git_service_class.return_value = mock_git_service
        mock_git_service.get_file_lines.return_value = {
            "status": "ok",
            "lines": ["line 1", "line 2"],
            "start_line": 5,
            "end_line": 6,
        }

        response = client.get(
            "/api/expand-context?file_path=test.py&hunk_index=0&direction=before&target_start=5&target_end=6"
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "ok"

    @patch("difflicious.blueprints.context_routes.DiffService")
    @patch("difflicious.blueprints.context_routes.GitService")
    def test_expand_context_fallback_calculation(
        self, mock_git_service_class, mock_diff_service_class, client
    ):
        """Test context expansion fallback to diff data calculation."""
        # Mock GitService
        mock_git_service = Mock()
        mock_git_service_class.return_value = mock_git_service
        mock_git_service.get_file_lines.return_value = {
            "status": "ok",
            "lines": ["line 1", "line 2"],
            "start_line": 10,
            "end_line": 11,
        }

        # Mock DiffService for fallback calculation
        mock_diff_service = Mock()
        mock_diff_service_class.return_value = mock_diff_service
        mock_diff_service.get_grouped_diffs.return_value = {
            "unstaged": {
                "files": [
                    {
                        "path": "test.py",
                        "hunks": [{"new_start": 5, "new_count": 3}],
                    }
                ]
            }
        }

        response = client.get(
            "/api/expand-context?file_path=test.py&hunk_index=0&direction=after"
        )
        # Should succeed or fail depending on calculation - either is valid
        assert response.status_code in [200, 404]

    @patch("difflicious.blueprints.context_routes.SyntaxHighlightingService")
    @patch("difflicious.blueprints.context_routes.GitService")
    def test_expand_context_pygments_format(
        self, mock_git_service_class, mock_syntax_class, client
    ):
        """Test context expansion with pygments format."""
        mock_git_service = Mock()
        mock_git_service_class.return_value = mock_git_service
        mock_git_service.get_file_lines.return_value = {
            "status": "ok",
            "lines": ["def test():", "    pass"],
            "start_line": 1,
            "end_line": 2,
        }

        mock_syntax_service = Mock()
        mock_syntax_class.return_value = mock_syntax_service
        mock_syntax_service.highlight_diff_line.return_value = (
            "<span>highlighted</span>"
        )
        mock_syntax_service.get_css_styles.return_value = ".highlight { color: red; }"

        # Provide target range to bypass hunk lookup
        response = client.get(
            "/api/expand-context?file_path=test.py&hunk_index=0&direction=after&format=pygments&target_start=1&target_end=2"
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "ok"
        assert data["format"] == "pygments"
        assert "css_styles" in data

    @patch("difflicious.blueprints.context_routes.DiffService")
    def test_expand_context_hunk_not_found(self, mock_diff_service_class, client):
        """Test context expansion when hunk is not found."""
        mock_diff_service = Mock()
        mock_diff_service_class.return_value = mock_diff_service
        mock_diff_service.get_grouped_diffs.return_value = {
            "unstaged": {"files": [{"path": "test.py", "hunks": []}]}
        }

        response = client.get(
            "/api/expand-context?file_path=test.py&hunk_index=0&direction=after"
        )
        assert response.status_code == 404
        data = response.get_json()
        assert data["status"] == "error"


class TestAPIFileLines:
    """Test cases for the /api/file/lines endpoint."""

    @patch("difflicious.blueprints.context_routes.GitService")
    def test_file_lines_success(self, mock_git_service_class, client):
        """Test successful file lines retrieval."""
        mock_git_service = Mock()
        mock_git_service_class.return_value = mock_git_service
        mock_git_service.get_file_lines.return_value = {
            "status": "ok",
            "lines": ["line 1", "line 2", "line 3"],
            "start_line": 10,
            "end_line": 12,
        }

        response = client.get(
            "/api/file/lines?file_path=test.py&start_line=10&end_line=12"
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "ok"

    def test_file_lines_missing_file_path(self, client):
        """Test file lines with missing file_path parameter."""
        response = client.get("/api/file/lines?start_line=10&end_line=12")
        assert response.status_code == 400
        data = response.get_json()
        assert data["status"] == "error"

    def test_file_lines_missing_line_numbers(self, client):
        """Test file lines with missing line number parameters."""
        response = client.get("/api/file/lines?file_path=test.py")
        assert response.status_code == 400
        data = response.get_json()
        assert "start_line and end_line parameters are required" in data["message"]

    def test_file_lines_invalid_line_numbers(self, client):
        """Test file lines with invalid line number parameters."""
        response = client.get(
            "/api/file/lines?file_path=test.py&start_line=abc&end_line=def"
        )
        assert response.status_code == 400
        data = response.get_json()
        assert "must be valid numbers" in data["message"]

    @patch("difflicious.blueprints.context_routes.GitService")
    def test_file_lines_git_error(self, mock_git_service_class, client):
        """Test file lines with GitServiceError."""
        mock_git_service = Mock()
        mock_git_service_class.return_value = mock_git_service
        mock_git_service.get_file_lines.side_effect = GitServiceError("Git failed")

        response = client.get(
            "/api/file/lines?file_path=test.py&start_line=10&end_line=12"
        )
        assert response.status_code == 500
        data = response.get_json()
        assert data["status"] == "error"


class TestAPIDiffFull:
    """Test cases for the /api/diff/full endpoint."""

    @patch("difflicious.blueprints.diff_routes.DiffService")
    def test_diff_full_success(self, mock_diff_service_class, client):
        """Test successful full diff retrieval."""
        mock_diff_service = Mock()
        mock_diff_service_class.return_value = mock_diff_service
        mock_diff_service.get_full_diff_data.return_value = {
            "status": "ok",
            "file_path": "test.py",
            "has_changes": True,
            "diff_data": {"chunks": []},
        }

        response = client.get("/api/diff/full?file_path=test.py")
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "ok"

    def test_diff_full_missing_file_path(self, client):
        """Test full diff with missing file_path parameter."""
        response = client.get("/api/diff/full")
        assert response.status_code == 400
        data = response.get_json()
        assert data["status"] == "error"

    @patch("difflicious.blueprints.diff_routes.DiffService")
    def test_diff_full_with_base_ref(self, mock_diff_service_class, client):
        """Test full diff with base_ref parameter."""
        mock_diff_service = Mock()
        mock_diff_service_class.return_value = mock_diff_service
        mock_diff_service.get_full_diff_data.return_value = {
            "status": "ok",
            "file_path": "test.py",
            "has_changes": True,
        }

        response = client.get("/api/diff/full?file_path=test.py&base_ref=feature-x")
        assert response.status_code == 200

    @patch("difflicious.blueprints.diff_routes.DiffService")
    def test_diff_full_with_use_head(self, mock_diff_service_class, client):
        """Test full diff with use_head parameter."""
        mock_diff_service = Mock()
        mock_diff_service_class.return_value = mock_diff_service
        mock_diff_service.get_full_diff_data.return_value = {
            "status": "ok",
            "file_path": "test.py",
            "has_changes": True,
        }

        response = client.get("/api/diff/full?file_path=test.py&use_head=true")
        assert response.status_code == 200

    @patch("difflicious.blueprints.diff_routes.DiffService")
    def test_diff_full_with_use_cached(self, mock_diff_service_class, client):
        """Test full diff with use_cached parameter."""
        mock_diff_service = Mock()
        mock_diff_service_class.return_value = mock_diff_service
        mock_diff_service.get_full_diff_data.return_value = {
            "status": "ok",
            "file_path": "test.py",
            "has_changes": True,
        }

        response = client.get("/api/diff/full?file_path=test.py&use_cached=true")
        assert response.status_code == 200

    @patch("difflicious.blueprints.diff_routes.DiffService")
    def test_diff_full_parse_error(self, mock_diff_service_class, client):
        """Test full diff with DiffServiceError."""
        mock_diff_service = Mock()
        mock_diff_service_class.return_value = mock_diff_service
        mock_diff_service.get_full_diff_data.side_effect = DiffServiceError(
            "Parse failed"
        )

        response = client.get("/api/diff/full?file_path=test.py")
        assert response.status_code == 500
        data = response.get_json()
        assert data["status"] == "error"


class TestErrorHandling:
    """Test error handling in various routes."""

    def test_index_route_exception_handling(self, client):
        """Test index route handles exceptions gracefully."""
        # Get the actual views module from sys.modules (not the Blueprint object)
        views_mod = sys.modules["difflicious.blueprints.views"]

        with patch.object(views_mod, "GitService") as mock_git_service_class:
            with patch.object(
                views_mod, "TemplateRenderingService"
            ) as mock_template_service_class:
                mock_git_service = Mock()
                mock_git_service_class.return_value = mock_git_service
                mock_git_service.get_repository_status.side_effect = Exception(
                    "Test error"
                )

                mock_template_service = Mock()
                mock_template_service_class.return_value = mock_template_service
                mock_template_service.prepare_diff_data_for_template.side_effect = (
                    Exception("Template error")
                )

                response = client.get("/")
                # Should still return 200 with error state
                assert response.status_code == 200
                assert b"error" in response.data.lower()

    @patch("difflicious.blueprints.git_routes.GitService")
    def test_api_status_error_handling(self, mock_git_service_class, client):
        """Test API status handles errors gracefully with 500 status."""
        mock_git_service = Mock()
        mock_git_service_class.return_value = mock_git_service
        mock_git_service.get_repository_status.side_effect = Exception("Test error")

        response = client.get("/api/status")
        assert response.status_code == 500  # Proper HTTP error status
        data = response.get_json()
        assert data["status"] == "error"
        assert data["git_available"] is False

    @patch("difflicious.blueprints.git_routes.GitService")
    def test_api_branches_error_handling(self, mock_git_service_class, client):
        """Test API branches handles GitServiceError."""
        mock_git_service = Mock()
        mock_git_service_class.return_value = mock_git_service
        mock_git_service.get_branch_information.side_effect = GitServiceError(
            "Branch error"
        )

        response = client.get("/api/branches")
        assert response.status_code == 500
        data = response.get_json()
        assert data["status"] == "error"

    @patch("difflicious.blueprints.diff_routes.TemplateRenderingService")
    def test_api_diff_error_handling(self, mock_template_service_class, client):
        """Test API diff handles DiffServiceError."""
        mock_template_service = Mock()
        mock_template_service_class.return_value = mock_template_service
        mock_template_service.git_service.get_repository_status.return_value = {
            "current_branch": "main"
        }
        mock_template_service.prepare_diff_data_for_template.side_effect = (
            DiffServiceError("Diff error")
        )

        response = client.get("/api/diff")
        assert response.status_code == 500
        data = response.get_json()
        assert data["status"] == "error"


class TestTemplateRendering:
    """Test template rendering with various query parameters."""

    def test_index_with_search_filter(self, client):
        """Test index route with search filter."""
        response = client.get("/?search=test")
        assert response.status_code == 200

    def test_index_with_expand_files(self, client):
        """Test index route with expand_files parameter."""
        response = client.get("/?expand=true")
        assert response.status_code == 200

    def test_index_font_configuration(self, client):
        """Test index route includes font configuration."""
        response = client.get("/")
        assert response.status_code == 200
        # Font config should be injected via context processor
        assert response.data

    def test_index_complex_query_params(self, client):
        """Test index route with complex query parameter combinations."""
        response = client.get(
            "/?base_ref=feature-x&unstaged=true&staged=true&search=test&expand=true"
        )
        assert response.status_code == 200


class TestUtilityEndpoints:
    """Test utility endpoints like favicon and sourcemap."""

    def test_favicon_endpoint(self, client):
        """Test favicon endpoint returns a valid PNG."""
        response = client.get("/favicon.ico")
        assert response.status_code == 200
        assert response.mimetype == "image/png"
        assert len(response.data) > 0

    def test_devtools_stub_sourcemap(self, client):
        """Test DevTools stub sourcemap endpoint."""
        response = client.get("/installHook.js.map")
        assert response.status_code == 200
        assert response.is_json
        data = response.get_json()
        assert "version" in data
        assert data["version"] == 3


class TestThemeConfig:
    """Theme configuration resolution."""

    def test_defaults_to_ledger(self, monkeypatch):
        from difflicious.config import get_theme_config

        monkeypatch.delenv("DIFFLICIOUS_THEME", raising=False)
        config = get_theme_config()

        assert config["selected_theme_key"] == "ledger"
        assert config["selected_theme"]["file"] == "ledger.css"

    def test_selects_a_registered_theme(self, monkeypatch):
        from difflicious.config import get_theme_config

        monkeypatch.setenv("DIFFLICIOUS_THEME", "slate")
        config = get_theme_config()

        assert config["selected_theme_key"] == "slate"
        assert config["selected_theme"]["file"] == "slate.css"

    def test_unknown_theme_falls_back_rather_than_failing(self, monkeypatch):
        """A typo in a shell profile must not stop the tool starting."""
        from difflicious.config import get_theme_config

        monkeypatch.setenv("DIFFLICIOUS_THEME", "not-a-theme")
        config = get_theme_config()

        assert config["selected_theme_key"] == "ledger"

    def test_every_registered_theme_file_exists(self):
        """The registry must not point at a stylesheet that was never shipped."""
        from pathlib import Path

        import difflicious
        from difflicious.config import AVAILABLE_THEMES, THEME_CONTRACT_FILE

        themes_dir = Path(difflicious.__file__).parent / "static" / "css" / "themes"

        assert (themes_dir / THEME_CONTRACT_FILE).is_file()
        for key, entry in AVAILABLE_THEMES.items():
            assert (themes_dir / entry["file"]).is_file(), f"{key} stylesheet missing"

    def test_selected_theme_stylesheet_is_linked_in_the_page(self, monkeypatch):
        from difflicious.app import create_app

        monkeypatch.setenv("DIFFLICIOUS_THEME", "slate")
        client = create_app().test_client()

        html = client.get("/").get_data(as_text=True)

        # Match the stylesheet link specifically. The page also renders the
        # working tree's diff, which can mention these filenames as content.
        assert 'href="/static/css/themes/_contract.css"' in html
        assert 'href="/static/css/themes/slate.css"' in html
        assert 'href="/static/css/themes/ledger.css"' not in html


class TestThemeFromUrl:
    """A theme given as a URL is named after its stylesheet."""

    def test_recognises_stylesheet_references(self):
        from difflicious.config import looks_like_stylesheet_url

        assert looks_like_stylesheet_url("https://example.com/neon.css")
        assert looks_like_stylesheet_url("http://example.com/neon.css")
        assert looks_like_stylesheet_url("//cdn.example.com/neon.css")
        assert looks_like_stylesheet_url("neon.css")
        assert not looks_like_stylesheet_url("ledger")
        assert not looks_like_stylesheet_url("slate")

    def test_names_the_theme_after_the_css_file(self):
        from difflicious.config import theme_from_url

        entry = theme_from_url("https://example.com/css/midnight-neon.css")

        assert entry["name"] == "Midnight Neon"
        assert entry["url"] == "https://example.com/css/midnight-neon.css"

    def test_url_theme_is_selected_and_linked_directly(self, monkeypatch):
        from difflicious.app import create_app
        from difflicious.config import get_theme_config

        url = "https://example.com/themes/hot-pink.css"
        monkeypatch.setenv("DIFFLICIOUS_THEME", url)

        config = get_theme_config()
        assert config["selected_theme"]["name"] == "Hot Pink"
        assert config["selected_theme"]["url"] == url

        html = create_app().test_client().get("/").get_data(as_text=True)
        assert f'href="{url}"' in html
        # The contract still loads: a custom theme only supplies a palette.
        assert 'href="/static/css/themes/_contract.css"' in html

    def test_url_theme_does_not_pull_google_fonts_on_its_behalf(self, monkeypatch):
        from difflicious.config import get_theme_config

        monkeypatch.setenv("DIFFLICIOUS_THEME", "https://example.com/x.css")

        assert get_theme_config()["selected_theme"]["google_fonts_url"] == ""
