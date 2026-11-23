# Implementation status

## Started

Implementing the approved Minecraft Classic feature and Space Cadet follow-up. The initial research established framed startup on desktop Chrome. Next verify actual game input, implement the static site and renderer, then run two independent audits. No publication requested. See [resume prompt](06-resume.md).

## Playable terminal implemented

Buildless arcade/ now contains the actual player, virtual directories, command form and browser-history routing. GitHub Pages lookup returned 404. Keep the launch private to this working tree until the destination is deployed. The offline reference checkout is in /private/tmp/profile-arcade-work/baseline on this Mac.

## Renderer and deployment staged

The renderer now generates v15, animated isometric terrain, shard overlays, reduced motion and a numbered launch link. The Pages workflow stages only the arcade source and subset font. Offline rendering succeeded. The first Minecraft input probe clicked a HUD overlay and timed out; the next probe targets the actual noa-canvas. Browser evaluation, stats verification and audits are in progress.

## First audit fixes

The technical auditor reproduced a child-history navigation bug, and found the old SVG text exactly preserved on like-for-like offline inputs. The design auditor inspected desktop and phone captures, found the preview too tall and missed the keyboard hint on mobile. Return now closes the parent route directly, the initial focus moved off the exit button, the artwork uses dense voxel-face shading in 11 gutter rows, and the compact layout shows the hardware hint above the frame. Retesting now.

## Game-input regression repeated

Rebuilt the stage at /private/tmp/profile-arcade-work/stage and reran input against it on port 48762. The stage on 48761 is the previous session's. /private/tmp/profile-arcade-work/regression.cjs passes 46/46 in Chrome, three times in a row. Game state is read from Mojang's exposed `window.noa`. Framed Minecraft acquired pointer lock and turned the camera on mouse movement. W walked the player. Left click removed a block. Right click then left click placed one, since 0.0.23a uses right click to switch between breaking and building. A real macOS Escape released the lock framed and direct; CDP key events never do, which is a harness limit. Pointer lock also needs the automation window frontmost.

The rerun found a regression from the audit fixes: Space Cadet received no keys. Its canvas cancels mousedown, so a click cannot focus the frame, and the focus call made before load never reached the game. The player now focuses the frame after load and returns focus to the game after a click on the page around it. Keys, launch and both flippers now reach the game. The terminal now reports a missing file, a directory or an unknown command by name. Help shows the run path for the current directory. The Minecraft caption explains how to build.

Playwright WebKit passes the same routing, walking, pinball key, Return and Back checks (/private/tmp/profile-arcade-work/engines.cjs). Pointer lock did not engage under automated WebKit, so real Safari remains unchecked. Playwright Firefox would not launch because of a macOS sandbox error. The offline render still works without node_modules, gives byte-identical repeats, and only its date row differs from the committed SVG. The changes to arcade/ are uncommitted. Physical phones, live statistics and publication remain unverified.
