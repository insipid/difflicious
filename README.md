# Difflicious

A sleek web-based git diff visualization tool used when working locally on branches. Difflicious provides a lightweight local web application that transforms git diffs into an intuitive, interactive experience.

## What is Difflicious?

Difflicious is a developer-focused tool that runs locally and provides a beautiful interface for viewing git changes. Instead of squinting at terminal output, you get a clean, searchable, and toggleable view of your work-in-progress changes.

Perfect for:
- Reviewing changes before committing
- Understanding complex diffs across multiple files
- Quickly navigating through modifications in your current branch
- Getting a bird's-eye view of your development progress

## Features

- **Side-by-Side Diff Visualization**: Professional-grade side-by-side view with accurate line numbering
- **Syntax Highlighting**: Beautiful code highlighting for 30+ programming languages using Highlight.js
- **Intelligent Diff Parsing**: Advanced git diff parser with proper alignment of additions and deletions
- **Smart UI Controls**: Expand/collapse all buttons with intelligent disabled states
- **Interactive Interface**: Toggle visibility, search through changes, and filter content
- **Clean File Paths**: Automatic removal of git diff artifacts (a/, b/ prefixes)
- **Secure Git Integration**: Safe git command execution with subprocess sanitization
- **Real-time Status**: Live git repository status and branch information
- **Modern UI**: Clean Tailwind CSS design with responsive layout
- **Lightweight**: Minimal infrastructure using Flask backend and Alpine.js frontend
- **Developer-Friendly**: Designed by developers, for developers

## Installation & Quick Start

### Option 1: Install from PyPI (Recommended)
```bash
# Install via pip
pip install difflicious

# Run the application
difflicious

# Open your browser to localhost:5000
```

### Option 2: Docker (Containerized)
```bash
# Pull and run the Docker image
docker run -p 5000:5000 -v $(pwd):/workspace difflicious/difflicious

# Open your browser to localhost:5000
```

### Option 3: From Source (Development)
```bash
# Clone the repository
git clone https://github.com/insipid/difflicious.git
cd difflicious

# Install uv if not already installed
xoxo
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv sync

# Run the application
uv run difflicious
```

## Font Customization

Difflicious supports beautiful programming fonts via Google Fonts CDN integration. You can customize the font used for code and diff content.

### Available Fonts

- **JetBrains Mono** (default) - Designed specifically for developers
- **Fira Code** - Popular programming font with ligatures
- **Source Code Pro** - Adobe's professional programming font
- **IBM Plex Mono** - Modern, clean monospace design
- **Roboto Mono** - Google's versatile monospace font
- **Inconsolata** - Humanist monospace font

### Font Configuration

Set the `DIFFLICIOUS_FONT` environment variable to choose your preferred font:

```bash
# Use Fira Code
export DIFFLICIOUS_FONT=fira-code
difflicious

# Use Source Code Pro
export DIFFLICIOUS_FONT=source-code-pro
difflicious

# List all available fonts
difflicious --list-fonts
```

### Available Font Keys

- `jetbrains-mono` - JetBrains Mono (default)
- `fira-code` - Fira Code
- `source-code-pro` - Source Code Pro  
- `ibm-plex-mono` - IBM Plex Mono
- `roboto-mono` - Roboto Mono
- `inconsolata` - Inconsolata

### Disable Google Fonts

If you prefer to use system fonts only (no external CDN requests):

```bash
export DIFFLICIOUS_DISABLE_GOOGLE_FONTS=true
difflicious
```

This will fall back to system monospace fonts like SF Mono, Cascadia Code, Monaco, and Consolas.

## Technology Stack

- **Backend**: Python Flask for minimal setup and excellent git integration
- **Frontend**: Alpine.js + vanilla CSS for lightweight, declarative UI
- **Real-time**: Server-Sent Events for live git status updates
- **Security**: Proper subprocess sanitization for safe git command execution
- **Distribution**: Modern Python packaging (PyPI) and Docker containers
- **Development**: uv for fast Python package management and virtual environments

## Development Status

✅ **Production-ready diff visualization** - Advanced side-by-side interface implemented!

### Completed ✅
- Modern Python project structure with pyproject.toml and uv
- Flask backend with comprehensive API endpoints
- Advanced git diff parser with side-by-side structure
- Professional side-by-side diff visualization interface
- Secure git command execution wrapper with subprocess sanitization
- Interactive Alpine.js frontend with Tailwind CSS styling
- Comprehensive test suite (28 tests, 73% coverage)
- Real git integration (status, diff, branch detection, parsing)

### Coming Soon 🚧
- Docker containerization with uv
- PyPI package publishing
- Enhanced syntax highlighting for code content
- Advanced search and filtering capabilities
- Keyboard shortcuts and accessibility features
- Server-Sent Events for real-time updates

## Contributing

This project is in early development. More contribution guidelines will be available as the core functionality is completed.

## License

MIT License - see LICENSE file for details.
