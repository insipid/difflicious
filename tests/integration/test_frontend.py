"""Integration tests for frontend rendering and templates."""


def test_main_page_renders(client):
    response = client.get("/")
    assert response.status_code == 200

    content = response.get_data(as_text=True)
    assert "diff.path" in content
    assert "diff.hunks" in content
    assert "line.left" in content
