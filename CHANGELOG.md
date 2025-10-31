# Changelog

All notable changes to difflicious will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Planned for 1.0
- Final UI/UX polish and improvements
- Performance optimizations
- Accessibility enhancements
- Browser compatibility improvements
- User feedback incorporation

### Under Consideration
- Real-time updates with Server-Sent Events
- Advanced search and filtering
- Keyboard shortcuts
- Plugin system
- Export options

---

## Release Notes

### 0.9.0 - Infrastructure Release

The 0.9 release marks a significant milestone for difflicious, establishing the development and operational infrastructure needed for reliable releases. This release focuses entirely on infrastructure, automation, and packaging tooling, laying the foundation for the 1.0 feature release.

**Key Achievements:**
- ✅ Complete CI/CD pipeline with GitHub Actions
- ✅ Docker images for easy local installation
- ✅ Automated testing across multiple Python versions
- ✅ 86% test coverage with 169 passing tests
- ✅ Automated quality checks and code coverage reporting
- ✅ Docker Hub and PyPI publishing automation

**What's Next:**
Version 1.0 will focus on final features, polish, and user experience improvements based on real-world usage feedback from the 0.9 release.

---

*For detailed information about changes in each version, see the git commit history.*
