#!/usr/bin/env python3
"""Detailed test to show the full structure of a file with actual diff content."""

import sys
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from difflicious.app import create_app


def main():
    """Show detailed structure of CLAUDE.md diff."""
    print("🔍 Testing detailed diff structure for CLAUDE.md...")

    app = create_app()

    with app.test_client() as client:
        # Get CLAUDE.md specifically
        response = client.get("/api/diff?file=CLAUDE.md")

        if response.status_code == 200:
            data = response.get_json()
            diffs = data.get("diffs", [])

            if diffs:
                claude_file = diffs[0]
                print(f"\n📁 File: {claude_file['path']}")
                print(f"📊 Status: {claude_file['status']}")
                print(
                    f"📈 Changes: +{claude_file['additions']} -{claude_file['deletions']}"
                )
                print(f"📝 Hunks: {len(claude_file['hunks'])}")

                for i, hunk in enumerate(
                    claude_file["hunks"][:2]
                ):  # Show first 2 hunks
                    print(f"\n   🔸 Hunk {i+1}:")
                    print(
                        f"      Range: {hunk['old_start']}-{hunk['old_start']+hunk['old_count']-1} -> {hunk['new_start']}-{hunk['new_start']+hunk['new_count']-1}"
                    )
                    print(f"      Section: {hunk['section_header']}")
                    print(f"      Lines: {len(hunk['lines'])}")

                    for j, line in enumerate(hunk["lines"][:3]):  # Show first 3 lines
                        print(f"        {j+1}. Type: {line['type']}")

                        if line["type"] == "context":
                            left = line["left"]
                            print(
                                f"           Context {left['line_num']}: {left['content'][:50]}..."
                            )

                        elif line["type"] == "change":
                            left = line["left"]
                            right = line["right"]
                            print(
                                f"           Left  {left.get('line_num', '---'):3}: {left.get('content', '')[:40]}..."
                            )
                            print(
                                f"           Right {right.get('line_num', '---'):3}: {right.get('content', '')[:40]}..."
                            )
                            print(
                                f"           Types: {left.get('type', 'none')} -> {right.get('type', 'none')}"
                            )

                    if len(hunk["lines"]) > 3:
                        print(f"        ... ({len(hunk['lines'])-3} more lines)")

                print("\n💾 Full response structure available for frontend!")
                print("✅ Side-by-side diff data ready for rendering!")

            else:
                print("❌ No files found matching CLAUDE.md")
        else:
            print(f"❌ API request failed: {response.status_code}")


if __name__ == "__main__":
    main()
