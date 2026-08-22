# Difflicious — State of Play

**Date:** 2026-08-20
**Reviewed at:** `origin/main` @ `99bd16a` (v0.13.0)
**Author:** Claude Code session survey

---

## 1. Where the project actually is

The last commit to `main` was **2026-04-14** — roughly four months of quiet. That
release (v0.13.0) shipped cleanly: CI green, tag pushed, PyPI and Docker Hub both
published by automation. Nothing is half-landed on `main`, and nothing is broken.

| Fact | Value |
|------|-------|
| Released version | **0.13.0** (2026-04-14) |
| PyPI latest | 0.13.0 |
| Tags | v0.9.0, v0.9.1, v0.9.2, v0.10.0, v0.11.0, v0.12.0, v0.13.0 |
| Open PRs | 2 (#66, #67) — both docs, both stale since March |
| Open issues | 0 |
| Last CI run | success, all five workflows |

### Local checkout state

The working directory is **not** on the current line of development:

- checked out on `refactor/presentation-layer-separation` @ `b5d8b98` (v0.12.0)
- that branch was merged upstream via PR #77 — its work is fully in `main`
- it is **8 commits behind** `origin/main`; local `main` is 7 behind
- no modified tracked files; 4 untracked paths: `.claude/`, `.superpowers/`,
  `docs/DESIGN-PROPOSAL.md`, `docs/difflicious_logo_basic.png`
- one ancient stash: `stash@{0}` — WIP on `backend-cleanup-v1.0` (February)

A `git checkout main && git pull` is the first thing any new work needs.

### Code health (verified, not assumed)

| Check | Result |
|-------|--------|
| `pytest` | **148 passed**, 76% coverage |
| Jest | **142 passed**, 16 suites |
| `mypy src/` | clean, 22 files |
| `ruff check .` | clean |
| `black --check .` | clean, 45 files |
| `./cilicious.sh` | **fails** — see below |

`cilicious.sh` aborts at its implicit `pnpm install` step with
`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`: pnpm wants to purge a
`node_modules/` that was installed by a different package manager (a stray
`package-lock.json` sits alongside `pnpm-lock.yaml`) and refuses to do so
non-interactively. This is an environment/script defect, not a code failure —
every underlying check passes when run directly. The project's stated #1 rule
("cilicious.sh must run clean before pushing") is currently unsatisfiable as
written.

---

## 2. Branch landscape

45 local branches, most of them archaeology:

- **~30 branches with `[gone]` upstreams** — merged and deleted on the remote.
  Pure noise; `git branch -vv | grep ': gone]'` is the pruning list.
- **Live remote branches:** `main`, `release/v0.13.0` (merged),
  `refactor/presentation-layer-separation` (merged), `presentation-layer-spec`
  (merged), `readme-rewrite` (PR #66), `site-content` (PR #67),
  `claude/improve-logging-debug-*`, `copilot/sub-pr-30` ("Initial plan", orphan),
  `version-1.1-rename` (abandoned, see §4).
- **Stalled feature work, never merged, no PR:**
  - `word-diff` (2025-07-28) — single commit, "Add word-diff parsing support with inline highlighting"
  - `feature/virtual-scrolling-phase1`, `phase2`, `feature/virtual-scrolling-phase-2` (2025-07-31, last commit literally "Last attempts to fix")
  - `temp`, `test/foo`, `backup-main-20250818-130847` — scratch
- Two remotes (`andrew-a-dev`, `andrew-a-dev-2`) point at a fork last touched
  long ago and unrelated to current work.

---

## 3. Open PRs

| PR | Branch | Age | State | Reality |
|----|--------|-----|-------|---------|
| [#66](https://github.com/insipid/difflicious/pull/66) | `readme-rewrite` | 2026-03-10 | mergeable | README rewrite (logo header, restructure), plus Docker Hub description auto-sync in `docker-publish.yml` and a PyPI short-description tweak. 9 commits. Ready. |
| [#67](https://github.com/insipid/difflicious/pull/67) | `site-content` | 2026-03-12 | mergeable | Titled "switch theme to slate, **build out content**" — but the diff against `main` is a **one-line change to `docs/site/_config.yml`**. The content half was never written. |

Both merge cleanly against current `main`.

---

## 4. What is visibly absent or incomplete

### Marked incomplete in the docs

`CLAUDE.md` carries two explicit 🚧 items:

- **Word-level diffs** — a `word-diff` branch has existed since July 2025 with one
  commit on it. Never reviewed, never merged.
- **Keyboard shortcuts / accessibility** — never started. The only shortcut in the
  product is the search focus key.

`PLAN.md` adds:

- **Sticky file headers** — "attempted but needs further investigation with CSS
  positioning in Alpine.js/Tailwind context". Still unresolved.

### The one unfinished audit batch

`docs/internal/reports/2026-02-05-v1.0-release-readiness-audit.md` is complete
across Batches 1, 2, 4, 5, 6, 7, 8 and 9. **Batch 3 — Bug Triage — was never
done.** It reads:

> - [ ] Review all bugs in `TODO.org` and decide: fix for v1.0 or defer (C4)
> - [ ] Fix or document any deferred bugs

`TODO.org` documented **7 active issues**. Batch 8 then ticked off "Delete or
`.gitignore` `TODO.org`" — and the file is gone from the working tree. It is,
however, **recoverable from git history**: `git show 06f53fd:TODO.org`. Its
outstanding items are:

**Bugs**
1. Expanding hunks is "sometimes broken like it used to be" — some cases expand incorrectly
2. Expanding hunks until they merge still leaves a bright line between them (thought fixed; wasn't)
3. "The whole hunkpatching thing needs to be fixed" — flagged as potentially expensive
4. Unexplained red box outlines coming from the syntax highlighting

**Features**
5. A font chooser in the web app — possibly by replacing the theme toggle with a settings flyout (theme + font + …)
6. Better command-line option handling and better stdout when running difflicious
7. General UI layout improvements

These were never triaged for v1.0, and they are invisible from the current tree —
this is the single most concrete piece of outstanding product work.

### Versioning is inconsistent with itself

`CHANGELOG.md` contains a full `## [1.0.0] - 2026-02-06` "Stable Release" entry,
positioned between the 0.12.0 and 0.10.0 sections. But:

- there is **no `v1.0.0` git tag**
- there is **no 1.0.0 on PyPI** (`0.1.0, 0.9.2, 0.10.0, 0.11.0, 0.12.0, 0.13.0`)
- the abandoned `version-1.1-rename` branch (2026-02-28) says why:
  *"Retarget release to 1.1.0 — skip 1.0.0 (spurious PyPI publish)"* — that
  retarget was then dropped in favour of continuing at 0.11.0.

So the version line actually reads 0.10.0 → (aborted 1.0.0) → 0.11.0 → 0.12.0 →
0.13.0, while the changelog claims 1.0 shipped. Anyone reading the changelog gets
the wrong story, and the "are we 1.0 yet?" question is unanswered.

### Documentation drift

- `CLAUDE.md` header: **"Last Updated: 2026-02-06 (v0.10.0)"** — three releases
  stale. It also states 73% coverage (actual: 76%) and describes the frontend as
  having `state.js` / `file-operations.js` modules that v0.12.0 deleted.
- `PLAN.md`: "Current Status (as of Version 0.10.0)".
- The project's own rule is that CLAUDE.md / README.md / PLAN.md stay in sync
  after architectural changes; the presentation-layer refactor didn't do that.

### Never-acted-on proposals

- **`docs/DESIGN-PROPOSAL.md`** (2026-04-03, "Warm Precision") — a complete,
  prioritised visual redesign: brand amber accent, Instrument Sans + Bricolage
  Grotesque, file-card border strips, amber hunk pills, warmed light surfaces,
  deepened dark surfaces, empty/loading state redesign, motion polish. 12 ranked
  items; the author's note says items 1–4 are "under an hour" of `styles.css` +
  `toolbar.html` and would shift the identity immediately. **The file is
  untracked — it isn't even committed to the repo.**
- **TypeScript migration** proposal (2025-08-03) — untouched.
- **Virtual scrolling / lazy rendering** proposal (2025-07-30) — three dead
  branches, no resolution.

### The public face

GitHub Pages infrastructure was merged (PR #65) and deploys `docs/site/**` on
push to `main`. The site's entire content is:

> # Difflicious … *Content coming soon.*

---

## 5. If you wanted to cut another release

**Nothing is currently queued.** `main` is clean and released; there is no
work-in-progress branch waiting to land. A 0.14.0 has to be assembled, not
finished.

### Mechanics (already automated — this part is easy)

1. Bump `__version__` in `src/difflicious/__init__.py`
2. Add the `CHANGELOG.md` entry
3. Open a PR — `check-version-bump.yml` enforces that the bump happened
4. Merge to `main` — `auto-release.yml` diffs the version against `HEAD~1`, tags,
   and creates the GitHub Release; `pypi-publish.yml` and `docker-publish.yml`
   fire off that.

So the release cost is near zero. The question is only what goes in it.

### The cheapest credible 0.14.0 (a day, mostly docs)

- Merge **#66** and **#67** — both mergeable, both five months stale
- Write actual **site content** (the thing #67's title promised)
- Fix **`cilicious.sh`** — set `CI=true` / `confirmModulesPurge=false`, and delete
  the stray `package-lock.json` so pnpm stops trying to purge `node_modules`
- Refresh **CLAUDE.md** to v0.13.0 reality; reconcile the **1.0.0 changelog entry**
  with the fact that 1.0.0 never shipped
- Prune the ~30 `[gone]` branches, drop the February stash

### The release that would actually be *visible* — "0.14.0: Visual Identity"

Commit `docs/DESIGN-PROPOSAL.md` and implement its items 1–4: file-card left
border strip, amber accent + toolbar accent line, amber hunk-expansion pill,
Instrument Sans UI type. Pure CSS plus minimal HTML, no backend changes, no new
dependencies beyond two Google Fonts families (and there's already a
`DIFFLICIOUS_DISABLE_GOOGLE_FONTS` escape hatch). Highest impact-per-hour on the
board by a distance, and the semantic CSS variable system means it's additive
rather than invasive.

### The releases that need a decision first

- **Word-level diffs** — resurrect `word-diff` (13 months old, will need rebasing
  onto the post-refactor frontend) or close it and start fresh
- **Keyboard shortcuts** — greenfield; pairs naturally with an accessibility pass
- **Virtual scrolling** — three failed attempts say this needs a design, not
  another branch
- **1.0** — the readiness audit is done bar Batch 3. The `TODO.org` list is
  recoverable from git, so that gate is one triage session away from closing;
  the four bugs in it (hunk expansion, merged-hunk seam, hunkpatching, syntax
  highlighting outlines) are the real content of a 1.0.

---

## 6. Suggested immediate actions

1. `git checkout main && git pull` — get off the stale v0.12.0 branch
2. Restore the `TODO.org` list (`git show 06f53fd:TODO.org`) into a tracked
   document or GitHub issues, and finally triage it (audit Batch 3)
3. Commit `docs/DESIGN-PROPOSAL.md` so the redesign work stops living in an
   untracked file
4. Merge or close #66 and #67
5. Fix `cilicious.sh` so the project's stated release gate actually runs
6. Prune dead branches and reconcile the 1.0.0 changelog entry
