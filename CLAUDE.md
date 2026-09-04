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

## The embedded font is a subset

`assets/generated/iosevka-term-regular.ascii.subset.woff2` is what gets embedded,
not the vendored face under `assets/fonts/`. The vendored one still carries every
Iosevka glyph outline despite its trimmed cmap, and embedding it wasted 64 KB on
every page load. Rebuild the subset with `npm run build:font` if the typeface
changes, and keep it covering all of `U+0020-007E` so daily-changing stats text
can never hit a missing glyph.

## The workflow's action chain is deliberately short and pinned

The render job holds `PROFILE_TOKEN`, which can read every private repository
this account owns, and any action running earlier in that job can reach what the
render step executes. So the job uses exactly one action, `actions/checkout`,
pinned to a commit rather than a tag: a moved tag is how trusted actions are
compromised in practice, and a SHA cannot be repointed.

Do not add an action to this job without pinning it to a SHA, and prefer a `run:`
step over an action where the two are equivalent.

Pins are moved forward automatically rather than by hand. `.github/dependabot.yml`
holds every routine bump for a seven day cooldown, on the reasoning that a
compromised release of a popular action is normally caught within a day or two,
so waiting a week means this repository is never among the first to run one.
Security updates are exempt from the cooldown, so a fix for a disclosed
vulnerability still arrives immediately. `dependabot-auto-merge.yml` then renders
offline to check the bump did not break anything and merges it, so nothing
depends on someone reviewing a queue of pull requests.

## Private commit counts need PROFILE_TOKEN

The `{PRIVATE}` row aggregates commits across private repositories and never
names them. The workflow's `GITHUB_TOKEN` cannot see private repositories, so
without a `PROFILE_TOKEN` secret that row is absent rather than wrong. Never
render a private repository's name into the SVG; the profile is public.

## Watch the generated SVG's size

The SVG loads on every view of the profile, so size is a real cost. It is
dominated by how many `<tspan>` runs each row breaks into, which is a function of
how often the colour changes between neighbouring cells — not the frame count.
`color.levels` and `color.mergeThreshold` are the knobs, and they must be tuned
together; `scripts/README.md` explains the trade-off and lists the optimisations
already measured and rejected.

Judge every such change by the **gzipped** size. Raw size is misleading: swapping
fills for CSS classes cuts 100 KB of raw bytes and makes the transfer larger.

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
