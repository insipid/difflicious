# Difflicious

[![PyPI version](https://img.shields.io/pypi/v/difflicious.svg)](https://pypi.org/project/difflicious/)
[![Python versions](https://img.shields.io/pypi/pyversions/difflicious.svg)](https://pypi.org/project/difflicious/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A local web application for reviewing git diffs. Run it in your working directory and view your changes in a browser with side-by-side visualization, syntax highlighting, and context expansion.

<!-- TODO: Add screenshots showing light and dark mode side-by-side diff views -->
<!-- ![Difflicious Screenshot](docs/screenshots/difflicious-demo.png) -->

## Installation

```bash
pip install difflicious
difflicious
```

Open `http://localhost:5000` in your browser.

See [INSTALLATION.md](INSTALLATION.md) for Docker, source installation, and full configuration options.

## Features

- Side-by-side diff view with line numbering
- Syntax highlighting for 100+ languages (via Pygments)
- Context expansion to see more surrounding code
- Search and filter across files
- Light and dark themes
- Live auto-reload on file changes (SSE)
- Font customization via `DIFFLICIOUS_FONT` environment variable

## Configuration

Set environment variables to configure behavior:

| Variable | Default | Description |
|----------|---------|-------------|
| `DIFFLICIOUS_PORT` | `5000` | Port to listen on |
| `DIFFLICIOUS_HOST` | `127.0.0.1` | Host to bind to |
| `DIFFLICIOUS_FONT` | `jetbrains-mono` | Code font (see `--list-fonts`) |
| `DIFFLICIOUS_DISABLE_GOOGLE_FONTS` | `false` | Use system fonts only |
| `DIFFLICIOUS_AUTO_RELOAD` | `true` | Auto-reload on file changes |
| `DIFFLICIOUS_DEBUG` | `false` | Verbose debug logging |

See [INSTALLATION.md](INSTALLATION.md) for full configuration details.

## Technology

- **Backend**: Flask, GitPython, Pygments, unidiff
- **Frontend**: Alpine.js, Tailwind CSS
- **Real-time**: Server-Sent Events

## Documentation

- [INSTALLATION.md](INSTALLATION.md) — installation options, configuration, environment variables
- [DEVELOPING.md](DEVELOPING.md) — development setup, testing, code conventions
- [CHANGELOG.md](CHANGELOG.md) — version history
- [docs/CSS-STYLE-GUIDE.md](docs/CSS-STYLE-GUIDE.md) — CSS conventions and design tokens
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) — common issues

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License — see [LICENSE](LICENSE) file for details.
