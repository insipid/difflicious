#!/usr/bin/env python3
"""Test script to demonstrate diff parser functionality."""

import json
import sys
from pathlib import Path

# Add the src directory to the path so we can import our module
sys.path.insert(0, str(Path(__file__).parent / "src"))

from difflicious.diff_parser import (
    DiffParseError,
    create_side_by_side_lines,
    get_file_summary,
    parse_git_diff,
)


def main():
    """Parse the sample diff file and display results."""
    sample_file = Path("tests/sample_01.diff")

    if not sample_file.exists():
        print(f"Error: Sample file {sample_file} not found!")
        return 1

    # Read the sample diff file
    print("📖 Reading sample diff file...")
    diff_content = sample_file.read_text()

    try:
        # Parse the diff
        print("🔍 Parsing diff content...")
        parsed_files = parse_git_diff(diff_content)

        # Generate summary
        summary = get_file_summary(parsed_files)

        # Display results
        print("\n" + "=" * 60)
        print("📊 DIFF PARSING RESULTS")
        print("=" * 60)

        print("\n📈 Summary:")
        print(f"  Total files: {summary['total_files']}")
        print(f"  Total additions: {summary['total_additions']}")
        print(f"  Total deletions: {summary['total_deletions']}")
        print(f"  Total changes: {summary['total_changes']}")
        print(f"  Files by status: {summary['files_by_status']}")

        print("\n📁 Files processed:")
        for i, file_data in enumerate(parsed_files, 1):
            print(f"\n{i}. {file_data['path']}")
            print(f"   Status: {file_data['status']}")
            print(f"   Changes: +{file_data['additions']} -{file_data['deletions']}")
            print(f"   Hunks: {len(file_data['hunks'])}")

            # Show first few lines of first hunk if available
            if file_data["hunks"]:
                hunk = file_data["hunks"][0]
                print(
                    f"   First hunk: lines {hunk['old_start']}-{hunk['old_start']+hunk['old_count']-1} -> {hunk['new_start']}-{hunk['new_start']+hunk['new_count']-1}"
                )
                if hunk["lines"][:3]:  # Show first 3 lines
                    print("   Sample lines:")
                    for line in hunk["lines"][:3]:
                        prefix = {"context": " ", "deletion": "-", "addition": "+"}[
                            line["type"]
                        ]
                        print(f"     {prefix} {line['content']}")
                    if len(hunk["lines"]) > 3:
                        print(f"     ... ({len(hunk['lines'])-3} more lines)")

        # Test side-by-side conversion for first file
        if parsed_files:
            print(
                f"\n🔄 Testing side-by-side conversion for '{parsed_files[0]['path']}':"
            )
            side_by_side = create_side_by_side_lines(parsed_files[0]["hunks"])
            print(f"   Generated {len(side_by_side)} side-by-side line pairs")

            # Show a few examples
            for i, line_pair in enumerate(side_by_side[:5]):
                if line_pair["type"] == "context":
                    print(
                        f"   {i+1:2d}. CONTEXT: {line_pair['left']['line_num']:3d} | {line_pair['right']['line_num']:3d} | {line_pair['left']['content'][:50]}"
                    )
                elif line_pair["type"] == "change":
                    left_type = line_pair["left"].get("type", "empty")
                    right_type = line_pair["right"].get("type", "empty")
                    left_num = line_pair["left"]["line_num"] or "---"
                    right_num = line_pair["right"]["line_num"] or "---"
                    print(
                        f"   {i+1:2d}. CHANGE:  {left_num:>3} | {right_num:>3} | L:{left_type[:3]} R:{right_type[:3]}"
                    )

            if len(side_by_side) > 5:
                print(f"   ... ({len(side_by_side)-5} more line pairs)")

        # Automatically save JSON output
        print("\n💾 Saving full JSON output...")
        if True:
            output_file = Path("parsed_diff_output.json")
            output_data = {"summary": summary, "files": parsed_files}

            with open(output_file, "w") as f:
                json.dump(output_data, f, indent=2)

            print(f"✅ Saved full output to {output_file}")

        print("\n✅ Parsing completed successfully!")
        return 0

    except DiffParseError as e:
        print(f"\n❌ Diff parsing failed: {e}")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    exit(main())
