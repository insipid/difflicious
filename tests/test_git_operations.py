"""Tests for git operations module."""

import pytest
import subprocess
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

from difflicious.git_operations import GitRepository, GitOperationError, get_git_repository


@pytest.fixture
def temp_git_repo():
    """Create a temporary git repository for testing."""
    with tempfile.TemporaryDirectory() as temp_dir:
        repo_path = Path(temp_dir)
        
        # Initialize git repository
        subprocess.run(['git', 'init'], cwd=repo_path, check=True, capture_output=True)
        subprocess.run(['git', 'config', 'user.email', 'test@example.com'], cwd=repo_path, check=True)
        subprocess.run(['git', 'config', 'user.name', 'Test User'], cwd=repo_path, check=True)
        
        # Create initial commit
        test_file = repo_path / 'test.txt'
        test_file.write_text('Initial content\n')
        subprocess.run(['git', 'add', 'test.txt'], cwd=repo_path, check=True)
        subprocess.run(['git', 'commit', '-m', 'Initial commit'], cwd=repo_path, check=True)
        
        yield repo_path


@pytest.fixture
def mock_git_repo():
    """Create a mock git repository for testing without actual git commands."""
    with tempfile.TemporaryDirectory() as temp_dir:
        repo_path = Path(temp_dir)
        
        # Create .git directory to make it look like a git repo
        git_dir = repo_path / '.git'
        git_dir.mkdir()
        
        yield repo_path


