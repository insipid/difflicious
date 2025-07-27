"""Tests for the Flask application."""

import pytest
from difflicious.app import create_app


@pytest.fixture
def app():
    """Create a test Flask application."""
    app = create_app()
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


def test_index_route(client):
    """Test that the index route returns the main page."""
    response = client.get('/')
    assert response.status_code == 200
    assert b'Difflicious' in response.data
    assert b'Git Diff Visualization' in response.data


def test_api_status_route(client):
    """Test that the API status endpoint returns JSON."""
    response = client.get('/api/status')
    assert response.status_code == 200
    assert response.is_json
    
    data = response.get_json()
    assert 'status' in data
    assert data['status'] == 'ok'
    assert 'git_available' in data
    assert 'current_branch' in data
    assert 'files_changed' in data


def test_api_diff_route(client):
    """Test that the API diff endpoint returns JSON."""
    response = client.get('/api/diff')
    assert response.status_code == 200
    assert response.is_json
    
    data = response.get_json()
    assert 'status' in data
    assert data['status'] == 'ok'
    assert 'diffs' in data
    assert isinstance(data['diffs'], list)