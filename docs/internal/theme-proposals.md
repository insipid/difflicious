# Four theme proposals: more colour, more character

**Status:** proposals for review. All four are implemented and registered so they
can be run and screenshotted, but they are *candidates* — the intent is to keep
one or two and delete the rest before this lands.

The first three are variations on "more colour and more shape". The fourth,
Console, was asked for afterwards as a deliberate outlier: as unlike the other
six as the contract allows, rather than a fourth point on the same axis.

```bash
difflicious --theme terrace
difflicious --theme draught
difflicious --theme riso
difflicious --theme console
```

## Where the existing three sit

| Theme | Ground | Accent | Shape | Type |
|---|---|---|---|---|
| `ledger` | one warm neutral, cards near-white | ochre | 8px cards, hairline edges, soft shadow | Bricolage Grotesque |
| `slate` | one cool neutral, cards white | indigo | 5px cards, no toolbar rule | IBM Plex Sans |
| `sorbet` | bright cool, cards white | turquoise | 18px cards, 2px near-black outline, pill controls | Fredoka / Nunito |

The pattern all three share, and the one the proposals break: **a single neutral
ramp with white cards sitting on it.** Colour appears only in the accent and in
the diff tints. Sorbet already varies the geometry; none of them varies the
*surfaces*.

## What the proposals change

Each candidate gives the toolbar, the page, the cards and the line-number
gutters their own tint rather than four steps of one ramp. That is what makes the
palette read as coloured rather than as grey-with-an-accent, and it needed no new
tokens — `--surface-chrome` and `--diff-gutter-bg` were already separate roles,
just previously set to neighbouring values.

Each also picks a hue no shipped theme uses, so they never blur together: ochre,
indigo, turquoise, then **kiln teal**, **mulberry**, **ultramarine**, **magenta**.

Green and red stay reserved for diff semantics in all four, per THEMING.md. The
mulberry in Draught is the closest call; it is violet-pink against a rust-red
deletion tint, and the two never appear on the same element.

---

## 1. Terrace — warm plaster, rounded, sunlit

Clay walls, cream panels, an ivory rail along the top, sand-tinted gutters, and a
blue-leaning teal running cool against all of it. The softest of the three:
18px cards, pill controls and badges, a 2px warm edge, wide soft shadows.
Fraunces over Karla — a serif wordmark, which no theme currently has.

Nearest relative is Ledger, and the point of difference is that Ledger is one
warm neutral while Terrace is four distinct warm tints plus a cool accent.

![Terrace, light](../screenshots/proposals/detail-terrace-light.png)
![Terrace, dark](../screenshots/proposals/detail-terrace-dark.png)
![Terrace, cards](../screenshots/proposals/cards-terrace-light.png)
![Terrace, full, light](../screenshots/proposals/terrace-light.png)
![Terrace, full, dark](../screenshots/proposals/terrace-dark.png)

## 2. Draught — drafting board, squared off, ruled

A petrol-blue board with bone paper pinned to it and a steel rail across the top.
Character from structure rather than softness: 3px cards, 1px radius controls,
flat elevation (`0 1px 0`, paper lying on a board rather than floating above it),
wide letter-spacing on the small-caps labels, a taller diff line and a wider
number column so the body reads as ruled paper. Space Grotesk over Archivo.
The accent is mulberry — a warm note against a cool ground.

Densest of the three, and the one that most rewards a large diff. It is also the
one with the least colour; if it is the favourite, the board wants pushing
further towards petrol.

![Draught, light](../screenshots/proposals/detail-draught-light.png)
![Draught, dark](../screenshots/proposals/detail-draught-dark.png)
![Draught, cards](../screenshots/proposals/cards-draught-light.png)
![Draught, full, light](../screenshots/proposals/draught-light.png)
![Draught, full, dark](../screenshots/proposals/draught-dark.png)

## 3. Riso — two-ink print, hard offset ink, slab type

A risograph print: dusty heather ground, cream stock over it, and a violet-black
ink used both for the card outline and for shadows with **no blur at all** —
`3px 3px 0`, the way a second pass of ink sits slightly off-register. That single
change to the shadow tokens is what makes every card read as a printed object
instead of a floating panel, and it is the most distinctive thing any of the
three does. Chunky 8px status strips, pill badges, ultramarine accent, Zilla Slab
over Work Sans.

The one caveat: in dark mode a near-black ink on a near-black ground erases the
outline, so the card edge steps up the ramp instead and the offset reads as
depth rather than as ink. Dark Riso is therefore a little less characterful than
light Riso.

