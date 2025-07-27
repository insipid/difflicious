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

- **Elegant Diff Visualization**: Clean, syntax-highlighted display of file changes
- **Interactive Interface**: Toggle visibility, search through changes, and filter content
- **Secure Git Integration**: Safe git command execution with subprocess sanitization
- **Real-time Status**: Live git repository status and branch information
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
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv sync

# Run the application
uv run difflicious
```

## Technology Stack

- **Backend**: Python Flask for minimal setup and excellent git integration
- **Frontend**: Alpine.js + vanilla CSS for lightweight, declarative UI
- **Real-time**: Server-Sent Events for live git status updates
- **Security**: Proper subprocess sanitization for safe git command execution
- **Distribution**: Modern Python packaging (PyPI) and Docker containers
- **Development**: uv for fast Python package management and virtual environments

## Development Status

✅ **Core functionality implemented** - Ready for git diff visualization!

### Completed ✅
- Modern Python project structure with pyproject.toml and uv
- Flask backend with comprehensive API endpoints
- Secure git command execution wrapper with subprocess sanitization
- Interactive Alpine.js frontend with responsive design
- Comprehensive test suite (28 tests, 73% coverage)
- Real git integration (status, diff, branch detection)

### Coming Soon 🚧
- Docker containerization with uv
- PyPI package publishing
- Enhanced diff syntax highlighting
- Advanced search and filtering capabilities
- Keyboard shortcuts and accessibility features
- Server-Sent Events for real-time updates

## Contributing

This project is in early development. More contribution guidelines will be available as the core functionality is completed.

## License

MIT License - see LICENSE file for details.

