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


def test_api_branches_route(client):
    """Test that the API branches endpoint returns JSON."""
    response = client.get('/api/branches')
    assert response.status_code == 200
    assert response.is_json
    
    data = response.get_json()
    assert 'status' in data
    assert data['status'] == 'ok'
    assert 'branches' in data
    
    branches = data['branches']
    assert 'all' in branches
    assert 'current' in branches
    assert 'main' in branches
    assert 'others' in branches
    
    assert isinstance(branches['all'], list)
    assert isinstance(branches['others'], list)



def test_api_diff_route(client):
    """Test that the API diff endpoint returns JSON."""
    response = client.get('/api/diff')
    assert response.status_code == 200
    assert response.is_json
    
    data = response.get_json()
    assert 'status' in data
    assert data['status'] == 'ok'
    assert 'groups' in data
    assert isinstance(data['groups'], dict)
    assert 'untracked' in data['groups']
    assert 'unstaged' in data['groups']
    assert 'staged' in data['groups']


def test_jinja_partials_integration(app):
    """Test that jinja_partials is properly integrated with the Flask app."""
    with app.app_context():
        # Test that render_partial function is available in the Jinja environment globals
        assert 'render_partial' in app.jinja_env.globals
        
        # Verify that the render_partial function is callable
        render_partial_func = app.jinja_env.globals['render_partial']
        assert callable(render_partial_func)
        
        # Test that render_partial function is available in templates
        from flask import render_template_string
        
        # Test template that just checks for render_partial availability
        test_template = '''
        <!DOCTYPE html>
        <html>
        <body>
            <h1>Main Template</h1>
            {% if render_partial %}
                <p>render_partial function is available</p>
            {% else %}
                <p>render_partial function is NOT available</p>
            {% endif %}
        </body>
        </html>
        '''
        
        # Render the template - this tests that jinja_partials is registered
        rendered = render_template_string(test_template)
        
        # Check that the template rendered without errors
        assert 'Main Template' in rendered
        assert 'html' in rendered.lower()
        assert 'render_partial function is available' in rendered


def test_toolbar_partial_component(app):
    """Test that the toolbar partial component renders correctly."""
    with app.app_context():
        from flask import render_template_string
        
        # Test template that renders the toolbar partial
        test_template = '''
        <!DOCTYPE html>
        <html>
        <body>
            {{ render_partial('partials/toolbar.html') }}
        </body>
        </html>
        '''
        
        # Render the template
        rendered = render_template_string(test_template)
        
        # Check that toolbar elements are present
        assert 'Difflicious' in rendered
        assert 'Base:' in rendered
        assert 'Unstaged' in rendered
        assert 'Untracked' in rendered
        assert 'Search files...' in rendered
        assert 'Refresh' in rendered
        assert 'header' in rendered.lower()


def test_loading_state_partial_component(app):
    """Test that the loading state partial component renders correctly."""
    with app.app_context():
        from flask import render_template_string
        
        # Test template that renders the loading state partial
        test_template = '''
        <!DOCTYPE html>
        <html>
        <body>
            {{ render_partial('partials/loading-state.html') }}
        </body>
        </html>
        '''
        
        # Render the template
        rendered = render_template_string(test_template)
        
        # Check that loading state elements are present
        assert 'x-show="loading"' in rendered
        assert 'Loading git diff data...' in rendered
        assert 'animate-spin' in rendered
        assert 'border-blue-600' in rendered


def test_empty_state_partial_component(app):
    """Test that the empty state partial component renders correctly."""
    with app.app_context():
        from flask import render_template_string
        
        # Test template that renders the empty state partial
        test_template = '''
        <!DOCTYPE html>
        <html>
        <body>
            {{ render_partial('partials/empty-state.html') }}
        </body>
        </html>
        '''
        
        # Render the template
        rendered = render_template_string(test_template)
        
        # Check that empty state elements are present
        assert 'x-show="!loading && !hasAnyGroups"' in rendered
        assert 'No changes found' in rendered
        assert '✨' in rendered
        assert 'Enable "Unstaged" or "Untracked"' in rendered
        assert 'working directory is clean' in rendered


def test_global_controls_partial_component(app):
    """Test that the global controls partial component renders correctly."""
    with app.app_context():
        from flask import render_template_string
        
        # Test template that renders the global controls partial
        test_template = '''
        <!DOCTYPE html>
        <html>
        <body>
            {{ render_partial('partials/global-controls.html') }}
        </body>
        </html>
        '''
        
        # Render the template
        rendered = render_template_string(test_template)
        
        # Check that global controls elements are present
        assert 'Expand All' in rendered
        assert 'Collapse All' in rendered
        assert '@click="expandAll()"' in rendered
        assert '@click="collapseAll()"' in rendered
        assert ':disabled="allExpanded"' in rendered
        assert ':disabled="allCollapsed"' in rendered


def test_all_partial_components_together(app):
    """Test that all partial components can be rendered together without conflicts."""
    with app.app_context():
        from flask import render_template_string
        
        # Test template that renders all partials together (similar to index.html structure)
        test_template = '''
        <!DOCTYPE html>
        <html>
        <body>
            {{ render_partial('partials/toolbar.html') }}
            <main>
                {{ render_partial('partials/loading-state.html') }}
                {{ render_partial('partials/empty-state.html') }}
                <div>
                    {{ render_partial('partials/global-controls.html') }}
                </div>
            </main>
        </body>
        </html>
        '''
        
        # Render the template
        rendered = render_template_string(test_template)
        
        # Check that all components are present
        assert 'Difflicious' in rendered  # toolbar
        assert 'Loading git diff data...' in rendered  # loading state
        assert 'No changes found' in rendered  # empty state
        assert 'Expand All' in rendered  # global controls
        assert 'Collapse All' in rendered  # global controls
        
        # Verify no duplicate IDs or classes that might conflict
        assert rendered.count('<header') == 1  # Only one header element
        assert rendered.count('<main') == 1   # Only one main element


