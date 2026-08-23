# CLAUDE.md

**Last Updated:** 2026-02-06 (v0.10.0)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Difflicious is a lightweight web-based git diff visualization tool built with Flask backend and Alpine.js frontend. It provides developers with an elegant interface for viewing git changes while working on branches locally.

## Architecture

**Technology Stack:**
- Backend: Python Flask 2.3+ with Flask blueprints and service layer architecture
- Services: Dedicated service classes with clear separation of concerns
- Frontend: Alpine.js (~15KB) + modular JavaScript + Tailwind CSS
- Templating: Jinja2 with jinja-partials for component composition
- Real-time: Server-Sent Events (SSE) for live git status monitoring
- Security: Proper subprocess sanitization for git command execution
- Testing: pytest with 73%+ coverage, Jest for JavaScript

**Service Layer Architecture:**
The application follows a clean service layer pattern with complete separation of concerns:

- `BaseService`: Common functionality and lazy-loaded git repository access
- `DiffService`: Business logic for diff processing and rendering
- `GitService`: Git repository operations (status, branches, file access)
- `SyntaxHighlightingService`: Code syntax highlighting using Pygments
- `TemplateRenderingService`: Server-side template rendering with jinja-partials
- DTOs (Data Transfer Objects): Type-safe data structures for API contracts
- Service exceptions: `DiffServiceError`, `GitServiceError` for proper error handling

**Blueprint Architecture:**
Flask routes are organized into logical blueprints for maintainability:

- `views` - Main application views and UI routes
- `git_api` - Git operations API (`/api/git/*`)
- `diff_api` - Diff processing API (`/api/diff/*`)
- `context_api` - Context expansion API (`/api/context/*`)
- `helpers` - Shared blueprint utilities and decorators

**Frontend Architecture:**
- Modular JavaScript with ES6 modules in `static/js/modules/`
- Alpine.js for reactive UI components
- Custom diff interactions and syntax highlighting integration
- Semantic CSS variable system for theming (light/dark modes)

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

**Python Development Commands:**
```bash
# Add new dependencies
uv add package-name

# Add development dependencies
uv add --dev pytest ruff black

# Run Python tests (comprehensive test suite with 1250+ lines)
uv run pytest

# Run with coverage report
uv run pytest --cov=src/difflicious

# Run linting/formatting
uv run ruff check
uv run black .

# Type checking
uv run mypy src/

# Build package
uv build
```

**Frontend Development Commands:**
```bash
# Install Node.js dependencies
pnpm install

# Build Tailwind CSS (production)
pnpm run tailwind:build

# Watch Tailwind CSS (development)
pnpm run tailwind:watch

# Run JavaScript tests
pnpm run test:js

# Run JavaScript linting
pnpm run lint:js
pnpm run lint:js:fix  # Auto-fix issues
```

**Docker Development:**
- Multi-stage Dockerfile for optimized image size (~100MB target)
- Production-ready with Alpine Linux base
- Non-root user for security
- Health checks included
- Git included for repository operations

**Quality Assurance - cilicious.sh:**

The repository includes `cilicious.sh`, a comprehensive quality check script that runs all tests and linters:

```bash
# Run all quality checks (JavaScript tests, linting, Python tests, mypy, ruff, black)
./cilicious.sh
```

**IMPORTANT:** This script must run clean before pushing any changes to remote. It executes:
1. JavaScript tests (`pnpm run test:js`)
2. JavaScript linting (`pnpm run lint:js`)
3. Python tests (`uv run pytest`)
4. Type checking (`uv run mypy src/`)
5. Python linting (`uv run ruff check .`)
6. Code formatting (`uv run black .`)

Always use `./cilicious.sh` instead of running individual test/lint commands.

## Environment Variables

Difflicious supports the following environment variables for configuration:

| Variable | Default | Description |
|----------|---------|-------------|
| `DIFFLICIOUS_PORT` | `5000` | Port to run the web server on |
| `DIFFLICIOUS_HOST` | `127.0.0.1` | Host to bind the web server to |
| `DIFFLICIOUS_FONT` | `jetbrains-mono` | Programming font (see `--list-fonts`) |
| `DIFFLICIOUS_THEME` | `ledger` | Colour theme (see `--list-themes`) |
| `DIFFLICIOUS_DISABLE_GOOGLE_FONTS` | `false` | Disable Google Fonts CDN |
| `DIFFLICIOUS_AUTO_RELOAD` | `true` | Enable auto-reload on file changes |
| `DIFFLICIOUS_WATCH_DEBOUNCE` | `1.0` | Debounce time (seconds) for file watcher |
| `DIFFLICIOUS_WATCH_IGNORE` | `.git,.worktrees` | Patterns to ignore for file watching |
| `DIFFLICIOUS_DEBUG` | `false` | Enable verbose debug logging in browser console |

