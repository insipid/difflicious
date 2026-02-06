"""Integration tests for API endpoints."""


def _find_file_in_groups(groups, file_path):
    for group in groups.values():
        for file_data in group.get("files", []):
            if file_data.get("path") == file_path:
                return file_data
    return None


def test_status_endpoint(client):
    response = client.get("/api/status")
    assert response.status_code == 200

    data = response.get_json()
    assert data["status"] == "ok"
    assert data["git_available"] is True
    assert "current_branch" in data
    assert "repository_name" in data


def test_diff_endpoint(client):
    response = client.get("/api/diff")
    assert response.status_code == 200

    data = response.get_json()
    assert data["status"] == "ok"
    assert "groups" in data
    assert "total_files" in data
    assert data["total_files"] >= 1


def test_diff_file_filter(client):
    response = client.get("/api/diff?file=tracked.txt")
    assert response.status_code == 200

    data = response.get_json()
    groups = data["groups"]
    tracked_file = _find_file_in_groups(groups, "tracked.txt")
    assert tracked_file is not None
