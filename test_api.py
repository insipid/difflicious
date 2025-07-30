#!/usr/bin/env python3
"""Test script to verify the updated API with new diff parser."""

import sys
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from difflicious.app import create_app


def test_api():
    """Test the API endpoints with the new diff parser."""
    print("🧪 Testing API with new diff parser...")

    # Create the Flask app
    app = create_app()

    with app.test_client() as client:
        # Test status endpoint
        print("\n📊 Testing /api/status endpoint:")
        status_response = client.get("/api/status")

        if status_response.status_code == 200:
            status_data = status_response.get_json()
            print(f"   ✅ Status: {status_data.get('status', 'unknown')}")
            print(f"   📁 Files changed: {status_data.get('files_changed', 0)}")
            print(f"   🌿 Branch: {status_data.get('current_branch', 'unknown')}")
        else:
            print(f"   ❌ Status endpoint failed: {status_response.status_code}")
            return False

        # Test diff endpoint
        print("\n📝 Testing /api/diff endpoint:")
        diff_response = client.get("/api/diff")

        if diff_response.status_code == 200:
            diff_data = diff_response.get_json()
            print(f"   ✅ Status: {diff_data.get('status', 'unknown')}")
            print(f"   📁 Total files: {diff_data.get('total_files', 0)}")

            diffs = diff_data.get("diffs", [])
            print(f"   📄 Files in response: {len(diffs)}")

            if diffs:
                # Show structure of first file
                first_file = diffs[0]
                print("\n   📋 First file structure:")
                print(f"      Path: {first_file.get('path', 'unknown')}")
                print(f"      Status: {first_file.get('status', 'unknown')}")
                print(
                    f"      Changes: +{first_file.get('additions', 0)} -{first_file.get('deletions', 0)}"
                )
                print(f"      Hunks: {len(first_file.get('hunks', []))}")

                if first_file.get("hunks"):
                    first_hunk = first_file["hunks"][0]
                    print(f"      First hunk lines: {len(first_hunk.get('lines', []))}")

                    if first_hunk.get("lines"):
                        first_line = first_hunk["lines"][0]
                        print(
                            f"      First line type: {first_line.get('type', 'unknown')}"
                        )
                        if first_line.get("type") == "context":
                            print(
                                f"      Content sample: {first_line.get('left', {}).get('content', '')[:50]}..."
                            )
                        elif first_line.get("type") == "change":
                            left_content = first_line.get("left", {}).get(
                                "content", ""
                            )[:30]
                            right_content = first_line.get("right", {}).get(
                                "content", ""
                            )[:30]
                            print(f"      Left: {left_content}...")
                            print(f"      Right: {right_content}...")
        else:
            print(f"   ❌ Diff endpoint failed: {status_response.status_code}")
            return False

        # Test file filtering
        print("\n🔍 Testing file filtering:")
        filter_response = client.get("/api/diff?file=CLAUDE.md")

        if filter_response.status_code == 200:
            filter_data = filter_response.get_json()
            filtered_diffs = filter_data.get("diffs", [])
            print(f"   📁 Filtered files: {len(filtered_diffs)}")
            if filtered_diffs:
                print(
                    f"   📄 Filtered file: {filtered_diffs[0].get('path', 'unknown')}"
                )

        print("\n✅ API testing completed successfully!")
        return True


if __name__ == "__main__":
    success = test_api()
    sys.exit(0 if success else 1)
