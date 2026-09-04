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

Two knobs in `ascii-image-profiles.mjs` control this, and they do different jobs:

- **`color.levels`** snaps each channel onto evenly spaced steps. This shrinks
  the *vocabulary* of colours, which is what gzip rewards, since a small set of
  repeated strings compresses far better than a large one.
- **`color.mergeThreshold`** lets a cell join the run in progress when its colour
  is within that many units. This shrinks the *number of runs*, which is what
  raw size tracks. It beats making `levels` finer, because two cells either side
  of a ladder boundary never merge however fine the ladder is.

They must be tuned together: a threshold below one quantisation step
(255/(levels-1)) does nothing at all, because no two neighbours are ever that
close after snapping. At `levels: 32` the step is 8.2, which is why the
threshold is 8.

Current settings hold the largest colour shift to 8/255 with a mean of 2.44, and
leave every glyph untouched.

### Things that were measured and rejected

Do not spend time re-deriving these:

- **A better colour palette (median cut).** Going from 2,595 colours to 257 cut
  run count by only 3% while pushing peak error to 46/255. Runs break because of
  *spatial* variation from the dithering, not because the palette is large.
- **`<use>` to share repeated rows.** There are none. All 1,450 island rows are
  distinct, and 0% of rows match between consecutive frames.
- **Swapping `fill="#rrggbb"` for CSS classes.** Cuts 100 KB of raw size and
  makes the gzipped file *bigger* (125.1 KB to 126.0 KB). gzip already replaces
  each repeated fill with a back-reference; the stylesheet adds thousands of
  unique rules that compress badly. Raw size is not the target.

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

## Commit stats are a rolling window

`COMMIT_WINDOW_DAYS` in `render-profile-readme.mjs` is how far back the
commit section looks, counted from the moment of the render. It is deliberately
not the calendar month: a calendar window shows almost nothing on the 1st and
fills up over the following weeks, which reads as inactivity right next to a
contribution graph that says otherwise.

Repositories come from the owner's repo list, filtered to those pushed inside
the window, not from the public events feed. Events are capped at roughly 300
entries and the head SHA an event records stops resolving after a force push,
so an actively worked repository could vanish from these numbers. Switching to
the repo list took the reported total from 2 commits to 87 on the same day.

Only the default branch counts, and only commits whose author is the user. That
is what GitHub's contribution graph counts, and matching it is the point, since
the two sit next to each other on the profile.

## Environment variables

| variable | effect |
|---|---|
| `PROFILE_README_OFFLINE=1` | skip the GitHub API and use the fallback stats; useful for local runs |
| `PROFILE_USERNAME` | render a different account's stats |
| `PROFILE_REBUILD_FRAMES=1` | same as passing `--rebuild-frames` |
| `PROFILE_ASCII_BROWSER_EXECUTABLE` | explicit browser binary for the rebuild |
| `PROFILE_ASCII_BROWSER_CHANNEL` | playwright channel for the rebuild (default `chrome`) |
