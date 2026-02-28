# Changelog

All notable changes to difflicious will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-06

### Stable Release

Difflicious 1.1 is the first intentional stable release. Version 1.0.0 was
published to PyPI accidentally during a pipeline test and is considered
spurious; 1.1.0 supersedes it.

### Added
- **Live repo updates** - Real-time status refresh via Server-Sent Events
- **Context expansion** - Load full file hunks on demand
- **Font customization** - Choose from curated programming fonts

### Changed
- **Release metadata** - Production-ready packaging and classifiers
- **Frontend cleanup** - Legacy scripts removed and debug logging gated
- **Backend safety** - Safer diff parsing and commit validation
- **Documentation** - Installation, README, and contributing guidance aligned

### Fixed
- **Full diff UI** - Escaped full-diff retry handler for safety
- **Diff parsing** - Removed external subprocess dependency for line counts
- **API errors** - Consistent error handling and HTTP status codes

## [0.10.0] - 2025-11-23

### Polish & Refinement Release

Difflicious 0.10 focuses on polish, consistency, and user experience improvements. This release emphasizes theme refinement, documentation quality, and codebase cleanup.

### Added
- **Git repository validation** - Clear error message when running outside a git repository
- **Improved first-run experience** - Helpful guidance for new users
- **Better error messaging** - Professional error handling instead of stack traces

### Improved
- **Light mode theme refinement** - Softer, more pleasant diff colors (green-100/red-100 instead of green-200/red-200)
- **Dark mode contrast** - Increased visibility with lighter borders and better diff backgrounds
- **Dark mode diff colors** - Richer, more saturated colors for better distinguishability
- **Context visibility** - Context lines now more visible in dark mode
- **Border visibility** - Dark mode borders lightened for better UI definition
- **Documentation synchronization** - README.md, PLAN.md, and CLAUDE.md now consistent and accurate
- **Alpine.js clarity** - Clear documentation of hybrid Alpine.js + vanilla JS architecture

### Fixed
- **Removed FIXME comments** - Production code no longer contains development notes
- **Removed TODO comments** - All TODOs replaced with clear architectural documentation
- **Test file organization** - Moved test files from root to proper tests/ directory structure
- **README accuracy** - Fixed placeholder text and "Coming Soon" features that were already implemented

### Changed
- **Package metadata** - Development status changed from Alpha to Beta
- **Version** - Bumped to 0.10.0

### Technical Improvements
- **Theme color variables** - Consistent semantic color system across light and dark modes
- **CSS organization** - Clean, maintainable color definitions
- **JavaScript architecture** - Clear separation of concerns between Alpine.js and vanilla JS
- **Code quality** - Removed dead code comments, improved documentation

## [0.9.2] - 2025-12-03

### Infrastructure & Deployment

#### CI/CD Pipeline
- **Fixed publishing workflow triggers** - Docker and PyPI workflows now trigger via workflow_run when Auto Release completes
- **Improved tag detection** - Publishing workflows automatically detect latest tag when triggered by workflow_run event
- **End-to-end automation** - Complete release workflow now fully automated from version bump to publishing

## [0.9.1] - 2025-12-01

### Infrastructure & Deployment

#### CI/CD Pipeline
- **Fixed publishing workflows** - Docker and PyPI publishing now trigger automatically on GitHub release creation
- **Release automation** - Publishing workflows now respond to both tag pushes and release events for maximum reliability

## [0.9.0] - 2025-10-31

### Infrastructure & Deployment

#### Docker & Containerization
- **Multi-stage Dockerfile** with Alpine Linux for minimal image size
- **.dockerignore** for optimized build context
- **Multi-platform support** for AMD64 and ARM64 architectures
- **Security hardening** with non-root user execution
- **Health checks** for container monitoring
- **Proper environment configuration** for local usage

#### CI/CD Pipeline
- **GitHub Actions workflows** for automated testing and deployment
- **Multi-version testing** across Python 3.9, 3.10, 3.11, and 3.12
- **Automated linting** with Ruff for Python code quality
- **Automated type checking** with MyPy
- **Code coverage reporting** with Codecov integration
- **JavaScript linting** with ESLint
- **Automated Docker publishing** to Docker Hub on version tags
- **Automated PyPI publishing** with trusted publishing
- **Automated release workflow** - Version bumps trigger automatic tag creation, GitHub releases, and publishing
- **Build caching** for faster CI/CD runs

#### Testing Infrastructure
- **Comprehensive test suite** with 169 passing tests
- **86% test coverage** across all modules
- **Integration tests** for critical workflows
- **Security tests** for git command sanitization
- **Automated test execution** on every commit and PR
- **Quality metrics** tracking and reporting

#### Code Quality Automation
- **Automated linting** with Ruff
- **Automated formatting** with Black
- **Automated type checking** with MyPy
- **Automated quality checks** in CI pipeline
- **Consistent code style** across the project

### Build & Packaging
- **Modern Python packaging** with pyproject.toml
- **uv package management** for fast dependency resolution
- **Standalone builds** with PyInstaller support
- **CLI interface** with Click framework
- **Version management** with dynamic versioning

### Documentation
- **Installation guide** with Docker and local installation instructions
- **Troubleshooting guide** for common issues and solutions
- **Contributing guidelines** for developers
- **Changelog** for version history tracking
- **Updated README** with current features and setup

## [0.8.0] - Previous Versions

### Features
- **Side-by-side diff visualization** with professional interface
- **Syntax highlighting** with Pygments for 30+ languages
- **Intelligent diff parsing** with proper line alignment
- **Interactive UI** with search, filtering, and expand/collapse
- **Git integration** with status, diff, and branch detection
- **Font customization** with 6 programming fonts
- **Dark/Light mode** support
- **Context expansion** for viewing more code around hunks
- **Rename detection** for moved files

### Infrastructure
- **Flask backend** for minimal setup and git integration
- **Alpine.js frontend** for lightweight, declarative UI
- **Service layer architecture** with clean separation of concerns
- **Error handling** with proper exception hierarchy
- **Security** with subprocess sanitization for git commands

## Version History

- **0.9.0** (2025-10-31): Infrastructure milestone with Docker, CI/CD, and deployment automation
- **0.8.0** and earlier: Core features and functionality

## Future Releases

### Release Readiness Checklist
- Version and package metadata finalized
- Documentation accuracy and duplication cleanup
- Outstanding bugs triaged from TODO.org

### Under Consideration
- Advanced search and filtering
- Keyboard shortcuts
- Plugin system
- Export options

---

*For detailed information about changes in each version, see the git commit history.*