**Example usage:**
```bash
# Run on a different port
DIFFLICIOUS_PORT=8080 difflicious

# Enable debug logging
DIFFLICIOUS_DEBUG=true difflicious

# Use Fira Code font with debug enabled
DIFFLICIOUS_FONT=fira-code DIFFLICIOUS_DEBUG=true difflicious

# Disable auto-reload
DIFFLICIOUS_AUTO_RELOAD=false difflicious
```

## Current Development Status

**Phase 1 - Project Setup & Core Backend (COMPLETED ✅):**
1. ✅ Modern Python project structure with pyproject.toml and uv
2. ✅ Flask backend with blueprint architecture
3. ✅ Git command execution wrapper with comprehensive security
4. ✅ Jinja2 templates with Alpine.js integration and jinja-partials
5. ✅ Complete JSON API with multiple endpoint categories
6. ✅ Production-ready Dockerfile with multi-stage builds

**Phase 2 - Service Layer & Architecture (COMPLETED ✅):**
1. ✅ BaseService with lazy-loaded repository access
2. ✅ DiffService for diff processing and rendering
3. ✅ GitService for repository operations
4. ✅ SyntaxHighlightingService using Pygments
5. ✅ TemplateRenderingService for server-side rendering
6. ✅ DTOs for type-safe API contracts
7. ✅ Custom service exceptions with proper error handling
8. ✅ Blueprint architecture (views, git_api, diff_api, context_api)

**Phase 3 - Frontend & Testing (COMPLETED ✅):**
1. ✅ Modular JavaScript architecture with ES6 modules
2. ✅ Alpine.js reactive components for UI
3. ✅ Tailwind CSS with semantic variable system
4. ✅ Light/dark theme support
5. ✅ Comprehensive Python test suite (1250+ lines, 73%+ coverage)
6. ✅ Jest configuration for JavaScript testing
7. ✅ ESLint configuration and code standards

## Core Features Status

- ✅ **Advanced Diff Parsing**: Complete git diff parser with side-by-side structure generation using unidiff
- ✅ **Side-by-Side Visualization**: Professional-grade diff interface with line numbering and color coding
- ✅ **Syntax Highlighting**: Beautiful code highlighting for 100+ languages using Pygments
- ✅ **Smart UI Controls**: Expand/collapse all buttons with intelligent disabled states
- ✅ **Clean File Paths**: Automatic removal of git diff artifacts (a/, b/ prefixes)
- ✅ **Interactive Controls**: Toggle visibility, search/filter capabilities implemented
- ✅ **Git Integration**: Live git status and structured diff data from real repositories using GitPython
- ✅ **Service Architecture**: Clean separation of concerns with testable business logic
- ✅ **Command-line Interface**: Full CLI with host, port, debug, font options
- ✅ **Modern UI**: Tailwind CSS styling with responsive design and semantic CSS variables
- ✅ **Theme Support**: Light and dark themes with seamless switching
- ✅ **Context Expansion**: Server-side context line expansion for detailed views
- ✅ **Full Diff Loading**: Client-side full file diff loading via AJAX
- ✅ **Font Customization**: Google Fonts CDN integration with 6+ programming fonts
- ✅ **Docker Support**: Production-ready containerization with Alpine Linux
- ✅ **Real-time Updates**: Server-Sent Events implementation for live status monitoring
- ✅ **Modular Frontend**: ES6 module architecture for maintainable JavaScript
- 🚧 **Word-level Diffs**: Advanced word-diff parsing (future enhancement)
- 🚧 **Keyboard Shortcuts**: Accessibility and power-user features (planned)

## Security Requirements (IMPLEMENTED)

- ✅ All git command execution uses proper subprocess sanitization
- ✅ Command injection prevention with argument validation and character filtering
- ✅ Safe git option validation with whitelist-based approach
- ✅ File path validation to prevent directory traversal attacks
- ✅ Timeout protection for git commands to prevent resource exhaustion
- ✅ No exposure of sensitive git repository information
- ✅ Local-only operation (no external network calls for core functionality)

## API Endpoints

**Views (Blueprint: views):**
- `GET /` - Main application interface

**Git Operations (Blueprint: git_api, prefix: /api/git):**
- `GET /api/git/status` - Get current git repository status
- `GET /api/git/branches` - List available branches
- `GET /api/git/diff` - Get git diff (query params: base, target, staged, files)

