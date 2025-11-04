# GitPython Migration Plan

**Date**: 2025-11-04 23:18 PM  
**Status**: Planning Complete, Ready for Implementation  
**Goal**: Replace subprocess-based git command execution with GitPython library

## Overview

Replace all subprocess-based git command execution (`subprocess.run()`) with GitPython library. This will improve performance (20-40% faster), provide better error handling, improve type safety, and significantly simplify the codebase by eliminating command-line output parsing.

## Current State Analysis

### Git Operations Used
1. **Status Operations**: `git status --porcelain`, `git branch --show-current`
2. **Diff Operations**: `git diff` (various forms: `--numstat`, `--name-status`, `--cached`, `--unified`)
3. **Branch Operations**: `git branch -a`, `git branch -r`, `git remote show origin`, `git symbolic-ref`
4. **File Operations**: `git show`, `git diff` for specific files
5. **Remote Operations**: `git remote get-url origin`

### Files to Modify
- `src/difflicious/git_operations.py` - Main implementation (~1006 lines)
- `tests/test_git_operations.py` - Test suite (~984 lines)
- `pyproject.toml` - Add GitPython dependency

### Methods Requiring Migration
1. `get_status()` - Uses `git status --porcelain`
2. `get_current_branch()` - Uses `git branch --show-current`
3. `get_repository_name()` - Uses `git remote get-url origin`
4. `get_branches()` - Uses `git branch -a`
5. `get_main_branch()` - Uses multiple git commands
6. `summarize_changes()` - Uses `git status --porcelain`, `git diff --name-only`
7. `get_diff()` - Complex, uses multiple git commands
8. `_collect_diff_metadata()` - Uses `git diff --numstat` and `git diff --name-status`
9. `_get_file_diff()` - Uses `git diff` with various options
10. `get_full_file_diff()` - Uses `git diff -U1000000`
11. `get_file_lines()` - Uses `git show`
12. `_get_file_status_map()` - Uses `git status --porcelain`

## GitPython Semantic API Analysis

### Current Parsing Complexity vs GitPython Direct Access

#### Current Approach (Parsing Command Output):

**Example: `_collect_diff_metadata()`**
- Runs `git diff --numstat` and `git diff --name-status` separately
- Parses tab-separated strings line by line
- Manually merges results from two commands
- Tracks old paths from renames manually
- Handles edge cases in string parsing

**Example: `_get_file_status_map()`**
- Parses `git diff --name-status` output
- Splits lines by tabs, maps status codes manually
- Handles renames separately by parsing multiple columns

**Example: `_parse_diff_output()`**
- Parses `--numstat` format: `"additions\tdeletions\tfilename"`
- Handles "-" values for binary files
- Manual error handling for malformed lines

#### GitPython Direct Access Benefits:

**1. `_collect_diff_metadata()` Simplification:**

```python
# Current: Parse two separate git commands
numstat_stdout, _, rc_num = self._execute_git_command(["diff", "--numstat", *base_args])
namestat_stdout, _, rc_ns = self._execute_git_command(["diff", "--name-status", *base_args])
# Then manually merge results, track renames...

# GitPython: Direct access to Diff objects
diffs = repo.index.diff(None)  # Unstaged: working tree vs index
# OR
diffs = repo.index.diff("HEAD")  # Staged: index vs HEAD

files = []
for diff in diffs:
    file_path = diff.b_path or diff.a_path
    # Get statistics directly from Diff object
    stats = diff.stats
    additions = stats.total['insertions']
    deletions = stats.total['deletions']
    
    # Change type directly available
    change_type = diff.change_type  # 'A', 'M', 'D', 'R', 'C', 'T'
    
    # Rename information built-in
    if diff.renamed_file:
        old_path = diff.a_path
        new_path = diff.b_path
    
    files.append({
        "path": file_path,
        "additions": additions,
        "deletions": deletions,
        "changes": additions + deletions,
        "status": self._map_change_type(change_type),
        "old_path": old_path if diff.renamed_file else None,
    })
# No parsing, no merging, no manual tracking!
```

**2. `_get_file_status_map()` Simplification:**

