"""Tests for SyntaxHighlightingService."""

from difflicious.services.syntax_service import SyntaxHighlightingService


class TestSyntaxHighlightingService:
    """Test cases for SyntaxHighlightingService."""

    def test_init(self):
        """Test service initialization."""
        service = SyntaxHighlightingService()

        assert service.light_formatter is not None
        assert service.dark_formatter is not None
        assert service._lexer_cache == {}
        assert isinstance(service.language_map, dict)
        assert "py" in service.language_map
        assert service.language_map["py"] == "python"

    def test_highlight_diff_line_python(self):
        """Test highlighting Python code."""
        service = SyntaxHighlightingService()

        python_code = "def hello():"
        file_path = "test.py"

        result = service.highlight_diff_line(python_code, file_path)

        # Should contain HTML formatting
        assert result != python_code  # Should be different from input
        assert "def" in result  # Should still contain the keyword

    def test_highlight_diff_line_javascript(self):
        """Test highlighting JavaScript code."""
        service = SyntaxHighlightingService()

        js_code = "function hello() {"
        file_path = "test.js"

        result = service.highlight_diff_line(js_code, file_path)

        # Should contain HTML formatting
        assert result != js_code  # Should be different from input
        assert "function" in result  # Should still contain the keyword

    def test_highlight_diff_line_empty_content(self):
        """Test highlighting empty or whitespace content."""
        service = SyntaxHighlightingService()

        # Empty string
        result = service.highlight_diff_line("", "test.py")
        assert result == ""

        # Whitespace only
        result = service.highlight_diff_line("   ", "test.py")
        assert result == "   "

        # None input
        result = service.highlight_diff_line(None, "test.py")
        assert result is None

    def test_highlight_diff_line_unknown_extension(self):
        """Test highlighting code with unknown file extension."""
        service = SyntaxHighlightingService()

        code = "some random text"
        file_path = "test.unknown"

        result = service.highlight_diff_line(code, file_path)

        # Should fallback to plain text but still process
        assert isinstance(result, str)

    def test_lexer_caching(self):
        """Test that lexers are cached for performance."""
        service = SyntaxHighlightingService()

        # First call should populate cache
        service.highlight_diff_line("def test():", "test.py")
        assert "py" in service._lexer_cache

        # Second call should use cached lexer
        initial_cache_size = len(service._lexer_cache)
        service.highlight_diff_line("def another():", "test2.py")
        assert len(service._lexer_cache) == initial_cache_size  # No new entries

    def test_language_mapping(self):
        """Test language mapping functionality."""
        service = SyntaxHighlightingService()

        # Test various mapped extensions
        test_cases = [
            ("test.js", "js"),
            ("test.jsx", "jsx"),
            ("test.ts", "ts"),
            ("test.tsx", "tsx"),
            ("test.py", "py"),
            ("test.html", "html"),
            ("test.css", "css"),
            ("test.json", "json"),
            ("test.md", "md"),
            ("test.sh", "sh"),
            ("test.go", "go"),
            ("test.rs", "rs"),
            ("test.java", "java"),
            ("test.cpp", "cpp"),
        ]

        for file_path, expected_ext in test_cases:
            # Get lexer (which will cache it)
            lexer = service._get_cached_lexer(file_path)
            assert lexer is not None

            # Check that extension was cached
            assert expected_ext in service._lexer_cache

    def test_get_css_styles(self):
        """Test CSS styles generation."""
        service = SyntaxHighlightingService()

        css_styles = service.get_css_styles()

        assert isinstance(css_styles, str)
        assert len(css_styles) > 0
        assert ".highlight" in css_styles  # Should contain the CSS class

    def test_error_handling(self):
        """Test error handling in highlighting."""
        service = SyntaxHighlightingService()

        # Test with potentially problematic input
        # The service should gracefully handle errors and return original content
        problematic_code = "def test():\n\tprint('hello')"  # Mixed tabs/spaces
        file_path = "test.py"

        result = service.highlight_diff_line(problematic_code, file_path)

        # Should not crash and should return some result
        assert isinstance(result, str)

    def test_various_file_extensions(self):
        """Test highlighting with various file extensions."""
        service = SyntaxHighlightingService()

        test_files = [
            ("test.py", "def hello():"),
            ("test.js", "function hello() {"),
            ("test.css", "body { color: red; }"),
            ("test.html", "<div>Hello</div>"),
            ("test.json", '{"key": "value"}'),
            ("test.yaml", "key: value"),
            ("test.md", "# Header"),
            ("test.sh", "#!/bin/bash"),
            ("test.sql", "SELECT * FROM table;"),
            ("Dockerfile", "FROM ubuntu:20.04"),
        ]

        for file_path, code in test_files:
            result = service.highlight_diff_line(code, file_path)

            # Should successfully process all file types
            assert isinstance(result, str)
            assert len(result) > 0

    def test_formatter_configuration(self):
        """Test that formatter is configured correctly."""
        service = SyntaxHighlightingService()

        light_formatter = service.light_formatter
        dark_formatter = service.dark_formatter

        # Check light formatter settings
        assert light_formatter.nowrap is True  # Should not wrap in <pre> tags
        assert light_formatter.noclasses is True  # Should use inline styles
        assert light_formatter.style.name == "default"  # Should use default style
        assert light_formatter.cssclass == "highlight"  # Should use correct CSS class

        # Check dark formatter settings
        assert dark_formatter.nowrap is True  # Should not wrap in <pre> tags
        assert dark_formatter.noclasses is True  # Should use inline styles
        assert dark_formatter.style.name == "one-dark"  # Should use one-dark style
        assert dark_formatter.cssclass == "highlight"  # Should use correct CSS class