**Diff Operations (Blueprint: diff_api, prefix: /api/diff):**
- `POST /api/diff/full` - Get full file diff (body: file_path, base_commit, target_commit)
- `GET /api/diff/parse` - Parse and render diff data

**Context Operations (Blueprint: context_api, prefix: /api/context):**
- `POST /api/context/expand` - Expand context lines in diff hunks
- `POST /api/context/file-lines` - Get specific line ranges from files

All API endpoints return JSON responses with consistent error handling via the blueprint helpers.

## Testing Conventions

**Running All Tests:**
- **Always use `./cilicious.sh`** to run all tests and quality checks
- This runs both Python and JavaScript tests, plus linting and type checking
- Must pass cleanly before pushing to remote

**Python Tests (pytest):**
- Test files use `test_*.py` naming convention
- Service layer has dedicated test directory: `tests/services/`
- Fixtures defined in `tests/conftest.py`
- Mock git repositories used for integration tests
- Individual run (for debugging only): `uv run pytest` or `uv run pytest --cov`

**JavaScript Tests (Jest):**
- Test files in `tests/js/` with `.test.js` or `.spec.js` extensions
- Uses jsdom environment for DOM testing
- Individual run (for debugging only): `pnpm run test:js`

**Test Coverage:**
- Current coverage: 73%+ for Python code
- Target: Maintain >70% coverage for service layer
- Critical paths (git operations, security) require 100% coverage

**Note:** While individual test commands are provided above, always use `./cilicious.sh` before pushing to remote.

## Common Development Tasks

**Adding a New Service:**
1. Create service class in `src/difflicious/services/`
2. Inherit from `BaseService` for common functionality
3. Add DTOs to `services/dtos.py` if needed
4. Export from `services/__init__.py`
5. Create tests in `tests/services/test_<service>.py`
6. Register service in Flask app factory (`app.py`)

**Adding a New Blueprint:**
1. Create blueprint file in `src/difflicious/blueprints/`
2. Define routes and error handlers
3. Export from `blueprints/__init__.py`
4. Register in `app.py` application factory
5. Add tests in `tests/test_<blueprint>.py`

**Adding a New Template Component:**
1. Create partial in `templates/partials/`
2. Use jinja-partials `{% render 'partial_name' %}` syntax
3. Ensure semantic CSS variables are used (no hardcoded colors)
4. Test in both light and dark themes

**Modifying Styles:**
1. Add Tailwind utilities in templates for layout/spacing
2. Add custom styles in `static/css/styles.css` for components
3. Use tokens for all colours (see `docs/THEMING.md`)
4. Rebuild Tailwind: `pnpm run tailwind:build`
5. Test both light and dark themes

## Code Quality Requirements

- **cilicious.sh Script**: **MUST** run `./cilicious.sh` and pass all checks before pushing to remote - this is non-negotiable
- **File Formatting**: ALL TEXT FILES SHOULD END WITH A CARRIAGE RETURN
- **Documentation Sync**: Any changes to architecture/infrastructure must update PLAN.md, README.md, and CLAUDE.md to keep them in sync
- **Package Management**: Use `uv` for all Python dependency management and virtual environments
- **Security**: All git command execution must use proper subprocess sanitization
- **Type Hints**: All new Python code should include type hints (enforced by mypy via cilicious.sh)
- **Docstrings**: All public functions/classes should have docstrings
- **CSS Guidelines**: Follow `docs/THEMING.md` for all styling changes (see below)
- **Testing**: All tests must pass via cilicious.sh (both Python pytest and JavaScript Jest)
- **Linting**: Code must pass all linters via cilicious.sh (ruff, black, eslint)

## CSS Architecture & Theming

**IMPORTANT:** Every design decision — colour, spacing, radius, border width,
typography, shadow, motion, density — lives in `src/difflicious/static/css/themes/`.
Read `docs/THEMING.md` before making any styling change.

### The rule

```
themes/_contract.css  →  theme-independent scales, density knobs, aliases
themes/<name>.css     →  palette + semantic roles for one theme
styles.css            →  structure and layout only; consumes tokens
templates             →  semantic classes only; never Tailwind colour utilities
```

`styles.css` contains no literal colours, radii or shadows. If a value needs to
be tunable, add a token to the contract and reference it — do not inline it.

### Never reference another theme's palette

Tokens prefixed `--theme-<name>-*` are private to the theme that declares them.
The contract, `styles.css` and templates may only use semantic roles
(`--surface-*`, `--text-*`, `--border-*`, `--accent-*`, `--diff-*`), which every
theme declares. Pointing at `--theme-paper-500` resolves to nothing under any
theme but Ledger.

### Themes