```python
# Current: Parse --name-status output
stdout, _, rc = self._execute_git_command(["diff", "--name-status", "--find-renames"])
for line in stdout.strip().split("\n"):
    parts = line.split("\t")
    status_code = parts[0]
    filename = parts[1]
    # Manual mapping of codes to names...

# GitPython: Direct Diff object access
diffs = repo.index.diff(None)  # or repo.index.diff("HEAD")
status_map = {}
for diff in diffs:
    file_path = diff.b_path or diff.a_path
    # Direct access to change type
    status_map[file_path] = self._map_change_type(diff.change_type)
    if diff.renamed_file:
        # Old path directly available
        status_map[diff.a_path] = "renamed_old"
```

**3. `get_diff()` Simplification:**

```python
# Current: Multiple git commands, manual parsing, tracking renames
# - git status --porcelain (for untracked)
# - git diff --numstat (for additions/deletions)
# - git diff --name-status (for status)
# - Manual merging and tracking

# GitPython: Direct semantic access
# Untracked files
untracked_files = repo.untracked_files  # Direct list, no parsing

# Unstaged changes
unstaged_diffs = repo.index.diff(None)  # Working tree vs index

# Staged changes  
staged_diffs = repo.index.diff("HEAD")  # Index vs HEAD

# Each Diff object has:
# - diff.a_path, diff.b_path (old/new paths)
# - diff.change_type ('A', 'M', 'D', 'R', 'C', 'T')
# - diff.stats.total['insertions'], diff.stats.total['deletions']
# - diff.diff (full diff text if needed)
# - diff.renamed_file (boolean)
```

**4. File Content Access:**

```python
# Current: git show {commit}:{file} then parse
stdout, _, rc = self._execute_git_command(["show", f"{commit}:{file_path}"])

# GitPython: Direct tree access
commit = repo.commit(commit_sha)
file_blob = commit.tree[file_path]
lines = file_blob.data_stream.read().decode('utf-8').split('\n')
# Direct access to specific lines
selected_lines = lines[start_line-1:end_line]
```

**Key Simplifications:**
- **No string parsing** of `--numstat` or `--name-status` output
- **Direct access** to change types (no manual mapping)
- **Built-in rename detection** (no manual tracking)
- **Statistics available** on Diff objects (no calculation needed)
- **No need to merge** results from multiple commands
- **Type-safe** access to repository state

### Recommended Refactoring Opportunities

1. **Replace `_collect_diff_metadata()`**: 
   - Use `repo.index.diff()` directly
   - Iterate Diff objects instead of parsing strings
   - Use `diff.stats` for additions/deletions
   - Use `diff.change_type` for status

2. **Simplify `_get_file_status_map()`**: 
   - Use Diff objects instead of parsing
   - Direct access to change types
   - Built-in rename handling

3. **Refactor `get_diff()`**: 
   - Use semantic Diff objects throughout
   - Calculate stats from `Diff.stats` instead of parsing
   - Use `repo.untracked_files` directly

4. **Eliminate `_parse_diff_output()`**: 
   - No longer needed with GitPython
   - All data available from Diff objects

5. **Simplify `get_file_lines()`**:
   - Use `commit.tree[file_path]` instead of `git show`
   - Direct line slicing from data stream

## Test Fixtures: Git Repository Setup

### Create Reusable Test Fixtures

**File**: `tests/conftest.py` or `tests/fixtures/git_repos.py`

Create fixture-style git repositories for comprehensive testing. These fixtures will be reusable across all tests and provide consistent test data.

