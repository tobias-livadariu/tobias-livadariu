# Repository notes

This repository is the GitHub profile README. `README.md` is a single generated
SVG plus a comment — edit the renderer, never the SVG or the image tag by hand.

See `scripts/README.md` for how the renderer is put together. The rules below are
the ones that break CI or the profile when missed.

## Keep the daily render dependency-free

`.github/workflows/profile-readme.yml` runs `node scripts/render-profile-readme.mjs`
with **no install step**. The render must keep working on Node's standard library
alone.

Anything needing a package or a browser belongs in the rebuild path
(`npm run build:frames`), which is run locally and commits its output. Do not add
a runtime dependency, and do not add `npm ci` back to the workflow, to make the
daily render work. `playwright-core` is a devDependency for exactly this reason.

To confirm a change keeps this property, render with the dependencies hidden:

```sh
mv node_modules node_modules.hidden
PROFILE_README_OFFLINE=1 npm run render
mv node_modules.hidden node_modules
```

## Rebuild the ASCII frames when the art changes

`assets/generated/island-ascii-frames.json` is committed, and holds the browser
sampled ASCII frames. Rebuild it with `npm run build:frames` after changing the
source spritesheet, `STATIC_ASCII_PROFILES`, or the island grid size. The render
verifies a fingerprint of those inputs and fails loudly when the cache is stale,
so a forgotten rebuild breaks the workflow rather than shipping stale art.

## Watch the generated SVG's size

The SVG loads on every view of the profile, so size is a real cost. It is
dominated by how many `<tspan>` runs each row breaks into, which is a function of
how often the colour changes between neighbouring cells — not the frame count.
`color.levels` is the knob; `scripts/README.md` explains the trade-off.

When judging a change, compare the **gzipped** size, since GitHub serves the file
compressed, and check that the glyphs are unchanged. A colour-encoding change
that alters characters is a bug.

## Verifying a change

`PROFILE_README_OFFLINE=1` avoids the GitHub API so local runs are deterministic
and comparable. Render before and after with it set and diff the two SVGs;
compare sizes and confirm the text content matches.

The bot commits generated output on a daily cron and on pushes touching the
renderer, so after pushing, check that the run actually produced a commit — a
green run can still be a no-op.
