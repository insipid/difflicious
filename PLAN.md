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

### Key Features Implementation
- **Diff visualization:** Custom implementation with syntax highlighting
- **File monitoring:** Watch git status and file changes
- **Search:** Client-side filtering with fuzzy search capabilities
- **Toggle options:** Simple state management with Alpine.js
- **Command execution:** Secure subprocess calls with proper sanitization

## Development Plan

### Phase 1: Project Setup & Core Backend ✅
1. ⏳ Set up basic project structure with Flask backend
2. ⏸️ Implement git command execution wrapper with security
3. ⏸️ Create basic HTML template with Alpine.js integration
4. ⏸️ Build JSON API endpoints for git status and diff data

### Phase 2: Git Operations & Data Layer
5. ⏸️ Implement diff visualization with syntax highlighting
6. ⏸️ Add search and filtering functionality
7. ⏸️ Add toggle controls for visibility options

### Phase 3: Enhanced Features (Future)
- Add real-time updates using Server-Sent Events
- Implement advanced display options (more git data)
- Add keyboard shortcuts and accessibility
- Polish UI/UX with responsive design

## Current Status
- Project directory created: `/Users/drew/code/difflicious/`
- Ready to begin Phase 1 implementation
- Todo list established and being tracked

## Next Steps
Continue with the first todo item: "Set up basic project structure with Flask backend"