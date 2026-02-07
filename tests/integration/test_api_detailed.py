"""Detailed API structure checks for diff responses."""


def test_diff_hunk_structure(client):
    response = client.get("/api/diff?file=tracked.txt")
    assert response.status_code == 200

    data = response.get_json()
    groups = data["groups"]

    file_data = None
    for group in groups.values():
        for item in group.get("files", []):
            if item.get("path") == "tracked.txt":
                file_data = item
                break
        if file_data:
            break

    assert file_data is not None
    assert "hunks" in file_data

    if file_data["hunks"]:
        first_hunk = file_data["hunks"][0]
        assert "lines" in first_hunk
        if first_hunk["lines"]:
            first_line = first_hunk["lines"][0]
            assert "type" in first_line
            assert "left" in first_line
            assert "right" in first_line
