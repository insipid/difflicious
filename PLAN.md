# Difflicious - Git Diff Visualization Tool

## Project Overview
A lightweight local web application for developers to visualize git diffs with an interactive interface. The tool runs from the command line, starts a local web server, and provides a "diff" style interface with various display options.

## Original Requirements
- Command-line tool that starts a local webserver
- Run various git commands and read files in current directory
- Display diff-style interface with options for:
  - Toggling visibility
  - Search functionality
  - Further display options (fetching more data)
- Minimal infrastructure for easy development
- Lightweight alternative to React

## Technical Approach

### Architecture Decisions
**Backend:** Python Flask (chosen for minimal setup and excellent command-line tool support)
**Frontend:** Alpine.js + vanilla CSS (lightweight, ~15KB, declarative syntax)
**Real-time updates:** Server-Sent Events (SSE) for live git status
**Styling:** Modern CSS Grid/Flexbox without frameworks
**Security:** Proper subprocess sanitization for git commands

### Deployment Strategy
**Primary Distribution:** 
1. **PyPI Package** - Modern Python packaging with pip install
2. **Docker Image** - Containerized deployment for consistency
3. **Source Installation** - Git clone as fallback option

**Packaging Tools:**
- `pyproject.toml` for modern Python packaging standards
- `uv` for fast Python package management and virtual environments
- Multi-stage Docker builds using uv for optimized images
- GitHub Actions for automated builds and releases

### Key Features Implementation
- **Diff visualization:** Custom implementation with syntax highlighting
- **File monitoring:** Watch git status and file changes
- **Search:** Client-side filtering with fuzzy search capabilities
- **Toggle options:** Simple state management with Alpine.js
- **Command execution:** Secure subprocess calls with proper sanitization

## Development Plan

### Phase 1: Project Setup & Core Backend ✅
1. ✅ Set up modern Python project structure with pyproject.toml and uv
2. ✅ Create Flask backend with uv-based packaging
3. ✅ Implement git command execution wrapper with security
4. ✅ Create basic HTML template with Alpine.js integration
5. ✅ Build JSON API endpoints for git status and diff data
6. ✅ Create Dockerfile using uv for containerized deployment

### Phase 2: Git Operations & Data Layer ✅
7. ✅ Implement diff visualization with syntax highlighting
8. ✅ Add search and filtering functionality
9. ✅ Add toggle controls for visibility options

### Phase 3: Enhanced Features (Future)
- Add real-time updates using Server-Sent Events
- Implement advanced display options (more git data)
- Add keyboard shortcuts and accessibility
- Polish UI/UX with responsive design
- **Sticky file headers** - File headers that stick to top during scroll (attempted but needs further investigation with CSS positioning in Alpine.js/Tailwind context)

## Current Status (as of Version 0.9.2)
- ✅ Phase 1: Project Setup & Core Backend - COMPLETE
- ✅ Phase 2: Git Operations & Data Layer - COMPLETE
- ✅ Phase 3: Enhanced Features - COMPLETE (SSE, display options, keyboard shortcuts pending for future)
- 🎯 **Preparing for 1.0 Release** - Final polish and documentation sync

## Historical Note
This document reflects the original project plan from initial development.
All core features have been implemented. See CHANGELOG.md and README.md for current status.

**Difflicious 1.0 Release Goals:**
- Polish themes (light/dark mode improvements)
- Documentation synchronization
- Production-ready quality assurance
- No major new features - focus on refinement
