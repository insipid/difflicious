# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Difflicious is a lightweight web-based git diff visualization tool built with Flask backend and Alpine.js frontend. It provides developers with an elegant interface for viewing git changes while working on branches locally.

## Architecture

**Technology Stack:**
- Backend: Python Flask with service layer architecture for business logic separation
- Services: Dedicated service classes (DiffService, GitService) with secure subprocess calls
- Frontend: Alpine.js (~15KB) + vanilla CSS with Grid/Flexbox
- Real-time: Server-Sent Events (SSE) for live git status monitoring
- Security: Proper subprocess sanitization for git command execution

**Service Layer Architecture:**
- `BaseService`: Common functionality and lazy-loaded git repository access
- `DiffService`: Business logic for diff processing and rendering
- `GitService`: Git repository operations (status, branches, file access)
- Service exceptions: `DiffServiceError`, `GitServiceError` for proper error handling
- Clear separation between HTTP concerns (Flask routes) and business logic

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
- ✅ Service Layer: Business logic extracted to DiffService and GitService with 100% test coverage
- ✅ Frontend: Alpine.js reactive interface with search, filtering, and diff visualization
- ✅ Security: All git commands properly sanitized, injection prevention, path validation
- ✅ Testing: Comprehensive test suite including dedicated service layer tests

## Core Features Status

- ✅ **Advanced Diff Parsing**: Complete git diff parser with side-by-side structure generation
- ✅ **Side-by-Side Visualization**: Professional-grade diff interface with line numbering and color coding
- ✅ **Syntax Highlighting**: Beautiful code highlighting for 30+ languages using Highlight.js
- ✅ **Smart UI Controls**: Expand/collapse all buttons with intelligent disabled states
- ✅ **Clean File Paths**: Automatic removal of git diff artifacts (a/, b/ prefixes)
- ✅ **Interactive Controls**: Toggle visibility, search/filter capabilities implemented
- ✅ **Git Integration**: Live git status and structured diff data from real repositories
- ✅ **Service Architecture**: Clean separation of concerns with testable business logic
- ✅ **Command-line Interface**: Full CLI with host, port, debug options
- ✅ **Modern UI**: Tailwind CSS styling with responsive design
- 🚧 **Real-time Updates**: Server-Sent Events implementation planned
- 🚧 **Word-level Diffs**: Advanced word-diff parsing (available in separate branch)

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
- **CSS Guidelines**: Follow the CSS Style Guide for all styling changes (see below)

## CSS Architecture & Guidelines

**IMPORTANT:** Difflicious uses a semantic CSS variable system. Always follow these guidelines:

### Core Principles

1. **CSS Variables for Colors** - ALWAYS use CSS variables, NEVER hardcode hex values
2. **Tailwind for Utilities Only** - Layout, spacing, typography (NOT colors)
3. **Semantic Class Names** - Describe purpose, not appearance
4. **Both Themes** - Always test light AND dark themes

### Quick Reference

**✅ DO:**
```css
.component {
    background: var(--surface-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-default);
}
```

```html
<span class="status-badge status-badge-added">added</span>
```

**❌ DON'T:**
```css
.component {
    background: #f8fafc;  /* Hardcoded! */
    color: green;         /* Won't respect theme! */
}
```

```html
<span class="bg-green-100 text-green-800">  <!-- Don't use Tailwind colors! -->
```

### Common Color Variables

- `--surface-primary` - Page background
- `--surface-secondary` - Cards, panels
- `--text-primary` - Main text
- `--text-secondary` - Secondary text
- `--border-default` - Standard borders
- `--semantic-success-bg-subtle` - Success badges/states
- `--semantic-danger-bg-subtle` - Error badges/states

### Component Classes Available

- `.status-badge .status-badge-{added|deleted|renamed|modified}` - Status indicators
- `.file-stat .file-stat-{addition|deletion}` - File change counts

### Tailwind Usage

**Use Tailwind for:**
- Layout: `flex`, `grid`, `space-x-4`
- Spacing: `p-4`, `m-2`, `px-3`
- Typography: `text-sm`, `font-mono`
- Display: `block`, `hidden`

**DON'T use Tailwind for:**
- Colors (use CSS variables)
- Dark mode (use `[data-theme="dark"]`)
- Complex components (use semantic classes)

### CSS File Rebuilding

When modifying Tailwind config or input CSS:
```bash
npm run tailwind:build
```

### Complete Documentation

For comprehensive CSS guidelines, see: `docs/CSS-STYLE-GUIDE.md`

This includes:
- Complete list of CSS variables by category
- How to create new component classes
- Dark mode implementation details
- Common patterns and examples
- Best practices and migration guide

## Deployment Targets

The application is designed for multiple distribution channels:
- PyPI package for easy `pip install` (built with uv)
- Docker containers using uv for consistent, fast dependency installation
- Source installation with uv for development and customization
