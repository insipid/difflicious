# Archive

Documents here described work that is **finished**. They are kept because they
explain why the codebase looks the way it does, not because they describe how it
works now. Nothing here should be used as a guide to current behaviour, and
nothing in the live docs should link to it as instruction.

For how things work today, see `README.md`, `DEVELOPING.md`, `CLAUDE.md`, and the
guides in `docs/`.

## What is in here

| Document | Shipped | What it was |
|---|---|---|
| `2025-07-29-1015-expandable-context-feature.md` | 0.4-era | Plan for expandable context lines |
| `2025-11-04-2318-gitpython-migration-plan.md` | 2025-11-05 | Plan to replace subprocess git calls with GitPython |
| `2025-11-18-alpine-component-architecture.md` | 2025-11 | Architecture for the hybrid Alpine + ES modules frontend |
| `2025-11-22-1.0-release-execution-plan.md` | superseded | 1.0 release plan, written when current version was 0.9.2 |
| `javascript-modularization-plan.md` | 2026-02-06 | Plan to split `diff-interactions.js` into modules |
| `presentation-layer-separation.md` | v0.12.0 | Design spec for the four layer contracts |
| `2026-04-12-presentation-layer-separation.md` | v0.12.0 | Implementation plan for the above |
| `tailwind-design-system.md` | superseded | Snapshot of the CSS variables as they stood in `styles.css` |
| `2026-04-03-design-proposal-warm-precision.md` | not implemented | Visual redesign proposal; a later pass took a different direction |

## Also removed

`docs/reference/app.js.reference` and `docs/reference/diff-interactions.js.reference`
were verbatim copies of JavaScript files deleted during the modularization work.
Git history holds them, so the copies were deleted rather than archived:

```bash
git log --all --oneline -- src/difflicious/static/js/app.js
git show <commit>:src/difflicious/static/js/diff-interactions.js
```
