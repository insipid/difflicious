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

### Building Docker Images

#### Building Locally

To build the Docker image on your local machine:

```bash
# Build the image
docker build -t insipid/difflicious:latest .

# Build for multiple platforms (requires Docker Buildx)
docker buildx build --platform linux/amd64,linux/arm64 -t insipid/difflicious:latest .
```

**Note:** The Dockerfile uses a multi-stage build with Alpine Linux to create a minimal image (~100MB). The build process:
- Stage 1: Builds the Python package in a `python:3.11-slim` environment
- Stage 2: Creates the minimal runtime image with `python:3.11-alpine`

#### Building with Version Tags

For versioned builds:

```bash
# Build with a specific version tag
docker build -t insipid/difflicious:v0.9.0 .
docker build -t insipid/difflicious:latest .

# Tag an existing image
docker tag insipid/difflicious:latest insipid/difflicious:v0.9.0
```

### Pushing to Docker Hub

Once you have a Docker Hub account, you can push images manually:

```bash
# Log in to Docker Hub
docker login

# Push the latest image
docker push insipid/difflicious:latest

# Push versioned images
docker push insipid/difflicious:v0.9.0
docker push insipid/difflicious:0.9.0
docker push insipid/difflicious:0.9
```

#### Setting Up GitHub Actions for Automated Docker Publishing

The project includes GitHub Actions workflows for automated Docker publishing.

**1. Configure Docker Hub Secrets**

Add the following secrets to your GitHub repository:
- Go to your repository on GitHub
- Navigate to **Settings** → **Secrets and variables** → **Actions**
- Click **New repository secret**
- Add:
  - `DOCKER_USERNAME`: Your Docker Hub username (e.g., `insipid`)
  - `DOCKER_HUB_TOKEN`: Your Docker Hub access token (recommended over password)

**Note:** To create a Docker Hub access token:
1. Go to [Docker Hub](https://hub.docker.com/)
2. Navigate to **Account Settings** → **Security** → **New Access Token**
3. Generate a token with appropriate permissions
4. Copy the token and add it as a GitHub secret

**2. Push Version Tags**

The automated workflow triggers on git tags matching the pattern `v*.*.*`:

```bash
# Create and push a version tag
git tag v0.9.0
git push origin v0.9.0
```

This will automatically:
- Build the Docker image for both `linux/amd64` and `linux/arm64` platforms
- Push to Docker Hub with multiple tags: `v0.9.0`, `0.9.0`, `0.9`, and `latest` (if on main branch)
- Use GitHub Actions build cache for faster builds

**3. Manual Trigger (Optional)**

You can also trigger the workflow manually:
- Go to **Actions** tab in GitHub
- Select **Docker Build and Publish** workflow
- Click **Run workflow** button

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
