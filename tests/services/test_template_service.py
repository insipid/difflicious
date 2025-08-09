"""Tests for TemplateRenderingService."""

from unittest.mock import patch

from difflicious.services.template_service import TemplateRenderingService


class TestTemplateRenderingService:
    """Test cases for TemplateRenderingService."""

    def setup_method(self):
        """Set up test fixtures."""
        self.service = TemplateRenderingService()

    def test_init(self):
        """Test service initialization."""
        assert self.service.diff_service is not None
        assert self.service.git_service is not None
        assert self.service.syntax_service is not None

    @patch("difflicious.services.template_service.DiffService")
    @patch("difflicious.services.template_service.GitService")
    @patch("difflicious.services.template_service.SyntaxHighlightingService")
    def test_prepare_diff_data_for_template_success(
        self, mock_syntax_service, mock_git_service, mock_diff_service
    ):
        """Test successful template data preparation."""
        # Setup mocks
        mock_diff_instance = mock_diff_service.return_value
        mock_git_instance = mock_git_service.return_value
        mock_syntax_instance = mock_syntax_service.return_value

        # Mock repository status
        mock_git_instance.get_repository_status.return_value = {
            "current_branch": "main",
            "git_available": True,
        }

        # Mock branch information
        mock_git_instance.get_branch_information.return_value = {
            "branches": {
                "all": ["main", "develop"],
                "current": "main",
                "default": "main",
            }
        }

        # Mock grouped diffs
        mock_diff_instance.get_grouped_diffs.return_value = {
            "unstaged": {
                "files": [
                    {
                        "path": "test.py",
                        "status": "modified",
                        "additions": 5,
                        "deletions": 2,
                        "hunks": [
                            {
                                "new_start": 1,
                                "new_count": 1,
                                "lines": [
                                    {
                                        "type": "change",
                                        "left": {
                                            "content": "old code",
                                            "line_num": 1,
                                            "type": "deletion",
                                        },
                                        "right": {
                                            "content": "new code",
                                            "line_num": 1,
                                            "type": "addition",
                                        },
                                    }
                                ],
                            }
                        ],
                    }
                ],
                "count": 1,
            }
        }

        # Mock syntax highlighting
        mock_syntax_instance.highlight_diff_line.return_value = "highlighted code"
        mock_syntax_instance.get_css_styles.return_value = ".highlight { color: blue; }"

        # Create new service instance to use mocks
        service = TemplateRenderingService()

        # Test
        result = service.prepare_diff_data_for_template(unstaged=True)

        # Assertions
        assert "repo_status" in result
        assert "branches" in result
        assert "groups" in result
        assert "total_files" in result
        assert "syntax_css" in result
        assert result["total_files"] == 1
        assert result["unstaged"] is True
        assert result["loading"] is False

    @patch("difflicious.services.template_service.DiffService")
    @patch("difflicious.services.template_service.GitService")
    @patch("difflicious.services.template_service.SyntaxHighlightingService")
    def test_prepare_diff_data_for_template_with_base_ref(
        self, mock_syntax_service, mock_git_service, mock_diff_service
    ):
        """Ensure base_ref is threaded through to DiffService."""
        mock_diff_instance = mock_diff_service.return_value
        mock_git_instance = mock_git_service.return_value
        mock_syntax_service.return_value.get_css_styles.return_value = ""

        mock_git_instance.get_repository_status.return_value = {
            "current_branch": "main"
        }
        mock_git_instance.get_branch_information.return_value = {
            "branches": {"all": ["main"], "default": "main"}
        }
        mock_diff_instance.get_grouped_diffs.return_value = {
            "unstaged": {"files": [], "count": 0},
            "staged": {"files": [], "count": 0},
        }

        service = TemplateRenderingService()
        service.prepare_diff_data_for_template(base_ref="feature-x")

        assert mock_diff_instance.get_grouped_diffs.called
        _, kwargs = mock_diff_instance.get_grouped_diffs.call_args
        assert kwargs.get("base_ref") == "feature-x"

    @patch("difflicious.services.template_service.DiffService")
    @patch("difflicious.services.template_service.GitService")
    @patch("difflicious.services.template_service.SyntaxHighlightingService")
    def test_prepare_diff_data_for_template_with_search_filter(
        self, mock_syntax_service, mock_git_service, mock_diff_service
    ):
        """Test template data preparation with search filter."""
        # Setup mocks
        mock_diff_instance = mock_diff_service.return_value
        mock_git_instance = mock_git_service.return_value
        mock_syntax_instance = mock_syntax_service.return_value

        # Mock repository status and branch info
        mock_git_instance.get_repository_status.return_value = {
            "current_branch": "main"
        }
        mock_git_instance.get_branch_information.return_value = {
            "branches": {"all": ["main"], "default": "main"}
        }

        # Mock grouped diffs with multiple files
        mock_diff_instance.get_grouped_diffs.return_value = {
            "unstaged": {
                "files": [
                    {
                        "path": "test.py",
                        "status": "modified",
                        "additions": 1,
                        "deletions": 1,
                        "hunks": [],
                    },
                    {
                        "path": "example.js",
                        "status": "modified",
                        "additions": 2,
                        "deletions": 0,
                        "hunks": [],
                    },
                    {
                        "path": "other.txt",
                        "status": "modified",
                        "additions": 0,
                        "deletions": 1,
                        "hunks": [],
                    },
                ],
                "count": 3,
            }
        }

        mock_syntax_instance.get_css_styles.return_value = ""

        # Create new service instance
        service = TemplateRenderingService()

        # Test with search filter
        result = service.prepare_diff_data_for_template(search_filter="test")

        # Should only include files matching "test"
        # When no base_commit is provided, unstaged and staged are combined into "changes"
        assert result["groups"]["changes"]["count"] == 1
        assert result["groups"]["changes"]["files"][0]["path"] == "test.py"

    def test_process_line_side_with_content(self):
        """Test processing line side with content."""
        line_side = {"content": "def hello():", "line_num": 1, "type": "addition"}

        result = self.service._process_line_side(line_side, "test.py")

        assert result is not None
        assert "highlighted_content" in result
        assert result["content"] == "def hello():"
        assert result["line_num"] == 1
        assert result["type"] == "addition"

    def test_process_line_side_without_content(self):
        """Test processing line side without content."""
        line_side = {"line_num": 1, "type": "context"}

        result = self.service._process_line_side(line_side, "test.py")

        assert result == line_side  # Should return unchanged

    def test_process_line_side_none(self):
        """Test processing None line side."""
        result = self.service._process_line_side(None, "test.py")

        assert result is None

    def test_can_expand_context_first_hunk_before(self):
        """Test context expansion for first hunk before."""
        hunks = [
            {"new_start": 5, "lines": []},  # Starts at line 5, can expand before
            {"new_start": 10, "lines": []},
        ]

        result = self.service._can_expand_context(hunks, 0, "before")
        assert result is True  # Can expand because doesn't start at line 1

    def test_can_expand_context_first_hunk_before_line_1(self):
        """Test context expansion for first hunk starting at line 1."""
        hunks = [
            {"new_start": 1, "lines": []},  # Starts at line 1, cannot expand before
            {"new_start": 10, "lines": []},
        ]

        result = self.service._can_expand_context(hunks, 0, "before")
        assert result is False  # Cannot expand because starts at line 1

    def test_can_expand_context_other_hunk_before(self):
        """Test context expansion for non-first hunk before."""
        hunks = [{"new_start": 1, "lines": []}, {"new_start": 10, "lines": []}]

        result = self.service._can_expand_context(hunks, 1, "before")
        assert result is True  # Can always expand before for non-first hunks

    def test_can_expand_context_after(self):
        """Test context expansion after."""
        # Create hunks where first has lines and second starts immediately after
        hunks = [
            {"new_start": 1, "lines": [{"type": "context"}, {"type": "context"}]},
            {"new_start": 3, "lines": [{"type": "context"}]},
        ]

        # First hunk cannot expand after (no gap to next hunk)
        result = self.service._can_expand_context(hunks, 0, "after")
        assert result is False

        # Second hunk can expand after (last hunk)
        result = self.service._can_expand_context(hunks, 1, "after")
        assert result is False

        # Test with actual gap
        hunks_with_gap = [
            {"new_start": 1, "lines": [{"type": "context"}]},
            {"new_start": 5, "lines": [{"type": "context"}]},
        ]

        # First hunk can expand after (gap exists)
        result = self.service._can_expand_context(hunks_with_gap, 0, "after")
        assert result is True

    def test_process_hunks_for_template(self):
        """Test processing hunks for template rendering."""
        hunks = [
            {
                "new_start": 1,
                "new_count": 1,
                "lines": [
                    {
                        "type": "change",
                        "left": {
                            "content": "old code",
                            "line_num": 1,
                            "type": "deletion",
                        },
                        "right": {
                            "content": "new code",
                            "line_num": 1,
                            "type": "addition",
                        },
                    }
                ],
            }
        ]

        result = self.service._process_hunks_for_template(hunks, "test.py")

        assert len(result) == 1
        assert "can_expand_before" in result[0]
        assert "can_expand_after" in result[0]
        assert "lines" in result[0]
        assert len(result[0]["lines"]) == 1

    def test_enhance_diff_data_for_templates(self):
        """Test enhancing diff data for templates."""
        grouped_diffs = {
            "unstaged": {
                "files": [
                    {
                        "path": "test.py",
                        "status": "modified",
                        "additions": 1,
                        "deletions": 1,
                        "hunks": [{"new_start": 1, "new_count": 0, "lines": []}],
                    }
                ]
            }
        }

        result = self.service._enhance_diff_data_for_templates(
            grouped_diffs, expand_files=True
        )

        assert "unstaged" in result
        assert result["unstaged"]["count"] == 1
        assert len(result["unstaged"]["files"]) == 1
        assert result["unstaged"]["files"][0]["expanded"] is True

    def test_enhance_diff_data_with_search_filter(self):
        """Test enhancing diff data with search filter."""
        grouped_diffs = {
            "unstaged": {
                "files": [
                    {"path": "test.py", "status": "modified", "hunks": []},
                    {"path": "example.js", "status": "modified", "hunks": []},
                ]
            }
        }

        result = self.service._enhance_diff_data_for_templates(
            grouped_diffs, search_filter="test"
        )

        assert result["unstaged"]["count"] == 1
        assert result["unstaged"]["files"][0]["path"] == "test.py"

    @patch("difflicious.services.template_service.DiffService")
    @patch("difflicious.services.template_service.GitService")
    def test_prepare_diff_data_for_template_error_handling(
        self, mock_git_service, mock_diff_service
    ):
        """Test error handling in template data preparation."""
        # Setup mocks to raise exception
        mock_git_instance = mock_git_service.return_value
        mock_git_instance.get_repository_status.side_effect = Exception("Git error")

        # Create new service instance
        service = TemplateRenderingService()

        # Test
        result = service.prepare_diff_data_for_template()

        # Should return error template data
        assert "error" in result
        assert result["total_files"] == 0
        assert result["loading"] is False

    def test_get_error_template_data(self):
        """Test error template data generation."""
        error_msg = "Test error"

        result = self.service._get_error_template_data(error_msg)

        assert result["error"] == error_msg
        assert result["total_files"] == 0
        assert result["loading"] is False
        assert "repo_status" in result
        assert "branches" in result
        assert "groups" in result
