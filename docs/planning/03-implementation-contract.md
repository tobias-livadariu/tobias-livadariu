# Implementation contract for the profile arcade

## Decisions and scope

| Item | Contract |
| --- | --- |
| Featured title | Minecraft Classic, served from Mojang’s published player at https://classic.minecraft.net/. Use the real browser release. |
| Second milestone | 3D Pinball for Windows – Space Cadet via the upstream-listed web port at https://pinball.alula.me/. Acknowledge k4zmu2a and alula. |
| README | One self-contained SVG, ordinary outer anchor to the playable site. Retain the current section order, width, animated island and private aggregate. Add rows after metrics. |
| Play surface | Static project Pages site. Use ordinary HTML, CSS and a small browser module. Enter at the featured game via an explicit fragment such as `#play/minecraft-classic`. Visiting the base URL opens the prompt. |
| Network | No game runtime, game-origin requests, speculative preload or external font on GitHub. Mount one iframe only on an explicit launch or the intentional README deep link. Remove it when exiting or switching games. |
| Runtime state | Per tab, in memory. Current virtual directory, printed history and active game suffice. No account, backend or shell process. |

## Repository touchpoints

- Read `CLAUDE.md`, `scripts/README.md`, `scripts/profile-readme.config.mjs`, `.github/workflows/profile-readme.yml`, then `scripts/render-profile-readme.mjs`. The renderer owns the SVG and README image markup. `syncReadmeImagePath` currently expects one exact img string. Migrate the old markup and make subsequent renders of the new linked markup idempotent. Bump the versioned asset path through config when appropriate. Verify the bot stages the intended outputs.
- Extend `renderProfileStream` after its `metricLines(stats)` loop. Reuse `pushLine`, `gutterSegments`, `promptSegments` and `commandSegments`. Continue its actual lineNumber and y through every new row. Include the new rows in height and maximum width calculations. Keep the footer within the current content width to preserve the scale of all earlier text.
- Reuse the palette, 64-unit gutter, 8.1 advance, 15-unit type, 21-unit line height and embedded printable-ASCII Iosevka subset. Share the minimum tokens and launch metadata that both surfaces need. The Pages prompt can start at the launch block; avoid copying the entire heavy SVG above the actual player. Derive its starting gutter number from generated layout or a layout calculation tested with variable stats. Keep the gutter outside the frame. Adapt the page to legible CSS pixels on phones.
- The local reference is `/Users/tobias/repos/portfolio-website/portfolio-v3/src/background/ascii-graph-transition.ts` and `transition-fronts.ts` in that directory. If unavailable, use the visual description in the experience plan. Draw seeded low-count triangular overlays with CSS transforms/opacity. Base content is visible and decorative overlays invisible when animation is unavailable. Animate parent section groups so island frame opacity keyframes remain independent. In reduced motion explicitly choose one visible island frame, disable other frames, freeze the footer and skip the reveal. Check the still with CSS animation disabled.
- Keep the daily render on Node standard library only. Reuse existing generated island/font caches. If adding generator inputs, include them in workflow path filters. Game traffic, game builds and Pages publishing have no use for PROFILE_TOKEN. Prefer a dedicated static-site directory and a separate Pages artifact workflow publishing just its public files, with commit-pinned actions and narrowly scoped Pages deployment permissions. Confirm repository Pages settings and effective URL before exposing a live link. Avoid publishing docs/planning as site content. Use relative site assets under the repository subpath. [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Commands and focus

Use a native labeled input and form with a fixed dictionary of commands. Virtual root represents the profile repo and contains games/. Support help, pwd, ls, cd games, cd .., cd / and execution via ./games/minecraft-classic from root or ./minecraft-classic from games. Give Space Cadet the same two path forms in its milestone. Resolve relative paths against this directory tree. Clamp parent at root. Return readable missing-file, missing-directory or unsupported-command messages. A fictional java -jar spelling is unnecessary for the hosted Classic release.

Only game IDs in the fixed manifest map to trusted upstream URLs. Treat spaces, unexpected arguments, shell punctuation and pasted markup as ordinary untrusted text. Render output with textContent. Keep input away from eval, process APIs, fetch targets and dynamic HTML. Example path through the app:

```text
@repos/tobias-livadariu | main
% ls
games/
% cd games
@games | main
% ls
minecraft-classic   space-cadet
% ./minecraft-classic
```

When the visitor enters a game, show its title and focusable player, a direct upstream play link and a reachable exterior “Return to terminal” control. Restore the input and a fresh prompt on exit. Never depend on key events bubbling out of a cross-origin iframe. Verify pointer lock, Escape's native release, Tab/Shift+Tab, browser Back and actual touch play. An unplayable mobile build should give an honest desktop-controls hint and leave the shell usable. Parent touch buttons cannot synthesize trusted keystrokes inside a foreign player. Let upstream supply its own controls and avoid claims of touch support until tested.

## Acceptance evidence

1. Capture the original and new offline renders from a clean temporary checkout at the same data values. Render twice with dependency directories absent. Check identical second output, SVG XML validity, contiguous row numbers, gutter colors, readable first frame and preservation of existing text, glyphs and positions above the footer. Exercise the old README reference as well as the migrated one.
2. Measure raw and gzip-9 bytes before and after under identical conditions. Initial design target is within 5% of baseline gzip size. Treat that as a design budget to explain, not a proven threshold. Capture a cold-load filmstrip and a warm-load filmstrip. Record time to first visible prompt independently of reveal duration. Do not claim progressive streaming without a first-paint measurement.
3. Inspect as an actual img in rendered GitHub markup, light and dark surroundings, desktop and phone width, plus reduced motion and static rendering. Check first, mid-shard and settled frames. Compare at identical width. The reveal must leave the identity legible, preserve clear glyph edges and avoid a blank start or rapid flashing.
4. On the site, follow the README deep link and also start from the plain terminal. Run the command sequence, a bad path and an unsupported command. Verify normal text editing, focus restoration and repeated game switching. Inspect network requests on profile-only, prompt-only, featured-game and second-game visits. Record compressed startup bytes and time to first successful action for each launched game.
5. Start Minecraft, look around, walk, place or remove a block and exit. Start Space Cadet, launch a ball, use both flippers and exit. Test Chromium plus a second engine and a narrow touch viewport. Check fallback behavior with the game host blocked and with JS disabled on the launcher. Provide a usable direct link and a route back. Report any physical-device or live GitHub checks that remain unverified.
6. Smoke-test the deployed project path and link after authorized publication. Verify workflow generation with current data and no private repository names outside the existing aggregation. Keep deployment readiness separate from a successful public launch.
