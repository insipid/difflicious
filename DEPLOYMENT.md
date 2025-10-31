# Installation & Usage Guide

This guide covers installing and running difflicious locally for developers.

## Table of Contents

- [Quick Start](#quick-start)
- [PyPI Installation](#pypi-installation)
- [Docker Installation](#docker-installation)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## Quick Start

The fastest way to get started with difflicious:

```bash
# Install from PyPI
pip install difflicious

# Or use Docker
docker run -p 5000:5000 -v $(pwd):/workspace insipid/difflicious:latest

# Run it
difflicious

# Open http://localhost:5000 in your browser
```

## PyPI Installation

### Install from PyPI

The recommended way to install difflicious:

```bash
pip install difflicious
```

### Running the Application

```bash
# Basic usage (starts on http://localhost:5000)
difflicious

# Custom host and port
difflicious --host 0.0.0.0 --port 8080

# Enable debug mode for development
difflicious --debug

# List available fonts
difflicious --list-fonts
```

### Working Directory

The application looks for a git repository in the current directory:

```bash
# Navigate to your git repository
cd /path/to/my/project

# Run difflicious
difflicious
```

Or specify a different repository:

```bash
# Set repository path via environment variable
export DIFFLICIOUS_REPO_PATH=/path/to/my/project
difflicious
```

## Docker Installation

### Pull and Run

The simplest Docker installation:

```bash
# Pull the latest image
docker pull insipid/difflicious:latest

# Run it (mount your current directory as the workspace)
docker run -p 5000:5000 -v $(pwd):/workspace insipid/difflicious:latest
```

### Running in Your Project

```bash
# Navigate to your project directory
cd /path/to/my/git/repo

# Run with Docker, mounting current directory
docker run -p 5000:5000 -v $(pwd):/workspace insipid/difflicious:latest

# Access at http://localhost:5000
```

### Using a Specific Port

```bash
# Use port 8080 instead
docker run -p 8080:5000 -v $(pwd):/workspace insipid/difflicious:latest

# Access at http://localhost:8080
```

### Docker Compose (Optional)

For convenience, create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  difflicious:
    image: insipid/difflicious:latest
    ports:
      - "5000:5000"
    volumes:
      - .:/workspace
    environment:
      - DIFFLICIOUS_FONT=jetbrains-mono
```

Run with:

```bash
docker-compose up
```

## Configuration

### Font Customization

Choose your favorite programming font:

```bash
# Set font via environment variable
export DIFFLICIOUS_FONT=fira-code
difflicious

# Available fonts:
# - jetbrains-mono (default)
# - fira-code
# - source-code-pro
# - ibm-plex-mono
# - roboto-mono
# - inconsolata
```

### Disable Google Fonts

If you prefer system fonts or work offline:

```bash
export DIFFLICIOUS_DISABLE_GOOGLE_FONTS=true
difflicious
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DIFFLICIOUS_FONT` | `jetbrains-mono` | Programming font to use |
| `DIFFLICIOUS_DISABLE_GOOGLE_FONTS` | `false` | Disable Google Fonts CDN |
| `DIFFLICIOUS_REPO_PATH` | `.` (current directory) | Git repository path |
| `PORT` | `5000` | Application port |

## Troubleshooting

### Port Already in Use

```bash
# Use a different port
difflicious --port 8080

# Or find and kill the process using port 5000
lsof -ti:5000 | xargs kill -9
```

### Not a Git Repository

```bash
# Make sure you're in a git repository
cd /path/to/git/repo
git status

# Or set the repository path
export DIFFLICIOUS_REPO_PATH=/path/to/git/repo
difflicious
```

### Docker Issues

```bash
# Check if Docker is running
docker ps

# View logs if container exits
docker logs <container-id>

# Check image exists
docker images insipid/difflicious
```

For more troubleshooting help, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Next Steps

- Learn how to [contribute](CONTRIBUTING.md) to difflicious
- Check [troubleshooting](TROUBLESHOOTING.md) for common issues
- Read the main [README](../README.md) for features
- Explore the [development setup](CONTRIBUTING.md#development-setup) for hacking on difflicious

