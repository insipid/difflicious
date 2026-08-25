# Changelog

All notable changes to difflicious will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.15.0] - 2026-08-25

### Themes, Navigation & Release Plumbing

Four more themes, a toolbar that stays put and now navigates, and the first
release whose Docker images should actually carry version tags.

### Added
- **Four themes** — `terrace` (warm plaster, rounded, sunlit), `draught`
  (petrol-blue drafting board, squared off, ruled), `riso` (two-ink print, hard
  offset ink, slab type), `console` (the whole interface as a terminal:
  achromatic, zero radius, no shadows, and the runtime mono face for every
  label). Each gives the toolbar, page, cards and gutters their own tint rather
  than four steps of one neutral ramp, and each takes a hue no other theme claims
- **Per-browser theme selection** — the `difflicious_theme` cookie is read on
  every request. Resolution order: cookie, then `DIFFLICIOUS_THEME`, then the
  default; matching ignores case and surrounding whitespace, and an unknown value
  is ignored rather than raising. **A cookie may only name a registered theme** —
  unlike the environment variable it cannot point at a stylesheet URL, because a
  remote stylesheet can both restyle a page and read data out of it through
  attribute selectors
- **Console theme switcher** — `Difflicious.theme.<name>()` in devtools sets the
  cookie and reloads, with one method per registered theme so the list
  autocompletes, and `Difflicious.theme.clear()` to go back. An admitted stopgap
  until a settings control owns the cookie; see `js/modules/dev-theme.js`
- **Pinned toolbar** — the toolbar stays at the top of the window, with file
  headers pinning directly beneath it at the bar's measured height
- **File dropdown** — jump to any visible file, grouped the way the page groups
  them, following whichever file header is currently pinned
- **Jump to top and bottom** — buttons that disable themselves at either end
- **An empty diff area explains itself** — when the filters hide every file the
  area says so, instead of going blank
- **`--themes` for `scripts/screenshot.py`**, to reshoot a subset

### Fixed
- **Docker images were never version-tagged** — the semver tag patterns read
  `github.ref`, which is `refs/heads/main` when the job runs from Auto Release,
  so every release published only `main` and `latest` despite INSTALLATION.md
  describing version tags. Docker Hub held no version-tagged image for any
  version
- **Docker Hub description sync failed otherwise-good releases** — that endpoint
  returns 403 without an admin-scoped token, reddening a job whose image had
  published fine. The step is now `continue-on-error`; the token still needs
  reissuing with the wider scope
- **The file dropdown's icon outlived the dropdown** — the select hides itself
  below two visible files but its label did not, leaving an icon labelling
  nothing, which read as a control gone missing
- **Screenshots were captured in fallback fonts** — the script now waits on
  `document.fonts.ready` before shooting

### Changed
- **Theme is resolved per request** rather than once at startup
- **Unstaged and Untracked toggles** moved into the controls row with the expand
  buttons, under one named group

## [0.14.0] - 2026-08-23

### Themes & Interface

The interface is rebuilt on a theme layer. Every design decision — colour,
spacing, radius, border width, typography, shadow, motion, density — now lives in
`static/css/themes/`, and a theme can be swapped without touching anything else.
See [`docs/THEMING.md`](docs/THEMING.md).

### Added
- **Three themes** — `ledger` (default, warm paper and ochre), `slate` (cool
  greys and indigo), `sorbet` (bright, rounded, turquoise). Each ships light and
  dark variants as peers, not as a filter over one another
- **Theme selection** — `--theme` or `DIFFLICIOUS_THEME`, listed with
  `--list-themes`. A value that looks like a URL is loaded as a custom
  stylesheet, named after its file
- **Per-theme typefaces** — a theme declares its own display and UI faces; only
  the selected theme's fonts are fetched
- **Theme gallery** — thumbnails of every theme in both schemes in the theming
  docs, and `scripts/screenshot.py --all-themes` to regenerate them

### Fixed
- **Dark-mode syntax highlighting** — Pygments ran with `noclasses=True`, baking
  one theme's colours inline server-side where no stylesheet could override
  them, while the theme is switched in the browser. Dark mode had been showing
  light-theme code colours. The formatter is now class-based