![Riso, light](../screenshots/proposals/detail-riso-light.png)
![Riso, dark](../screenshots/proposals/detail-riso-dark.png)
![Riso, cards](../screenshots/proposals/cards-riso-light.png)
![Riso, full, light](../screenshots/proposals/riso-light.png)
![Riso, full, dark](../screenshots/proposals/riso-dark.png)

---

## 4. Console — the whole interface as a terminal

The outlier. Rather than another tinted, softly-shaped palette, this one inverts
every trait the other six share, all at once:

| | The other six | Console |
|---|---|---|
| Cast | warm, cool, petrol, lilac — all tinted | achromatic, a true neutral grey |
| Corners | 5–18px | zero, including badges and controls |
| Elevation | blurred or offset shadows | none at all; rules only |
| Contrast | mid-tone edges, gentle | near-black rules on white; true black in dark |
| Interface face | sans or serif | the runtime **mono** face |
| Density | comfortable | short controls, 1.375rem diff rows |

The monospace interface is the biggest single lever a theme file has — it changes
every label, button, badge and the wordmark — and it costs nothing to load:
`--font-ui` points at `--font-family-mono`, the token the app rewrites from
`DIFFLICIOUS_FONT` per request. So Console follows whichever programming font is
configured, and registers no `google_fonts_url` at all, because that face is
already fetched for the diff body.

The accent is magenta, ANSI colour 5 — on-concept, and the one hue nothing else
claims. The syntax palette is taken from the same 16-colour set rather than tuned
by hand, so highlighting reads as a terminal too. It is also the only proposal
whose dark ground is actually `#000000`; the others all go to a tinted near-black.

Being flat and square, it fits noticeably more diff on a screen than the others,
which is the practical argument for it beyond the aesthetic one.

![Console, light](../screenshots/proposals/detail-console-light.png)
![Console, dark](../screenshots/proposals/detail-console-dark.png)
![Console, cards](../screenshots/proposals/cards-console-light.png)
![Console, full, light](../screenshots/proposals/console-light.png)
![Console, full, dark](../screenshots/proposals/console-dark.png)

---

## Interaction with the pinned toolbar

Rebased onto the toolbar redesign (#85), which made the toolbar sticky and pins
file headers beneath it at `--file-header-sticky-offset`, now defined as
`var(--toolbar-height-measured, var(--toolbar-height))` and required to equal the
toolbar's height.

All four proposals override `--toolbar-height` — Terrace and Riso to `3.5rem`,
Draught to `3rem`, Console down to `2.75rem`. That is safe, and worth
recording why: the offset
resolves *through* `--toolbar-height`, and `navStore` publishes the bar's real
rendered height into `--toolbar-height-measured` via a `ResizeObserver`, so the
pinned header follows a theme's chrome without the theme having to know the
contract exists. Verified per theme, with the header pinned:

| Theme | `--toolbar-height` | measured | gap between toolbar and pinned header |
|---|---|---|---|
| `ledger` | 3.25rem | 52px | 0px |
| `terrace` | 3.5rem | 56px | 0px |
| `draught` | 3rem | 48px | 0px |
| `riso` | 3.5rem | 56px | 0px |
| `console` | 2.75rem | 44px | 0px |

A theme that set a *fixed* `--file-header-sticky-offset` instead would break this,
so it is best left alone.

## Two fixes to the screenshot harness, made along the way

Both are in `scripts/screenshot.py` and are independent of which theme wins.

**Webfonts were never in their own screenshots.** Fonts load with
`display=swap`, and the script shot the page before they arrived, so every theme
screenshot in `docs/` shows the fallback face rather than the theme's own
typeface. Fixed by awaiting `document.fonts.ready` before capture. This means the
existing `docs/screenshots/themes/*.png` are stale and worth regenerating
whichever proposal is chosen.

**`--themes a,b,c`** captures a subset instead of all of them, so iterating on
one theme no longer means re-shooting every theme.

## If a proposal is adopted

1. Delete the candidates that lost, from `themes/` and from `AVAILABLE_THEMES`
   in `src/difflicious/config.py`.
2. Drop the "candidates under review" comment block in `config.py`.
3. Add the winner to the table and thumbnail grid in `docs/THEMING.md`, and to
   the theme list in `CLAUDE.md` and `README.md`.
4. Regenerate `docs/screenshots/themes/` with
   `uv run python scripts/screenshot.py --all-themes` — now that fonts are
   awaited, every existing theme's shots change too.
5. Delete this file and `docs/screenshots/proposals/`.
