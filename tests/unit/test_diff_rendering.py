#!/usr/bin/env python3
"""Test script to demonstrate the new parse_git_diff_for_rendering method."""

import json
import sys
from pathlib import Path

# Add the src directory to the path so we can import our module
sys.path.insert(0, str(Path(__file__).parent / "src"))

from difflicious.diff_parser import DiffParseError, parse_git_diff_for_rendering


def main():
    """Test the new rendering-optimized parser."""
    sample_file = Path("tests/sample_01.diff")

    if not sample_file.exists():
        print(f"Error: Sample file {sample_file} not found!")
        return 1

    # Read and parse the diff
    print("📖 Reading sample diff file...")
    diff_content = sample_file.read_text()

    try:
        print("🔍 Parsing diff for rendering...")
        rendered_files = parse_git_diff_for_rendering(diff_content)

        print(f"\n📊 Parsed {len(rendered_files)} files for rendering")
        print("=" * 80)

        # Show structure for each file
        for i, file_data in enumerate(rendered_files, 1):
            print(f"\n{i}. 📁 {file_data['path']}")
            print(
                f"   Status: {file_data['status']} (+{file_data['additions']} -{file_data['deletions']})"
            )
            print(f"   Hunks: {len(file_data['hunks'])}")

            # Show detail for first hunk of first few files
            if i <= 3 and file_data["hunks"]:
                hunk = file_data["hunks"][0]
                print(
                    f"   First hunk: {hunk['old_start']}-{hunk['old_start']+hunk['old_count']-1} -> {hunk['new_start']}-{hunk['new_start']+hunk['new_count']-1}"
                )
                if hunk["section_header"]:
                    print(f"   Section: {hunk['section_header']}")
                print(f"   Lines: {len(hunk['lines'])} side-by-side pairs")

                # Show first few line pairs
                for j, line_pair in enumerate(hunk["lines"][:5]):
                    if line_pair["type"] == "context":
                        left_num = line_pair["left"]["line_num"]
                        right_num = line_pair["right"]["line_num"]
                        content = (
                            line_pair["left"]["content"][:40] + "..."
                            if len(line_pair["left"]["content"]) > 40
                            else line_pair["left"]["content"]
                        )
                        print(
                            f"     {j+1:2d}. CONTEXT: {left_num:3d} | {right_num:3d} | {content}"
                        )

                    elif line_pair["type"] == "change":
                        left = line_pair["left"]
                        right = line_pair["right"]
                        left_num = (
                            f"{left['line_num']:3d}" if left.get("line_num") else "---"
                        )
                        right_num = (
                            f"{right['line_num']:3d}"
                            if right.get("line_num")
                            else "---"
                        )
                        print(f"     {j+1:2d}. CHANGE:  {left_num} | {right_num} |")

                        if left.get("type") == "deletion":
                            content = (
                                left["content"][:35] + "..."
                                if len(left["content"]) > 35
                                else left["content"]
                            )
                            print(f"                - | --- | {content}")
                        elif left.get("type") == "empty":
                            print("                - | --- | (empty)")

                        if right.get("type") == "addition":
                            content = (
                                right["content"][:35] + "..."
                                if len(right["content"]) > 35
                                else right["content"]
                            )
                            print(f"                --- | + | {content}")
                        elif right.get("type") == "empty":
                            print("                --- | + | (empty)")

                if len(hunk["lines"]) > 5:
                    print(f"     ... ({len(hunk['lines'])-5} more line pairs)")

        # Save sample output for inspection
        print("\n💾 Saving sample rendering output...")
        sample_output = {
            "total_files": len(rendered_files),
            "sample_file": (
                rendered_files[1]
                if len(rendered_files) > 1
                else rendered_files[0] if rendered_files else None
            ),
        }

        with open("rendering_output_sample.json", "w") as f:
            json.dump(sample_output, f, indent=2)

        print("✅ Saved sample to rendering_output_sample.json")
        print("✅ Rendering parser test completed successfully!")

        return 0

    except DiffParseError as e:
        print(f"\n❌ Diff parsing failed: {e}")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
