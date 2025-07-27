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

# Run tests (when implemented)
uv run pytest

# Run linting/formatting (when implemented)
uv run ruff check
uv run black .

# Build package
uv build
```

**Docker Development:**
- Multi-stage builds using uv for optimized container images
- Base images will use uv for dependency installation

## Current Development Phase

**Phase 1 - Project Setup & Core Backend:**
1. Set up modern Python project structure with pyproject.toml and uv
2. Create Flask backend with proper uv-based packaging
3. Implement git command execution wrapper with security
4. Create basic HTML template with Alpine.js integration
5. Build JSON API endpoints for git status and diff data
6. Create Dockerfile using uv for containerized deployment

**Key Implementation Areas:**
- Git command wrapper: Must use proper subprocess sanitization
- Flask backend: Minimal setup, focus on git integration
- Frontend: Alpine.js for lightweight declarative UI
- Security: All git commands must be properly sanitized

## Core Features to Implement

- **Diff Visualization**: Custom syntax-highlighted diff display
- **Interactive Controls**: Toggle visibility, search/filter capabilities
- **Real-time Updates**: Live monitoring of git status and file changes
- **Command-line Interface**: Tool runs locally, starts web server

## Security Requirements

- All git command execution must use proper subprocess sanitization
- No exposure of sensitive git repository information
- Local-only operation (no external network calls for core functionality)

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
