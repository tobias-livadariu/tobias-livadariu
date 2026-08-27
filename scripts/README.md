# Profile terminal renderer

The GitHub profile README is a single generated SVG. `profile-readme.yml` renders
it every day, and on pushes that touch the inputs listed in that workflow.

## The two paths

Rendering is split so that the part needing a browser runs rarely and locally,
while the part running daily in CI needs nothing but Node.

| | command | needs | when |
|---|---|---|---|
| **Render** | `npm run render` | Node only | every day, in CI |
| **Rebuild frames** | `npm run build:frames` | dev deps + Chrome | only when the island art or its tuning changes |
| **Rebuild font** | `npm run build:font` | `pyftsubset` | only when the typeface changes |

Turning the island spritesheet into coloured ASCII means rasterizing and sampling
pixels, which needs a real browser. Those frames depend only on the source atlas
and the tuning profile, so they are built once and committed to
`assets/generated/island-ascii-frames.json`. Every later render replays that
cache. This is why `playwright-core` is a **devDependency** and why the workflow
has no install step.

## Rebuild the frames after changing any of these

- `assets/source/islands-1.png` or `assets/source/islands-1.json`
- `STATIC_ASCII_PROFILES` in `ascii-image-profiles.mjs`
- the island grid size or `ISLAND_FLIP_X` in `render-profile-readme.mjs`

```sh
npm install          # once, to get playwright-core
npm run build:frames # rewrites the cache, then renders
```

The cache stores a fingerprint of exactly those inputs. If they change without a
rebuild, `npm run render` fails with a message naming the fix rather than
silently drawing the previous artwork. CI runs the plain render, so a forgotten
rebuild fails the workflow instead of shipping stale art.

The rebuild launches Chrome through `playwright-core`, which ships no browsers of
its own. It uses your installed Chrome by default; override with
`PROFILE_ASCII_BROWSER_EXECUTABLE` or `PROFILE_ASCII_BROWSER_CHANNEL`.

## Keeping the SVG small

The SVG run-length encodes each row into `<tspan>` elements, so its size is
driven by how often the colour changes between neighbouring cells, not by the
frame count. Sampling noise used to leave adjacent cells differing by a unit or
two, which broke every run and tripled the file.

`color.levels` in `ascii-image-profiles.mjs` snaps each RGB channel onto evenly
spaced steps so those neighbours merge back together. At the current value of
`32` the largest colour shift is 5/255 and the glyphs are untouched. Lowering it
shrinks the file further but risks banding across the shadow gradients.

### The embedded font

The SVG embeds its font so it renders the same everywhere, which makes that font
a third of what a visitor downloads. The vendored `IosevkaTerm-Regular.ascii.woff2`
is misleading: its cmap is trimmed to 95 codepoints but it still carries all 2809
of Iosevka's glyph outlines, so 64 KB of every download was glyphs that can never
be drawn.

`assets/generated/iosevka-term-regular.ascii.subset.woff2` is the real subset at
5 KB, built by `npm run build:font`. It keeps the same 95 printable ASCII
codepoints, the same advance widths, and the `zero` feature the stylesheet
enables. Screenshots of the SVG before and after the swap are pixel-identical.

It subsets `U+0020-007E` rather than only the glyphs currently used, because the
stats text changes daily and a glyph missing from the subset would render as a
fallback box.

### Tuning notes

Two things to keep in mind when tuning:

- **Glyphs must not change.** `levels` only affects colour. If a change alters
  the characters, it changed the render, not just the encoding.
- **Measure the gzipped size.** GitHub serves the SVG with `content-encoding:
  gzip`, so transfer size is roughly a sixth of the size on disk.

## Environment variables

| variable | effect |
|---|---|
| `PROFILE_README_OFFLINE=1` | skip the GitHub API and use the fallback stats; useful for local runs |
| `PROFILE_USERNAME` | render a different account's stats |
| `PROFILE_REBUILD_FRAMES=1` | same as passing `--rebuild-frames` |
| `PROFILE_ASCII_BROWSER_EXECUTABLE` | explicit browser binary for the rebuild |
| `PROFILE_ASCII_BROWSER_CHANNEL` | playwright channel for the rebuild (default `chrome`) |