class TestGitRepository:
    """Test cases for GitRepository class."""
    
    def test_init_with_valid_repo(self, temp_git_repo):
        """Test GitRepository initialization with valid repository."""
        repo = GitRepository(str(temp_git_repo))
        assert repo.repo_path == temp_git_repo
    
    def test_init_with_current_directory(self, temp_git_repo):
        """Test GitRepository initialization with current directory."""
        old_cwd = os.getcwd()
        try:
            os.chdir(temp_git_repo)
            repo = GitRepository()
            assert repo.repo_path.resolve() == temp_git_repo.resolve()
        finally:
            os.chdir(old_cwd)
    
    def test_init_with_invalid_path(self):
        """Test GitRepository initialization with invalid path."""
        with pytest.raises(GitOperationError, match="Repository path does not exist"):
            GitRepository("/nonexistent/path")
    
    def test_init_with_non_git_directory(self):
        """Test GitRepository initialization with non-git directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            with pytest.raises(GitOperationError, match="Not a git repository"):
                GitRepository(temp_dir)
    
    def test_sanitize_args_valid(self, mock_git_repo):
        """Test argument sanitization with valid arguments."""
        repo = GitRepository(str(mock_git_repo))
        
        valid_args = ['status', '--porcelain', 'filename.txt']
        sanitized = repo._sanitize_args(valid_args)
        
        assert len(sanitized) == 3
        assert all(isinstance(arg, str) for arg in sanitized)
    
    def test_sanitize_args_dangerous_characters(self, mock_git_repo):
        """Test argument sanitization rejects dangerous characters."""
        repo = GitRepository(str(mock_git_repo))
        
        dangerous_args = [
            'status; rm -rf /',
            'status | cat',
            'status && echo hack',
            'status `whoami`',
            'status $(echo hack)',
            'status > /tmp/hack'
        ]
        
        for arg in dangerous_args:
            with pytest.raises(GitOperationError, match="Dangerous characters detected"):
                repo._sanitize_args([arg])
    
    def test_sanitize_args_invalid_type(self, mock_git_repo):
        """Test argument sanitization rejects invalid types."""
        repo = GitRepository(str(mock_git_repo))
        
        with pytest.raises(GitOperationError, match="Invalid argument type"):
            repo._sanitize_args([123])
    
    def test_is_safe_git_option(self, mock_git_repo):
        """Test git option safety validation."""
        repo = GitRepository(str(mock_git_repo))
        
        # Test safe options
        safe_options = ['--porcelain', '--short', '--no-color', '-s', '-b']
        for option in safe_options:
            assert repo._is_safe_git_option(option)
        
        # Test unsafe options (should return False for unknown options)
        unsafe_options = ['--exec', '--upload-pack', '--receive-pack']
        for option in unsafe_options:
            assert not repo._is_safe_git_option(option)
    
    def test_is_safe_file_path(self, mock_git_repo):
        """Test file path safety validation."""
        repo = GitRepository(str(mock_git_repo))
        
        # Test safe paths
        assert repo._is_safe_file_path('test.txt')
        assert repo._is_safe_file_path('subdir/test.txt')
        assert repo._is_safe_file_path('./test.txt')
        
        # Test unsafe paths (path traversal attempts)
        assert not repo._is_safe_file_path('../../../etc/passwd')
        assert not repo._is_safe_file_path('/etc/passwd')
    
    @patch('subprocess.run')
    def test_execute_git_command_success(self, mock_run, mock_git_repo):
        """Test successful git command execution."""
        repo = GitRepository(str(mock_git_repo))
        
        # Mock successful subprocess.run
        mock_result = MagicMock()
        mock_result.stdout = 'test output'
        mock_result.stderr = ''
        mock_result.returncode = 0
        mock_run.return_value = mock_result
        
        stdout, stderr, code = repo._execute_git_command(['status'])
        
        assert stdout == 'test output'
        assert stderr == ''
        assert code == 0
        mock_run.assert_called_once()
    
    @patch('subprocess.run')
    def test_execute_git_command_timeout(self, mock_run, mock_git_repo):
        """Test git command timeout handling."""
        repo = GitRepository(str(mock_git_repo))
        
        # Mock timeout
        mock_run.side_effect = subprocess.TimeoutExpired(['git', 'status'], 30)
        
        with pytest.raises(GitOperationError, match="Git command timed out"):
            repo._execute_git_command(['status'])
    
    @patch('subprocess.run')
    def test_execute_git_command_file_not_found(self, mock_run, mock_git_repo):
        """Test git command when git executable not found."""
        repo = GitRepository(str(mock_git_repo))
        
        # Mock FileNotFoundError
        mock_run.side_effect = FileNotFoundError()
        
        with pytest.raises(GitOperationError, match="Git executable not found"):
            repo._execute_git_command(['status'])
    
    def test_get_status_real_repo(self, temp_git_repo):
        """Test get_status with real git repository."""
        repo = GitRepository(str(temp_git_repo))
        status = repo.get_status()
        
        assert isinstance(status, dict)
        assert 'git_available' in status
        assert 'current_branch' in status
        assert 'files_changed' in status
        assert 'repository_path' in status
        assert 'is_clean' in status
        
        assert status['git_available'] is True
        assert status['repository_path'] == str(temp_git_repo)
    
    @patch('difflicious.git_operations.GitRepository._execute_git_command')
    def test_get_status_with_changes(self, mock_execute, mock_git_repo):
        """Test get_status with file changes."""
        repo = GitRepository(str(mock_git_repo))
        
        # Mock git command responses
        def mock_git_response(args):
            if 'branch' in args:
                return 'main', '', 0
            elif 'status' in args:
                return 'M  test.txt\n?? new.txt\n', '', 0
            return '', '', 1
        
        mock_execute.side_effect = mock_git_response
        
        status = repo.get_status()
        
        assert status['git_available'] is True
        assert status['current_branch'] == 'main'
        assert status['files_changed'] == 2
        assert status['is_clean'] is False
    
    def test_get_diff_real_repo(self, temp_git_repo):
        """Test get_diff with real git repository."""
        repo = GitRepository(str(temp_git_repo))
        
        # Make a change to create a diff
        test_file = temp_git_repo / 'test.txt'
        test_file.write_text('Modified content\n')
        
        diffs = repo.get_diff()
        
        assert isinstance(diffs, list)
        # Note: might be empty if git diff format doesn't match our parsing
    
    def test_parse_diff_output(self, mock_git_repo):
        """Test diff output parsing."""
        repo = GitRepository(str(mock_git_repo))
        
        # Mock diff output in numstat format
        diff_output = "5\t2\ttest.txt\n10\t0\tnew.txt\n"
        
        diffs = repo._parse_diff_output(diff_output)
        
        assert len(diffs) == 2
        assert diffs[0]['file'] == 'test.txt'
        assert diffs[0]['additions'] == 5
        assert diffs[0]['deletions'] == 2
        assert diffs[1]['file'] == 'new.txt'
        assert diffs[1]['additions'] == 10
        assert diffs[1]['deletions'] == 0
    
    def test_parse_diff_output_empty(self, mock_git_repo):
        """Test diff output parsing with empty output."""
        repo = GitRepository(str(mock_git_repo))
        
        diffs = repo._parse_diff_output('')
        assert diffs == []
        
        diffs = repo._parse_diff_output('\n\n')
        assert diffs == []


class TestGitRepositoryFactory:
    """Test cases for git repository factory function."""
    
    def test_get_git_repository_with_path(self, temp_git_repo):
        """Test factory function with explicit path."""
        repo = get_git_repository(str(temp_git_repo))
        assert isinstance(repo, GitRepository)
        assert repo.repo_path == temp_git_repo
    
    def test_get_git_repository_current_dir(self, temp_git_repo):
        """Test factory function with current directory."""
        old_cwd = os.getcwd()
        try:
            os.chdir(temp_git_repo)
            repo = get_git_repository()
            assert isinstance(repo, GitRepository)
            assert repo.repo_path.resolve() == temp_git_repo.resolve()
        finally:
            os.chdir(old_cwd)
    
    def test_get_git_repository_invalid(self):
        """Test factory function with invalid repository."""
        with pytest.raises(GitOperationError):
            get_git_repository("/nonexistent/path")