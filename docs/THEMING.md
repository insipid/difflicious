# Theming Difflicious

Difflicious ships several themes and picks one at startup. Every design decision
lives in the theme files under `src/difflicious/static/css/themes/`; no other
file may declare a literal colour, radius, or spacing value.

## Choosing a theme

```bash
difflicious --theme slate        # for one run
export DIFFLICIOUS_THEME=slate   # for the shell
difflicious --list-themes        # what is available
```

The default is `ledger`. An unknown name on the command line is rejected with the
valid options; an unknown name in the environment falls back to the default
rather than refusing to start, so a stale shell profile cannot break the tool.

| Theme | Look |
|---|---|
| `ledger` (default) | Warm paper and ink, single ochre accent |
| `slate` | Cool neutral greys, indigo accent, squarer and denser |

## How the files fit together

Two stylesheets load, in this order:

```
themes/_contract.css   scales, density knobs, back-compat aliases  (always)
themes/<name>.css      palette + semantic roles                    (selected)
```

The contract holds what is theme-independent. A theme supplies the palette and
the roles built on it — and because it loads second, it may override anything in
the contract. `slate.css` does exactly that to get squarer corners and a
different display face, which is the intended way for a theme to change more
than colour.

Custom property resolution is lazy, so the aliases in the contract may reference
semantic tokens the theme has not declared yet. Order never matters.

## The rule

```
themes/*.css  →  declare tokens        (all design decisions)
styles.css    →  consumes tokens       (structure and layout only)
templates     →  use semantic classes  (never Tailwind colour utilities)
```

`styles.css` is checked for this: it contains zero hex colours. If you find
yourself typing `#` or a raw `px` radius into it, add a token instead.

## Token layers

Between them, the contract and a theme cover five sections.

| Section | What it holds | Edit it when |
|---|---|---|
| 1. Primitives | Space, radius, border-width, type, motion scales. Theme-independent. | Changing the rhythm of the whole UI |
| 2. Palette | Raw colour ramps, one set per theme (`--theme-paper-*`, `--theme-ink-*`, `--theme-accent-*`) | Changing the actual colours |
| 3. Semantic | Role aliases: `--surface-*`, `--text-*`, `--border-*`, `--accent-*`, `--diff-*` | Changing what a colour *means* |
| 4. Component | Density knobs: `--control-height`, `--file-card-accent-width`, `--diff-line-height`, `--toolbar-height` | Making things tighter, rounder, flatter |
| 5. Legacy | Back-compat aliases for older variable names | Rarely — these exist so the swap is non-breaking |

Components reference **semantic** and **component** tokens only. They never
reach past those into the palette, which is what makes a theme swap total.

## Common changes

**Different accent colour.** Edit the four `--theme-accent-*` values in the light
block and again in `[data-theme="dark"]`. Everything interactive follows:
checkboxes, focus rings, the toolbar rule, hunk expansion pills, the wordmark
full stop.

**Rounder or squarer.** Change `--radius-sm` / `--radius-md`, or the component
knobs `--control-radius` and `--file-card-radius`.

**Tighter or airier.** The space scale is a 4px grid (`--space-2xs` … `--space-4xl`).
For the diff body specifically, `--diff-line-height` and `--diff-gutter-width`.

**Different typefaces.** `--font-display` (wordmark), `--font-ui` (interface).
`--font-mono` is set at runtime from `DIFFLICIOUS_FONT` and should not be
hardcoded here. Remember to update the Google Fonts link in `base.html`, which
sits behind the `DIFFLICIOUS_DISABLE_GOOGLE_FONTS` opt-out.

**A whole new theme.** Copy `themes/ledger.css`, change the values, and register
it in `AVAILABLE_THEMES` in `src/difflicious/config.py`:

```python
"midnight": {
    "name": "Midnight",
    "description": "What it looks like, in a few words",
    "file": "midnight.css",
},
```

`ledger.css` declares every token a theme is expected to supply, so starting from
a copy of it means nothing is missed. A test asserts that each registered theme's
stylesheet actually exists.

## Diff colours are reserved

Green and red belong to diff semantics and nothing else. The accent is
deliberately a hue far from both so it never reads as "added" or "removed".
Interface elements — badges, strips, buttons, states — take the accent or a
neutral. Keep it that way; it is the reason the diff stays readable.

## Syntax highlighting

Token colours are `--syntax-*` in `theme.css`. Pygments emits CSS classes and
`SyntaxHighlightingService.get_css_styles()` maps those classes onto the
variables, so highlighting follows the active theme like everything else.

Highlighting is rendered server-side once while the theme is switched in the
browser. That is why the formatter must stay class-based (`noclasses=False`) —
inline styles would bake one theme's colours into the markup and no stylesheet
could override them.

## Both themes, every time

Light and dark are peers, not a base and a filter. Every semantic token is
declared in both blocks of a theme file. Test both, for each theme:

```bash
DIFFLICIOUS_THEME=slate uv run python design-review/shoot.py <dir>
```

## Not yet built

The theme is fixed for the life of the server process. Still to come: a picker in
the UI that persists to `localStorage`, per-request selection, and pointing at a
stylesheet outside the registry (a path or URL) so people can bring their own.
The registry in `config.py` is the seam those will extend.