```python
import pytest
from pathlib import Path
from git import Repo

@pytest.fixture
def git_repo_with_untracked(tmp_path):
    """Repo with untracked files."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    
    # Create initial commit
    test_file = Path(tmp_path) / "tracked.txt"
    test_file.write_text("Initial content\n")
    repo.index.add(["tracked.txt"])
    repo.index.commit("Initial commit")
    
    # Add untracked file
    untracked = Path(tmp_path) / "untracked.txt"
    untracked.write_text("Untracked content\n")
    
    return repo

@pytest.fixture  
def git_repo_with_renames(tmp_path):
    """Repo with renamed files."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    
    # Create file and commit
    old_file = Path(tmp_path) / "old_name.txt"
    old_file.write_text("Content\n")
    repo.index.add(["old_name.txt"])
    repo.index.commit("Add file")
    
    # Rename file
    new_file = Path(tmp_path) / "new_name.txt"
    old_file.rename(new_file)
    repo.index.add(["old_name.txt", "new_name.txt"])
    repo.index.commit("Rename file")
    
    return repo

@pytest.fixture
def git_repo_with_binary(tmp_path):
    """Repo with binary file changes."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    
    # Create binary file
    binary_file = Path(tmp_path) / "image.png"
    binary_file.write_bytes(b'\x89PNG\r\n\x1a\n')  # PNG header
    repo.index.add(["image.png"])
    repo.index.commit("Add binary file")
    
    # Modify binary file
    binary_file.write_bytes(b'\x89PNG\r\n\x1a\nModified')
    repo.index.add(["image.png"])
    
    return repo

@pytest.fixture
def git_repo_empty(tmp_path):
    """Empty repo (no commits)."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    return repo

@pytest.fixture
def git_repo_detached_head(tmp_path):
    """Repo in detached HEAD state."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    
    # Create commits
    test_file = Path(tmp_path) / "test.txt"
    test_file.write_text("Commit 1\n")
    repo.index.add(["test.txt"])
    repo.index.commit("First commit")
    
    test_file.write_text("Commit 2\n")
    repo.index.add(["test.txt"])
    repo.index.commit("Second commit")
    
    # Checkout detached HEAD
    repo.git.checkout("HEAD~1")
    
    return repo

@pytest.fixture
def git_repo_multiple_branches(tmp_path):
    """Repo with multiple branches."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    
    # Create main branch with commits
    main_file = Path(tmp_path) / "main.txt"
    main_file.write_text("Main content\n")
    repo.index.add(["main.txt"])
    repo.index.commit("Main commit")
    
    # Create feature branch
    repo.git.checkout("-b", "feature")
    feature_file = Path(tmp_path) / "feature.txt"
    feature_file.write_text("Feature content\n")
    repo.index.add(["feature.txt"])
    repo.index.commit("Feature commit")
    
    # Return to main
    repo.git.checkout("main")
    
    return repo

@pytest.fixture
def git_repo_with_staged_and_unstaged(tmp_path):
    """Repo with both staged and unstaged changes."""
    repo = Repo.init(tmp_path)
    repo.config_writer().set_value("user", "name", "Test User").release()
    repo.config_writer().set_value("user", "email", "test@example.com").release()
    
    # Create and commit file
    test_file = Path(tmp_path) / "test.txt"
    test_file.write_text("Original\n")
    repo.index.add(["test.txt"])
    repo.index.commit("Initial commit")
    
    # Make staged change
    test_file.write_text("Staged change\n")
    repo.index.add(["test.txt"])
    
    # Make unstaged change (modify again)
    test_file.write_text("Staged change\nUnstaged change\n")
    
    return repo
```

**Benefits of Fixture-Based Testing:**
- **Reusable** across all tests (subprocess and GitPython)
- **Consistent** test data for comparison
- **Faster** test execution (no need to recreate repos each time)
- **Comprehensive** coverage of edge cases
- **Easier** to maintain and extend

## Implementation Plan

### Phase 1: Preparation and Testing (Before Migration)

#### 1.1 Add Comprehensive Test Coverage
**File**: `tests/test_git_operations.py`

**Goal**: Ensure we have tests that verify current behavior before migration, so we can validate GitPython produces identical results.

**Tasks**:
- Review existing test coverage for all public methods
- Add integration tests for edge cases using fixtures:
  - Empty repositories (`git_repo_empty`)
  - Repositories with no commits
  - Repositories with untracked files only (`git_repo_with_untracked`)
  - Repositories with renamed files (`git_repo_with_renames`)
  - Repositories with binary files (`git_repo_with_binary`)
  - Large diffs (1000+ lines)
  - Unicode file names
  - Special characters in paths
  - Detached HEAD state (`git_repo_detached_head`)
  - Multiple branches (`git_repo_multiple_branches`)
  - Staged and unstaged changes (`git_repo_with_staged_and_unstaged`)
- Add performance benchmarks (optional but useful for comparison)
- Ensure all tests pass before migration begins

