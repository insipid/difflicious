# AGENTS.md - Development Guide for Agentic Coding

## Build/Test Commands
- **Install dependencies**: `uv sync`
- **Run tests**: `uv run pytest`
- **Run single test**: `uv run pytest tests/test_app.py::test_index_route`
- **Run with coverage**: `uv run pytest --cov=src/difflicious`
- **Lint code**: `uv run ruff check`
- **Format code**: `uv run black .`
- **Type check**: `uv run mypy src/`
- **Run app**: `uv run difflicious`

## Docker Commands
- **Build image**: `docker build -t insipid/difflicious:latest .`
- **Build multi-platform**: `docker buildx build --platform linux/amd64,linux/arm64 -t insipid/difflicious:latest .`
- **Push to Docker Hub**: `docker push insipid/difflicious:latest`
- **Tag version**: `git tag v0.9.0 && git push origin v0.9.0` (triggers automated build/push)

## Code Style Guidelines
- **Line length**: 88 characters (Black/Ruff configured)
- **Imports**: Use absolute imports, group stdlib/third-party/local with blank lines
- **Type hints**: Required for all function definitions (`disallow_untyped_defs = true`)
- **Docstrings**: Use triple quotes with Args/Returns sections for public functions
- **Naming**: snake_case for functions/variables, PascalCase for classes
- **Error handling**: Use custom exceptions (GitOperationError, DiffParseError) with descriptive messages
- **Security**: All subprocess calls must use proper sanitization (see git_operations.py)
- **File endings**: All text files must end with carriage return

## Testing Patterns
- Use pytest fixtures for app/client setup
- Test classes for grouping related functionality (e.g., TestAPIDiffCommitComparison)
- Assert response status codes and JSON structure for API endpoints
- Mock external dependencies, test error handling paths