- **Syntax CSS was never injected** — a formatter had split `{{ syntax_css }}`
  into `{ { … } }`, so the block rendered as literal text
- **Dark-mode overrides fighting the theme** — around 250 lines of `!important`
  rules with hardcoded colours, most of them matching classes the templates no
  longer emit, prevented a theme change taking full effect
- **Sticky file headers** — restored; they had been disabled by an `overflow`
  rule on the file card
- **Empty bar above every file header** — a masking strip had become the only
  separation between cards, which were otherwise flush. Cards now have a real gap
- **Whole expansion strip is clickable** — expanding context no longer requires
  hitting a 28px pill, and the row is keyboard-operable
- **JavaScript linting** — `lint:js` never checked two source files, because npm
  runs scripts through a shell where `**` is not recursive
- **Lockfile** — `playwright` was declared in `pyproject.toml` but missing from
  `uv.lock`, so every `uv run` re-resolved and rewrote it

### Changed
- **pnpm 11** in CI, matching local development
- **Git worktrees** may live in `.worktrees/` inside the repo; the file watcher
  and test runners ignore them
- **Docs** — completed plans and superseded specs archived under
  `docs/internal/archive/`; the CSS style guide is retired in favour of
  `docs/THEMING.md`
- Removed the stray `package-lock.json`; the project is pnpm throughout

## [0.13.0] - 2026-04-14

### Release Automation & Infrastructure

Automated version management and release processes to streamline development workflows.

### Added
- **Automated version bump enforcement** - GitHub Action that requires version updates on main branch merges
- **Branch protection integration** - Enforces changelog discipline with override capability

### Improved
- **Frontend animations** - Smoother transitions and reduced visual flashing during state changes
- **CSS architecture** - Consolidated theme styling and improved dark mode consistency
- **Signal handling** - Better graceful shutdown for SIGINT/SIGTERM
- **JavaScript selectors** - Standardized hooks with `js-` prefix for maintainability

### Fixed
- **CSS x-cloak** - Added missing rule to prevent FOUC (flash of unstyled content)
- **Expansion state** - Eliminated flash of incorrect state on page load
- **Dark mode backgrounds** - Consistent file header styling across themes
- **Queue warnings** - Resolved Waitress concurrency warnings

## [0.12.0] - 2026-04-14

### Presentation Layer Separation

Enforced explicit contracts between the data, service, template, CSS, and JS layers. Full design rationale in [`docs/internal/archive/presentation-layer-separation.md`](docs/internal/archive/presentation-layer-separation.md).

### Changed
- **Removed dual state** — deleted `state.js` and `file-operations.js`; `diffStore` is now the single source of truth for expansion state
- **Template→JS contract** — all JS query-hook CSS selectors prefixed `js-` (e.g. `js-hunk`, `js-expansion-btn`) to distinguish them from styled classes
- **Template→CSS contract** — inline Tailwind colour utilities moved to semantic component classes (`.file-card`, `.file-card-header`, `.file-card-nav-btn`)
- **ThemeStore init** — reads initial theme from the server-rendered `data-theme` DOM attribute only; no redundant localStorage/matchMedia read on boot

### Fixed
- **Flash of unstyled content** — added the missing `[x-cloak] { display: none !important }` CSS rule; every prior `x-cloak` attribute was inert without it
- **Flash of expansion state** — server now embeds repo name as `window.DIFFLICIOUS_REPO`; an inline pre-warming script reads localStorage before Alpine boots so the first render reflects saved state
- **File content animation** — removed vertical scale transform; transition is now a plain opacity fade
- **Ctrl+C shutdown** — SIGINT now triggers `os._exit(0)` matching the existing SIGTERM handler, so a single keypress exits cleanly regardless of open SSE connections

## [1.0.0] - 2026-02-06 — never released

> **This release does not exist.** It was published in error and withdrawn: there
> is no `v1.0.0` tag, and no 1.0.0 on PyPI. Development continued from 0.11.0.
> The entry is kept so the mistake is on the record rather than an unexplained
> gap, but nothing below shipped under this version number — the changes went out
> in 0.11.0 and later.

### Stable Release

Difflicious 1.0 marks the first stable release with hardened security, a
cleaner frontend, and documentation aligned with current behavior.

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
