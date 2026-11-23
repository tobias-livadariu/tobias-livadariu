# Implementation status

## Started

Implementing the approved Minecraft Classic feature and Space Cadet follow-up. The initial research established framed startup on desktop Chrome. Next verify actual game input, implement the static site and renderer, then run two independent audits. No publication requested. See [resume prompt](06-resume.md).

## Playable terminal implemented

Buildless arcade/ now contains the actual player, virtual directories, command form and browser-history routing. GitHub Pages lookup returned 404. Keep the launch private to this working tree until the destination is deployed. The offline reference checkout is in /private/tmp/profile-arcade-work/baseline on this Mac.

## Renderer and deployment staged

The renderer now generates v15, animated isometric terrain, shard overlays, reduced motion and a numbered launch link. The Pages workflow stages only the arcade source and subset font. Offline rendering succeeded. The first Minecraft input probe clicked a HUD overlay and timed out; the next probe targets the actual noa-canvas. Browser evaluation, stats verification and audits are in progress.

## First audit fixes

The technical auditor reproduced a child-history navigation bug, and found the old SVG text exactly preserved on like-for-like offline inputs. The design auditor inspected desktop and phone captures, found the preview too tall and missed the keyboard hint on mobile. Return now closes the parent route directly, the initial focus moved off the exit button, the artwork uses dense voxel-face shading in 11 gutter rows, and the compact layout shows the hardware hint above the frame. Retesting now.
