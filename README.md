# Difflicious

<div align="center">
  <img src="docs/site/assets/logo.png" width="160" alt="Difflicious">
  <p><em>A local diff viewer for comparing your working directory to any branch, not just HEAD.<br>
  No forge, no push — just run it in your repo.</em></p>
</div>

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/light.png" width="49%" alt="Light mode">
  <img src="docs/screenshots/dark.png" width="49%" alt="Dark mode">
</p>

## Usage

The quickest way — no install required:

```bash
uvx difflicious
```

Or with Docker:

```bash
docker run -it --rm -v "$PWD:/workspace" -p 5000:5000 insipid/difflicious
```

Then open `http://localhost:5000` in your browser.

## Installation

For regular use, install from PyPI:

```bash
pip install difflicious
difflicious
```

See [INSTALLATION.md](INSTALLATION.md) for Docker, source installation, and full configuration options.

If you prefer not to install globally, add one of these to your shell profile:

```bash
# via uvx
difflicious() { uvx difflicious "$@"; }

# via Docker (uses DIFFLICIOUS_PORT if set, otherwise 5000)
difflicious() { docker run -it --rm -v "$PWD:/workspace" -p "${DIFFLICIOUS_PORT:-5000}:${DIFFLICIOUS_PORT:-5000}" insipid/difflicious "$@"; }
```

## Features

Like your favourite forge, and then some:

- Side-by-side diff view with line numbering
- Syntax highlighting for 100+ languages (via Pygments)
- Context expansion to see more surrounding code
- Search and filter across files
- Light and dark themes
- Live auto-reload on file changes (SSE)
- Font customization via `DIFFLICIOUS_FONT` environment variable
- Compare against any branch — defaults to remote HEAD, configurable per session
- Toggle staged and unstaged changes independently
- UI state is persistent — collapsed files, hidden files, and view settings are remembered in the browser across sessions

## Configuration

All options can be set via environment variable or CLI flag:

| Environment variable | CLI flag | Default | Description |
|----------------------|----------|---------|-------------|
| `DIFFLICIOUS_PORT` | `--port`, `-p` | `5000` | Port to listen on |
| `DIFFLICIOUS_HOST` | `--host`, `-h` | `127.0.0.1` | Host to bind to |
| `DIFFLICIOUS_FONT` | — | `jetbrains-mono` | Code font (`--list-fonts` to browse) |
| `DIFFLICIOUS_DISABLE_GOOGLE_FONTS` | — | `false` | Use system fonts only |
| `DIFFLICIOUS_AUTO_RELOAD` | `--auto-reload` / `--no-auto-reload` | `true` | Auto-reload on file changes |
| `DIFFLICIOUS_WATCH_DEBOUNCE` | `--watch-debounce` | `1.0` | File watcher debounce delay (seconds) |
| `DIFFLICIOUS_DEBUG` | `--debug` | `false` | Verbose debug logging |

See [INSTALLATION.md](INSTALLATION.md) for full configuration details.

## Technology

- **Backend**: Flask, GitPython, Pygments, unidiff
- **Frontend**: Alpine.js, Tailwind CSS
- **Real-time**: Server-Sent Events

## Documentation

- [INSTALLATION.md](INSTALLATION.md) — installation options, configuration, environment variables
- [DEVELOPING.md](DEVELOPING.md) — development setup, testing, code conventions
- [CHANGELOG.md](CHANGELOG.md) — version history
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — common issues

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

[![PyPI version](https://img.shields.io/pypi/v/difflicious.svg)](https://pypi.org/project/difflicious/)
[![Python versions](https://img.shields.io/pypi/pyversions/difflicious.svg)](https://pypi.org/project/difflicious/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