`ledger` (default), `slate`, `sorbet`. Select with `--theme` or
`DIFFLICIOUS_THEME`; `--list-themes` shows them. A value that looks like a URL is
loaded as a custom stylesheet named after its file.

### Both themes, every time

Light and dark are peers. Every semantic token is declared in both blocks of a
theme file, and every UI change must be checked in both.

### Rebuilding Tailwind

```bash
pnpm run tailwind:build
```

Tailwind is for layout, spacing and typography only — never colours or dark mode.

## Project Structure

```
difflicious/
├── src/difflicious/          # Main application package
│   ├── __init__.py           # Package version and metadata
│   ├── app.py                # Flask application factory
│   ├── cli.py                # Command-line interface
│   ├── config.py             # Configuration and constants
│   ├── git_operations.py     # Git command execution utilities
│   ├── diff_parser.py        # Git diff parsing utilities
│   │
│   ├── blueprints/           # Flask route blueprints
│   │   ├── auto_reload_routes.py # SSE auto-reload endpoints
│   │   ├── context_routes.py # Context expansion endpoints
│   │   ├── diff_routes.py    # Diff API endpoints
│   │   ├── git_routes.py     # Git API endpoints
│   │   ├── helpers.py        # Blueprint utilities
│   │   └── views.py          # Main UI views
│   │
│   ├── services/             # Business logic layer
│   │   ├── base_service.py   # Base service class
│   │   ├── diff_service.py   # Diff processing
│   │   ├── dtos.py           # Data transfer objects
│   │   ├── exceptions.py     # Service exceptions
│   │   ├── file_watcher.py   # Filesystem watcher utilities
│   │   ├── git_service.py    # Git operations
│   │   ├── syntax_service.py # Syntax highlighting
│   │   └── template_service.py # Template rendering
│   │
│   ├── static/               # Frontend assets
│   │   ├── css/              # Stylesheets
│   │   │   ├── tailwind.input.css  # Tailwind source
│   │   │   ├── tailwind.css  # Compiled Tailwind
│   │   │   └── styles.css    # Custom styles & CSS variables
│   │   ├── data/             # Static data files
│   │   │   └── language_map.json
│   │   ├── js/               # JavaScript
│   │   │   ├── alpine-init.js # Alpine initialization
│   │   │   ├── main.js       # Entry point
│   │   │   ├── components/   # Alpine component factories
│   │   │   │   ├── fileComponent.js
│   │   │   │   ├── groupComponent.js
│   │   │   │   ├── hunkComponent.js
│   │   │   │   └── searchComponent.js
│   │   │   ├── modules/      # ES6 modules
│   │   │   │   ├── auto-reload.js
│   │   │   │   ├── context-expansion-ui.js
│   │   │   │   ├── context-expansion.js
│   │   │   │   ├── design-system.js
│   │   │   │   ├── dom-utils.js
│   │   │   │   ├── file-operations.js
│   │   │   │   ├── full-diff.js
│   │   │   │   ├── hunk-operations.js
│   │   │   │   ├── navigation.js
│   │   │   │   ├── search.js
│   │   │   │   ├── state.js
│   │   │   │   └── theme.js
│   │   │   └── stores/       # Alpine stores
│   │   │       ├── diffStore.js
│   │   │       ├── searchStore.js
│   │   │       └── themeStore.js
│   │
│   └── templates/            # Jinja2 templates
│       ├── base.html         # Base template
│       ├── diff_file.html    # File diff component
│       ├── diff_groups.html  # Diff groups component
│       ├── diff_hunk.html    # Hunk component
│       ├── index.html        # Main application view
│       └── partials/         # Template partials
│           ├── empty_state.html
│           ├── global_controls.html
│           ├── loading_state.html
│           └── toolbar.html
│
├── tests/                    # Test suite
│   ├── conftest.py           # pytest fixtures
│   ├── test_*.py             # Test modules
│   ├── services/             # Service layer tests
│   └── js/                   # JavaScript tests
│
├── docs/                     # Documentation
│   ├── THEMING.md            # Themes and design tokens
│   ├── TROUBLESHOOTING.md    # Common issues
│   ├── internal/             # Working notes, reports, session logs
│   │   └── archive/          # Completed plans and superseded specs
│   ├── screenshots/          # README screenshots
│   └── site/                 # GitHub Pages content
│
├── pyproject.toml            # Python project configuration
├── uv.lock                   # uv lockfile
├── package.json              # Node.js configuration
├── Dockerfile                # Production container
├── tailwind.config.cjs       # Tailwind configuration
└── postcss.config.cjs        # PostCSS configuration
```

## Key Dependencies