class TestAPIDiffCommitComparison:
    """Test cases for API diff endpoint commit comparison functionality."""
    
    def test_api_diff_with_base_commit_parameter(self, client):
        """Test API diff endpoint with base_commit parameter."""
        response = client.get('/api/diff?base_commit=abc123')
        assert response.status_code == 200
        assert response.is_json
        
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['base_commit'] == 'abc123'
        assert data['target_commit'] is None
        assert 'groups' in data
        assert isinstance(data['groups'], dict)
    
    def test_api_diff_with_target_commit_parameter(self, client):
        """Test API diff endpoint with target_commit parameter."""
        response = client.get('/api/diff?target_commit=def456')
        assert response.status_code == 200
        assert response.is_json
        
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['base_commit'] is None
        assert data['target_commit'] == 'def456'
        assert 'groups' in data
        assert isinstance(data['groups'], dict)
    
    def test_api_diff_with_both_commits(self, client):
        """Test API diff endpoint with both commit parameters."""
        response = client.get('/api/diff?base_commit=abc123&target_commit=def456')
        assert response.status_code == 200
        assert response.is_json
        
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['base_commit'] == 'abc123'
        assert data['target_commit'] == 'def456'
        assert 'groups' in data
        assert isinstance(data['groups'], dict)
    
    def test_api_diff_with_all_parameters(self, client):
        """Test API diff endpoint with all parameters combined."""
        params = {
            'base_commit': 'abc123',
            'target_commit': 'def456',
            'unstaged': 'true',
            'untracked': 'false',
            'file': 'test.txt'
        }
        
        response = client.get('/api/diff', query_string=params)
        assert response.status_code == 200
        assert response.is_json
        
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['base_commit'] == 'abc123'
        assert data['target_commit'] == 'def456'
        assert data['unstaged'] is True
        assert data['untracked'] is False
        assert data['file_filter'] == 'test.txt'
        assert 'groups' in data
        assert isinstance(data['groups'], dict)
    
    def test_api_diff_backward_compatibility(self, client):
        """Test API diff endpoint maintains backward compatibility."""
        # Test traditional parameters still work
        response = client.get('/api/diff?unstaged=true&untracked=false&file=test.txt')
        assert response.status_code == 200
        assert response.is_json
        
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['unstaged'] is True
        assert data['untracked'] is False
        assert data['file_filter'] == 'test.txt'
        assert data['base_commit'] is None
        assert data['target_commit'] is None
        assert 'groups' in data
        assert isinstance(data['groups'], dict)
    
    def test_api_diff_empty_commit_parameters(self, client):
        """Test API diff endpoint with empty commit parameters."""
        response = client.get('/api/diff?base_commit=&target_commit=')
        assert response.status_code == 200
        assert response.is_json
        
        data = response.get_json()
        assert data['status'] == 'ok'
        assert data['base_commit'] == ''
        assert data['target_commit'] == ''
        assert 'groups' in data
        assert isinstance(data['groups'], dict)
    
    def test_api_diff_commit_parameters_with_special_characters(self, client):
        """Test API diff endpoint handles commit parameters with various characters."""
        # Test with branch name containing slashes
        response = client.get('/api/diff?base_commit=feature/new-ui')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['base_commit'] == 'feature/new-ui'
        
        # Test with HEAD references
        response = client.get('/api/diff?base_commit=HEAD~1&target_commit=HEAD')
        assert response.status_code == 200
        
        data = response.get_json()
        assert data['base_commit'] == 'HEAD~1'
        assert data['target_commit'] == 'HEAD'
    
    def test_api_diff_response_format_consistency(self, client):
        """Test API diff endpoint response format is consistent."""
        # Test without commit parameters
        response1 = client.get('/api/diff')
        data1 = response1.get_json()
        
        # Test with commit parameters
        response2 = client.get('/api/diff?base_commit=abc123')
        data2 = response2.get_json()
        
        # Both should have the same basic structure
        required_fields = ['status', 'groups', 'unstaged', 'untracked', 'file_filter', 'total_files']
        for field in required_fields:
            assert field in data1
            assert field in data2
        
        # Commit-specific fields should be present in both
        commit_fields = ['base_commit', 'target_commit']
        for field in commit_fields:
            assert field in data1
            assert field in data2


class TestRealGitDiffIntegration:
    """Test cases for get_real_git_diff helper function integration."""
    
    def test_get_real_git_diff_import(self):
        """Test that get_real_git_diff function can be imported."""
        from difflicious.app import get_real_git_diff
        assert callable(get_real_git_diff)
    
    def test_get_real_git_diff_parameters(self):
        """Test get_real_git_diff function signature."""
        from difflicious.app import get_real_git_diff
        import inspect
        
        sig = inspect.signature(get_real_git_diff)
        params = list(sig.parameters.keys())
        
        expected_params = ['base_commit', 'target_commit', 'unstaged', 'untracked', 'file_path']
        for param in expected_params:
            assert param in params
    
    def test_get_real_git_diff_error_handling(self):
        """Test get_real_git_diff handles errors gracefully."""
        from difflicious.app import get_real_git_diff
        
        # Should return empty groups on error, not raise exception
        result = get_real_git_diff(base_commit='nonexistent_commit')
        assert isinstance(result, dict)
        assert 'untracked' in result
        assert 'unstaged' in result
        assert 'staged' in result
        # Check that all groups are empty
        assert all(group['count'] == 0 for group in result.values())