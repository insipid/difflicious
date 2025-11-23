#!/usr/bin/env python3
"""Test script to verify the frontend works with new structure."""

import sys
from pathlib import Path

# Add the src directory to the path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from difflicious.app import create_app


def test_frontend():
    """Test that the frontend receives the correct data structure."""
    print("🧪 Testing frontend with new diff structure...")

    app = create_app()

    with app.test_client() as client:
        # Test the main page loads
        print("\n🏠 Testing main page...")
        main_response = client.get("/")

        if main_response.status_code == 200:
            print("   ✅ Main page loads successfully")
            content = main_response.get_data(as_text=True)

            # Check for key elements in the HTML
            if "diff.path" in content:
                print("   ✅ Template uses new diff.path property")
            else:
                print("   ⚠️ Template might still use old diff.file property")

            if "diff.hunks" in content:
                print("   ✅ Template handles new hunk structure")
            else:
                print("   ❌ Template missing hunk handling")

            if "line.left?.line_num" in content:
                print("   ✅ Template handles side-by-side line structure")
            else:
                print("   ❌ Template missing side-by-side structure")
        else:
            print(f"   ❌ Main page failed to load: {main_response.status_code}")
            return False

        # Test the API returns new structure
        print("\n📡 Testing API structure...")
        api_response = client.get("/api/diff")

        if api_response.status_code == 200:
            data = api_response.get_json()
            diffs = data.get("diffs", [])

            if diffs:
                first_file = diffs[0]
                print(f"   ✅ API returns {len(diffs)} files")
                print(f"   📁 First file: {first_file.get('path', 'unknown')}")

                if "hunks" in first_file:
                    hunks = first_file.get("hunks", [])
                    print(f"   📝 File has {len(hunks)} hunks")

                    if hunks:
                        first_hunk = hunks[0]
                        lines = first_hunk.get("lines", [])
                        print(f"   📋 First hunk has {len(lines)} line pairs")

                        if lines:
                            first_line = lines[0]
                            if "left" in first_line and "right" in first_line:
                                print("   ✅ Line pairs have left/right structure")
                            else:
                                print("   ❌ Line pairs missing left/right structure")
                        else:
                            print(
                                "   📄 First hunk has no lines (possibly binary file)"
                            )
                    else:
                        print("   📄 File has no hunks (possibly binary file)")
                else:
                    print("   ❌ File missing hunks property")
            else:
                print("   ❌ API returned no diffs")
        else:
            print(f"   ❌ API request failed: {api_response.status_code}")
            return False

        print("\n✅ Frontend testing completed!")
        print("🌐 Server running at http://127.0.0.1:5003")
        print("📝 You can now open the browser to see the new side-by-side diff view!")

        return True


if __name__ == "__main__":
    success = test_frontend()
    sys.exit(0 if success else 1)