**Specific Test Cases to Add**:
```python
def test_get_status_with_untracked_files(git_repo_with_untracked):
    """Test get_status() with untracked files."""
    pass

def test_get_diff_with_renamed_files(git_repo_with_renames):
    """Test get_diff() with renamed files."""
    pass

def test_get_diff_with_binary_files(git_repo_with_binary):
    """Test get_diff() with binary files."""
    pass

def test_get_full_file_diff_large_file():
    """Test get_full_file_diff() with large files."""
    pass

def test_get_branches_with_no_remotes():
    """Test get_branches() in repo with no remotes."""
    pass

def test_get_current_branch_detached_head(git_repo_detached_head):
    """Test get_current_branch() in detached HEAD state."""
    pass

def test_get_file_lines_with_unicode():
    """Test get_file_lines() with unicode content."""
    pass

def test_summarize_changes_empty_repo(git_repo_empty):
    """Test summarize_changes() in empty repo."""
    pass

def test_get_diff_with_staged_and_unstaged(git_repo_with_staged_and_unstaged):
    """Test get_diff() with both staged and unstaged changes."""
    pass
```

#### 1.2 Add GitPython Dependency
**File**: `pyproject.toml`

**Change**: Add `GitPython>=3.1.40` to dependencies list

```toml
dependencies = [
    "flask>=2.3.0",
    "click>=8.0.0",
    "unidiff>=0.7.5",
    "Pygments>=2.17.0",
    "MarkupSafe>=2.1.0",
    "jinja-partials>=0.2.0",
    "GitPython>=3.1.40",  # Add this
]
```

**Action**: Run `uv sync` to install dependency

#### 1.3 Create Test Fixtures
**File**: `tests/conftest.py` or `tests/fixtures/git_repos.py`

Create all fixture-style git repositories as described above. These will be used for both subprocess and GitPython tests.

### Phase 2: Direct Migration (No Backward Compatibility Needed)

Since this is pre-release with no users, we can do a direct migration without feature flags or gradual rollout.

#### 2.1 Create GitPython-Based Implementation
**File**: `src/difflicious/git_operations.py`

**Strategy**: Replace `GitRepository` class entirely with GitPython implementation.

**Initial Structure**:
```python
from git import Repo, InvalidGitRepositoryError
from git.exc import GitCommandError
from pathlib import Path
from typing import Any, Optional

class GitRepository:
    """GitPython-based implementation of git operations."""
    
    def __init__(self, repo_path: Optional[str] = None):
        self.repo_path = Path(repo_path) if repo_path else Path.cwd()
        try:
            self.repo = Repo(str(self.repo_path))
        except InvalidGitRepositoryError:
            raise GitOperationError(f"Not a git repository: {self.repo_path}")
```

**Remove Completely**:
- `_execute_git_command()` method
- `_sanitize_args()` method  
- `_is_safe_git_option()` method
- `_is_safe_file_path()` method (security handled by GitPython)
- `_is_safe_commit_sha()` method (GitPython validates)
- All subprocess-related code

### Phase 3: Method-by-Method Migration

#### 3.1 Simple Methods First (Low Risk)

**3.1.1 Migrate `get_current_branch()`**
- **Current**: `git branch --show-current`
- **GitPython**: `repo.active_branch.name` or `repo.head.reference.name`
- **Edge Cases**: Detached HEAD state - use `repo.head.commit.hexsha[:7]` or return "detached"
- **Simplification**: Direct access, no parsing
- **Test**: Verify identical behavior with fixtures

**3.1.2 Migrate `get_repository_name()`**
- **Current**: `git remote get-url origin`
- **GitPython**: `repo.remotes.origin.url` or fallback to directory name
- **Simplification**: Direct access to remote URL
- **Test**: Verify identical behavior

**3.1.3 Migrate `get_status()`**
- **Current**: `git status --porcelain` with parsing
- **GitPython**: Use `repo.index.diff(None)`, `repo.index.diff("HEAD")`, and `repo.untracked_files`
- **Simplification**: Direct access to diff objects, no string parsing
- **Test**: Verify identical output format

#### 3.2 Medium Complexity Methods

**3.2.1 Migrate `get_branches()`**
- **Current**: `git branch -a` with complex parsing
- **GitPython**: `[b.name for b in repo.branches]` and `[ref.name.replace('origin/', '') for ref in repo.remotes.origin.refs]`
- **Simplification**: Direct iteration over branch objects
- **Test**: Verify branch list matches exactly

