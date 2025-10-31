# Contributing to Difflicious

Thank you for your interest in contributing to difflicious! This document provides guidelines and instructions for development setup and making contributions.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/difflicious.git
   cd difflicious
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/insipid/difflicious.git
   ```
4. **Create a branch** for your changes

## Development Setup

### Prerequisites

- Python 3.9 or higher
- [uv](https://docs.astral.sh/uv/) for Python package management
- Node.js 18+ (for JavaScript linting)
- Git

### Initial Setup

```bash
# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install all dependencies (including dev dependencies)
uv sync

# Verify installation
uv run difflicious --version
```

### Running the Development Server

```bash
# Run the application in development mode
uv run difflicious --debug

# Or with custom host/port
uv run difflicious --host 0.0.0.0 --port 8000
```

The application will be available at `http://localhost:5000` (or your custom port).

## Development Workflow

### Creating a Branch

Create a feature branch for your work:

```bash
# Make sure you're on main and up to date
git checkout main
git pull upstream main

# Create and switch to your feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/improvements

### Making Changes

1. **Make your code changes**
2. **Run the development server** to test:
   ```bash
   uv run difflicious --debug
   ```
3. **Run tests** to ensure nothing broke:
   ```bash
   uv run pytest
   ```
4. **Run linting** to check code style:
   ```bash
   uv run ruff check
   ```

### Running All Checks

Use the CI script to run all checks at once:

```bash
./cilicious.sh
```

This runs:
- Python linting (ruff)
- Type checking (mypy)
- Formatting check (black)
- JavaScript linting (eslint)
- All tests with coverage

## Testing

### Running Tests

```bash
# Run all tests
uv run pytest

# Run with coverage report
uv run pytest --cov=src/difflicious --cov-report=term

# Run a specific test file
uv run pytest tests/test_app.py

# Run a specific test
uv run pytest tests/test_app.py::test_index_route

# Run tests in watch mode (auto-rerun on file changes)
uv run pytest-watch  # if installed
```

### Writing Tests

Guidelines for writing tests:
- **Write tests for new features** - maintain 80%+ coverage
- **Use descriptive test names** - make it clear what's being tested
- **Mock external dependencies** - don't rely on external services
- **Test error cases** - happy path and failure scenarios
- **Keep tests isolated** - each test should be independent

Example test structure:

```python
def test_new_feature_works_correctly():
    """Test that new feature behaves as expected."""
    # Arrange - set up test data
    service = MyService()
    input_data = {"key": "value"}

    # Act - perform the operation
    result = service.do_something(input_data)

    # Assert - verify the result
    assert result["status"] == "success"
    assert "expected_key" in result
```

## Code Style

### Python Style

We use automated tools for code quality:

```bash
# Check linting
uv run ruff check

# Auto-fix linting issues
uv run ruff check --fix

# Format code with Black
uv run black .

# Check type hints
uv run mypy src/

# Run all checks at once
./cilicious.sh
```

Style guidelines:
- **Line length**: 88 characters (Black default)
- **Type hints**: Required for all function signatures
- **Docstrings**: Add docstrings to public functions
- **PEP 8**: Follow Python style conventions
- **Imports**: Group stdlib, third-party, local with blank lines

### JavaScript Style

```bash
# Lint JavaScript files
npm run lint:js

# Auto-fix issues
npm run lint:js -- --fix
```

### Before Committing

Always run the full CI script before committing:

```bash
./cilicious.sh
```

This ensures:
- No linting errors
- No type errors
- All tests pass
- Code is formatted correctly

## Making Changes

### Commit Messages

Write clear, descriptive commit messages:

```bash
feat: Add dark mode support for UI

fix: Resolve CSS layout issue in file headers

docs: Update installation guide with Docker examples

test: Add tests for new diff service methods

refactor: Extract context expansion logic into separate module
```

Commit message format:
- **First line**: Short summary (50 chars or less)
- **Imperative mood**: "Add" not "Added" or "Adding"
- **Reference issues**: "Fixes #123" when closing issues
- **Body**: Optional detailed explanation for complex changes

### Keeping Up to Date

Keep your branch up to date with upstream:

```bash
# Fetch latest changes
git fetch upstream

# Rebase your branch on main
git checkout your-feature-branch
git rebase upstream/main

# If there are conflicts, resolve them and continue
git rebase --continue
```

## Submitting Changes

### Pull Request Process

1. **Push your changes** to your fork:
   ```bash
   git push origin your-feature-branch
   ```

2. **Open a Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Include a detailed description of what and why
   - Reference any related issues
   - Add screenshots for UI changes
   - Fill out the PR template if provided

3. **Ensure CI passes**:
   - All GitHub Actions checks must pass
   - Address any failing tests or lint errors

4. **Respond to review feedback**:
   - Be open to suggestions
   - Make requested changes promptly
   - Keep discussions friendly and constructive
   - Thank reviewers for their time

### Pull Request Checklist

Before submitting, ensure:
- [x] All tests passing locally
- [x] Code follows style guidelines
- [x] No linter errors
- [x] No type errors
- [x] Documentation updated if needed
- [x] Meaningful commit messages
- [x] Branch is up to date with main
- [x] PR description is clear and complete

## Development Commands

Quick reference for common development tasks:

```bash
# Install/update dependencies
uv sync

# Run the application
uv run difflicious
uv run difflicious --debug

# Run all quality checks
./cilicious.sh

# Run tests
uv run pytest
uv run pytest --cov=src/difflicious

# Linting and formatting
uv run ruff check
uv run ruff check --fix
uv run black .

# Type checking
uv run mypy src/

# Build package
uv build

# Update dependencies
uv add package-name
uv add --dev dev-package-name

# Remove dependencies
uv remove package-name
```

## Project Structure

Understanding the codebase:

```
difflicious/
├── src/difflicious/       # Main application code
│   ├── app.py            # Flask application and routes
│   ├── cli.py            # Command-line interface
│   ├── diff_parser.py    # Git diff parsing logic
│   ├── git_operations.py # Git command execution
│   ├── services/         # Business logic services
│   │   ├── diff_service.py
│   │   ├── git_service.py
│   │   ├── syntax_service.py
│   │   └── template_service.py
│   ├── static/           # Static assets
│   │   ├── css/          # Stylesheets
│   │   └── js/           # JavaScript
│   └── templates/        # Jinja2 templates
├── tests/                # Test suite
│   ├── test_app.py      # Application tests
│   ├── test_cli.py      # CLI tests
│   ├── test_git_operations.py
│   └── services/        # Service tests
├── docs/                # Documentation
├── pyproject.toml       # Python package config
├── uv.lock              # Dependency lock file
└── README.md           # Project overview
```

## Getting Help

If you need help:
- **Check existing issues** on GitHub
- **Open a new issue** with questions
- **Ask in discussions** for non-urgent queries
- **Check the README** for project overview
- **Read existing code** for examples

## Thank You

Contributions are what make open source great. Thank you for taking the time to contribute to difflicious!
