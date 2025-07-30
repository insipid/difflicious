#!/usr/bin/env python3
"""Test script to demonstrate side-by-side conversion."""

import sys
from pathlib import Path

# Add the src directory to the path so we can import our module
sys.path.insert(0, str(Path(__file__).parent / "src"))

from difflicious.diff_parser import create_side_by_side_lines, parse_git_diff


def main():
    """Parse diff and show side-by-side conversion for CLAUDE.md."""
    sample_file = Path("tests/sample_01.diff")

    if not sample_file.exists():
        print(f"Error: Sample file {sample_file} not found!")
        return 1

    # Parse the diff
    diff_content = sample_file.read_text()
    parsed_files = parse_git_diff(diff_content)

    # Find CLAUDE.md file (which has good changes to show)
    claude_file = None
    for file_data in parsed_files:
        if "CLAUDE.md" in file_data["path"]:
            claude_file = file_data
            break

    if not claude_file:
        print("Could not find CLAUDE.md in parsed files")
        return 1

    print(f"📁 Processing: {claude_file['path']}")
    print(f"📊 Changes: +{claude_file['additions']} -{claude_file['deletions']}")
    print(f"📝 Hunks: {len(claude_file['hunks'])}")

    # Convert to side-by-side
    side_by_side = create_side_by_side_lines(claude_file["hunks"])

    print(f"\n🔄 Side-by-side conversion generated {len(side_by_side)} line pairs:")
    print("=" * 80)

    for i, line_pair in enumerate(side_by_side[:20]):  # Show first 20 pairs
        if line_pair["type"] == "context":
            left_num = f"{line_pair['left']['line_num']:3d}"
            right_num = f"{line_pair['right']['line_num']:3d}"
            content = line_pair["left"]["content"][:50]
            print(f"{i+1:2d}. CONTEXT: {left_num} | {right_num} | {content}")

        elif line_pair["type"] == "change":
            left = line_pair["left"]
            right = line_pair["right"]

            left_num = f"{left['line_num']:3d}" if left["line_num"] else "---"
            right_num = f"{right['line_num']:3d}" if right["line_num"] else "---"

            left_type = left.get("type", "empty")
            right_type = right.get("type", "empty")

            print(f"{i+1:2d}. CHANGE:  {left_num} | {right_num} |")

            if left_type == "deletion":
                print(f"              - | --- | {left['content'][:50]}")
            elif left_type == "empty":
                print("              - | --- | (empty)")

            if right_type == "addition":
                print(f"              --- | + | {right['content'][:50]}")
            elif right_type == "empty":
                print("              --- | + | (empty)")

        elif line_pair["type"] == "hunk_header":
            print(
                f"{i+1:2d}. HUNK:    @@ -{line_pair['old_start']} +{line_pair['new_start']} @@ {line_pair['content']}"
            )

    if len(side_by_side) > 20:
        print(f"... ({len(side_by_side)-20} more line pairs)")

    print("=" * 80)
    print("✅ Side-by-side conversion demonstration complete!")

    return 0


if __name__ == "__main__":
    exit(main())