**3.2.2 Migrate `get_main_branch()`**
- **Current**: Multiple git commands with fallbacks
- **GitPython**: Use `repo.remote().refs` and `repo.remotes.origin.refs`
- **Simplification**: Direct access to remote refs
- **Test**: Verify all fallback logic works

**3.2.3 Migrate `summarize_changes()`**
- **Current**: Multiple `git diff` commands with parsing
- **GitPython**: Use `repo.index.diff(None)` and `repo.index.diff("HEAD")`, count Diff objects
- **Simplification**: Count Diff objects directly, no parsing
- **Test**: Verify counts match exactly

#### 3.3 Complex Methods (High Risk - Use Semantic API)

**3.3.1 Migrate `_collect_diff_metadata()` - Major Simplification**
- **Current**: `git diff --numstat` and `git diff --name-status` with manual parsing and merging
- **GitPython**: Use `repo.index.diff()` and iterate Diff objects
- **Simplification**: 
  - Use `diff.stats.total['insertions']` and `diff.stats.total['deletions']` instead of parsing
  - Use `diff.change_type` instead of parsing status codes
  - Use `diff.a_path` and `diff.b_path` for rename detection
  - No merging needed - single source of truth
- **Test**: Verify additions/deletions counts match exactly

**3.3.2 Migrate `_get_file_diff()`**
- **Current**: `git diff -U{context} --no-color` with parsing
- **GitPython**: `repo.git.diff(commit1, commit2, file_path, U=context_lines)` OR use `diff.diff` property
- **Simplification**: Direct diff text access, or use GitPython's diff generation
- **Test**: Verify diff output matches exactly (byte-for-byte)

**3.3.3 Migrate `get_full_file_diff()`**
- **Current**: `git diff -U1000000`
- **GitPython**: Same as `_get_file_diff()` with large context
- **Simplification**: Same as above
- **Test**: Verify large diffs work correctly

**3.3.4 Migrate `get_file_lines()`**
- **Current**: `git show {commit}:{file_path}` with line slicing
- **GitPython**: `repo.commit(commit).tree[file_path].data_stream.read().decode().split('\n')[start-1:end]`
- **Simplification**: Direct tree access, no subprocess
- **Test**: Verify line extraction matches exactly

**3.3.5 Migrate `get_diff()` - Major Refactoring Opportunity**
- **Current**: Complex orchestration of multiple git commands with parsing
- **GitPython**: Combine semantic methods above
- **Simplification**:
  - Use `repo.untracked_files` directly (no parsing)
  - Use `repo.index.diff(None)` for unstaged (semantic Diff objects)
  - Use `repo.index.diff("HEAD")` for staged (semantic Diff objects)
  - Build result directly from Diff objects
- **Test**: Full integration test - verify all diff groups match

**3.3.6 Migrate `_get_file_status_map()` - Major Simplification**
- **Current**: `git status --porcelain` or `git diff --name-status` with parsing
- **GitPython**: Use `repo.index.diff(None)` and `repo.index.diff("HEAD")` directly
- **Simplification**:
  - Iterate Diff objects
  - Use `diff.change_type` directly (no parsing)
  - Use `diff.b_path` and `diff.a_path` for paths
  - Built-in rename detection
- **Test**: Verify status codes match exactly

### Phase 4: Remove Legacy Code

#### 4.1 Remove All Subprocess Code
- Remove `_execute_git_command()` method
- Remove `_sanitize_args()` method  
- Remove `_is_safe_git_option()` method
- Remove `_is_safe_file_path()` method
- Remove `_is_safe_commit_sha()` method
- Remove `_parse_diff_output()` method (replaced by Diff object access)
- Remove all subprocess imports

#### 4.2 Update Error Handling
- Replace subprocess exception handling with GitPython exceptions
- Maintain `GitOperationError` for public API compatibility
- Wrap GitPython exceptions (`InvalidGitRepositoryError`, `GitCommandError`) in `GitOperationError`

### Phase 5: Testing and Validation

#### 5.1 Run Full Test Suite
- Ensure all existing tests pass
- Run integration tests against fixture repos
- Test with various git repository states using fixtures

