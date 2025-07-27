# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Difflicious is a lightweight web-based git diff visualization tool built with Flask backend and Alpine.js frontend. It provides developers with an elegant interface for viewing git changes while working on branches locally.

## Architecture

**Technology Stack:**
- Backend: Python Flask with secure subprocess calls for git operations
- Frontend: Alpine.js (~15KB) + vanilla CSS with Grid/Flexbox
- Real-time: Server-Sent Events (SSE) for live git status monitoring
- Security: Proper subprocess sanitization for git command execution

**Distribution Strategy:**
1. PyPI package (primary) - `pip install difflicious`
2. Docker image (secondary) - containerized deployment  
3. Source installation (development fallback)

## Development Commands

This project uses `uv` for fast Python package management and development environments.

**Project Setup:**
```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv sync

# Run in development mode
uv run difflicious

# Access at localhost:5000
```

**Development Commands:**
```bash
# Add new dependencies
uv add package-name

# Add development dependencies
uv add --dev pytest ruff black

# Run tests (comprehensive test suite available)
uv run pytest

# Run linting/formatting
uv run ruff check
uv run black .

# Build package
uv build
```

**Docker Development:**
- Multi-stage builds using uv for optimized container images
- Base images will use uv for dependency installation

## Current Development Status

**Phase 1 - Project Setup & Core Backend (COMPLETED):**
1. ✅ Set up modern Python project structure with pyproject.toml and uv
2. ✅ Create Flask backend with proper uv-based packaging
3. ✅ Implement git command execution wrapper with security
4. ✅ Create basic HTML template with Alpine.js integration
5. ✅ Build JSON API endpoints for git status and diff data
6. 🚧 Create Dockerfile using uv for containerized deployment

**Implementation Completed:**
- ✅ Git command wrapper: Secure subprocess sanitization with comprehensive security validation
- ✅ Flask backend: Complete API with `/api/status` and `/api/diff` endpoints
- ✅ Frontend: Alpine.js reactive interface with search, filtering, and diff visualization
- ✅ Security: All git commands properly sanitized, injection prevention, path validation
- ✅ Testing: 28 tests with 73% coverage including security and functionality tests

## Core Features Status

- ✅ **Advanced Diff Parsing**: Complete git diff parser with side-by-side structure generation
- ✅ **Side-by-Side Visualization**: Professional-grade diff interface with line numbering and color coding
- ✅ **Interactive Controls**: Toggle visibility, search/filter capabilities implemented
- ✅ **Git Integration**: Live git status and structured diff data from real repositories
- ✅ **Command-line Interface**: Full CLI with host, port, debug options
- ✅ **Modern UI**: Tailwind CSS styling with responsive design
- 🚧 **Enhanced Syntax Highlighting**: Future improvement for code content highlighting
- 🚧 **Real-time Updates**: Server-Sent Events implementation planned

## Security Requirements (IMPLEMENTED)

- ✅ All git command execution uses proper subprocess sanitization
- ✅ Command injection prevention with argument validation and character filtering
- ✅ Safe git option validation with whitelist-based approach
- ✅ File path validation to prevent directory traversal attacks
- ✅ Timeout protection for git commands to prevent resource exhaustion
- ✅ No exposure of sensitive git repository information
- ✅ Local-only operation (no external network calls for core functionality)

## Code Quality Requirements

- **File Formatting**: ALL TEXT FILES SHOULD END WITH A CARRIAGE RETURN
- **Documentation Sync**: Any changes to architecture/infrastructure must update PLAN.md, README.md, and CLAUDE.md to keep them in sync
- **Package Management**: Use `uv` for all Python dependency management and virtual environments
- **Security**: All git command execution must use proper subprocess sanitization

## Deployment Targets

The application is designed for multiple distribution channels:
- PyPI package for easy `pip install` (built with uv)
- Docker containers using uv for consistent, fast dependency installation
- Source installation with uv for development and customization
