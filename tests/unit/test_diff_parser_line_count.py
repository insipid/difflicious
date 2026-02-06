"""Tests for diff parser line counting helper."""

from pathlib import Path

from difflicious.diff_parser import _get_file_line_count


class TestGetFileLineCount:
    def test_counts_lines_in_file(self, tmp_path):
        test_file = Path(tmp_path) / "sample.txt"
        test_file.write_text("one\n\ntwo\n")

        assert _get_file_line_count(str(test_file)) == 3

    def test_returns_zero_for_empty_file(self, tmp_path):
        test_file = Path(tmp_path) / "empty.txt"
        test_file.write_text("")

        assert _get_file_line_count(str(test_file)) == 0

    def test_returns_none_for_missing_file(self, tmp_path):
        missing_file = Path(tmp_path) / "missing.txt"

        assert _get_file_line_count(str(missing_file)) is None