**Python (Runtime):**
- `flask>=2.3.0` - Web framework
- `click>=8.0.0` - CLI framework
- `unidiff>=0.7.5` - Git diff parsing
- `Pygments>=2.17.0` - Syntax highlighting
- `GitPython>=3.1.40` - Git repository operations
- `jinja-partials>=0.2.0` - Template composition
- `MarkupSafe>=2.1.0` - HTML escaping
- `watchdog>=6.0.0` - Filesystem watching for auto-reload

**Python (Development):**
- `pytest>=8.3.5` - Testing framework
- `pytest-cov>=5.0.0` - Coverage reporting
- `ruff>=0.12.5` - Fast Python linter
- `black>=24.8.0` - Code formatter
- `mypy>=1.14.1` - Type checking
- `twine>=6.2.0` - PyPI publishing

**JavaScript (Development):**
- `tailwindcss>=3.4.17` - CSS framework
- `postcss>=8.5.6` - CSS processing
- `eslint>=8.57.0` - JavaScript linter
- `jest>=29.7.0` - JavaScript testing

## Deployment Targets

The application is designed for multiple distribution channels:
- **PyPI package** for easy `pip install difflicious` (built with uv)
- **Docker containers** with multi-stage builds on Alpine Linux
- **Source installation** with uv for development and customization

## Documentation Files

**Core Documentation:**
- `README.md` - User-facing documentation and installation instructions
- `CLAUDE.md` - This file - AI assistant guidance and codebase overview
- `PLAN.md` - Original project plan and technical decisions
- `CONTRIBUTING.md` - Brief contribution pointer
- `DEVELOPING.md` - Full development setup, workflow, and conventions
- `CHANGELOG.md` - Version history and changes
- `INSTALLATION.md` - Installation and usage guide (PyPI, Docker, configuration)

**Technical Guides:**
- `docs/THEMING.md` - Themes, design tokens, and how to add a theme
- `docs/TROUBLESHOOTING.md` - Common issues and solutions

**Archive:**
- `docs/internal/archive/` - Completed plans and superseded specs, kept for
  context only. Do not treat anything there as a description of current
  behaviour; see `docs/internal/archive/README.md` for the index.

**Keep these files synchronized when making architectural changes!**

## Important Notes for AI Assistants

**When Working on This Codebase:**

1. **Run cilicious.sh before pushing** - `./cilicious.sh` must pass cleanly before `git push` - this is the #1 rule
2. **Always use the service layer** - Don't bypass services to call git_operations.py directly
3. **Never hardcode colors** - Always use CSS variables from the semantic system
4. **Test both themes** - All UI changes must work in light AND dark modes
5. **Type hints required** - All new Python code must include proper type hints
6. **Update documentation** - Keep CLAUDE.md, README.md, and PLAN.md in sync
7. **Security first** - All git commands must use proper subprocess sanitization
8. **Blueprint organization** - Keep routes organized by concern (git, diff, context, views)
9. **Service exceptions** - Use custom exceptions (DiffServiceError, GitServiceError) for error handling
10. **DTOs for APIs** - Use data transfer objects for type-safe API contracts
11. **Test coverage** - Maintain >70% coverage, especially for service layer

**Common Pitfalls to Avoid:**

- ❌ Don't push without running `./cilicious.sh` cleanly - this is the most critical rule
- ❌ Don't run individual test/lint commands instead of using cilicious.sh
- ❌ Don't use Tailwind color classes (bg-green-500, text-blue-600, etc.)
- ❌ Don't bypass service layer to call git commands directly
- ❌ Don't add business logic to blueprint routes (use services)
- ❌ Don't use inline styles or hardcoded hex colors
- ❌ Don't skip type hints on new functions
- ❌ Don't forget to rebuild Tailwind after CSS changes

**Recommended Workflow:**

1. Understand the requirement
2. Check if it affects architecture (if yes, plan doc updates)
3. Write or update tests first (TDD approach)
4. Implement in service layer (business logic)
5. Add/update blueprint routes (HTTP concerns)
6. Update templates/frontend if needed
7. Test manually in browser (light and dark themes)
8. Commit with descriptive message (commit early and often)
9. Update documentation if needed
10. **Run `./cilicious.sh` - must pass all checks cleanly before pushing**
11. Push to remote (only after cilicious.sh passes)

**CRITICAL:** Never push without `./cilicious.sh` running clean. This ensures all tests pass, code is properly formatted, type-checked, and linted.

**File References:**

When referencing code locations, use the format:
- `src/difflicious/services/diff_service.py:123` - For specific line numbers
- `src/difflicious/blueprints/git_routes.py` - For general file references

This helps users navigate directly to the relevant code.