#### 5.2 Performance Testing
- Compare performance: subprocess vs GitPython
- Verify 20-40% improvement for typical operations
- Document any performance regressions

#### 5.3 Code Quality
- Verify code is simpler and more maintainable
- Check that parsing code has been eliminated
- Ensure semantic API is used throughout

## GitPython API Reference Mapping

### Status Operations
```python
# Current: git status --porcelain (parsing required)
# GitPython:
untracked = repo.untracked_files  # Direct list
index_diff = repo.index.diff(None)  # Unstaged: working tree vs index
head_diff = repo.index.diff("HEAD")  # Staged: index vs HEAD

# Each diff in index_diff/head_diff is a Diff object with:
# - diff.change_type: 'A', 'M', 'D', 'R', 'C', 'T'
# - diff.a_path: old path (for renames)
# - diff.b_path: new path
# - diff.stats: statistics object with insertions/deletions
```

### Diff Operations
```python
# Current: git diff --numstat (parsing required)
# GitPython:
diffs = repo.index.diff(None)
for diff in diffs:
    additions = diff.stats.total['insertions']
    deletions = diff.stats.total['deletions']
    file_path = diff.b_path or diff.a_path
    change_type = diff.change_type

# Current: git diff --name-status (parsing required)
# GitPython: Same as above, use diff.change_type directly
```

### Branch Operations
```python
# Current: git branch -a (parsing required)
# GitPython:
local_branches = [b.name for b in repo.branches]
remote_branches = [ref.name.replace('origin/', '') for ref in repo.remotes.origin.refs]

# Current: git branch --show-current
# GitPython:
current_branch = repo.active_branch.name  # Or handle detached HEAD
```

### File Content
```python
# Current: git show {commit}:{file} (subprocess)
# GitPython:
commit = repo.commit(commit_sha)
file_blob = commit.tree[file_path]
content = file_blob.data_stream.read().decode('utf-8')
lines = content.split('\n')
selected_lines = lines[start_line-1:end_line]
```

### Diff Text Generation
```python
# Current: git diff -U{context} --no-color (subprocess)
# GitPython:
diff_text = repo.git.diff(commit1, commit2, file_path, U=context_lines)
# OR use diff.diff property if you have a Diff object
```

## Migration Strategy Details

### For Each Method Migration:

1. **Implement with GitPython**: Use semantic API directly, avoid parsing where possible
2. **Add Tests**: Create test using fixture repos that verifies output matches expected format
3. **Refactor for Simplicity**: Take advantage of GitPython's semantic API to simplify code
4. **Remove Old Code**: Once verified, remove subprocess implementation entirely

### Testing Strategy:

1. **Unit Tests**: Test each method in isolation using fixture repos
2. **Integration Tests**: Test full workflows
3. **Fixture-Based Tests**: Use predefined git repos for consistent testing
4. **Edge Case Tests**: Test error conditions, empty repos, etc. using fixtures

## Risk Mitigation

### Potential Issues:

1. **Output Format Differences**: GitPython may format output differently
   - **Mitigation**: Use Diff objects directly, don't rely on formatted output
   
2. **Performance**: GitPython might be slower for some operations
   - **Mitigation**: Benchmark and optimize, but expected 20-40% improvement
   
3. **Error Handling**: Different exceptions from GitPython
   - **Mitigation**: Wrap in consistent exception handling
   
4. **Feature Parity**: Some git options might not be directly available
   - **Mitigation**: Use `repo.git.{command}()` for direct git command execution when needed, but prefer semantic API

## Success Criteria

1. All existing tests pass
2. Performance improvement of 20-40% for typical operations
3. Code is significantly simpler (no parsing code)
4. Code coverage maintained or improved
5. All git operations work identically to subprocess version
6. Semantic API used throughout (no command-line output parsing)

## Implementation Order

1. **Add test fixtures** - Create reusable git repo fixtures
2. **Add comprehensive tests** - Ensure coverage before migration
3. **Add GitPython dependency** - Update pyproject.toml
4. **Simple methods first** - get_current_branch, get_repository_name, get_status
5. **Medium complexity** - get_branches, get_main_branch, summarize_changes
6. **Complex methods** - Use semantic API for major simplification
7. **Remove legacy code** - Clean up all subprocess code
8. **Final testing** - Comprehensive test suite validation
