# A playable continuation of tobifetch

**Keep the profile as a terminal transcript. Give the keyboard to the visitor one click later.** Someone scanning the profile should still learn who Tobias is, what he works on and what he has built. Someone who recognizes the game should be able to play without installing anything, signing in or learning a command first.

**Tobias chose Minecraft Classic first for recognition, with Space Cadet as the decompilation follow-up.** Mojang’s hosted Classic rendered a world inside a terminal-sized frame in the research test. It gives the existing island a natural visual continuation. Credit Mojang for the game and describe Tobias’s work as the ASCII art, terminal and integration. Space Cadet provides the actual decompilation story. [Mojang’s browser release](https://www.minecraft.net/en-us/article/embrace-past-minecraft-classic) · [Space Cadet decompilation](https://github.com/k4zmu2a/SpaceCadetPinball)

## What a visitor sees

1. The first prompt and `% tobifetch` are readable at first paint. A handful of dim triangular faces draws the eye from the gutter into the island. The edges part, each face shrinks and the existing ASCII island shows through. About and activity settle in quick succession. The effect plays once and leaves a readable transcript even if the visitor scrolls past it.
2. After the last existing metric, the repository prompt returns. Show `% ./games/minecraft-classic`, then a compact attract sequence. Use the existing row numbers and color cycle down the left. In roughly eight rows, draw an original isometric patch of grass, a tree and an exposed dirt face using the terminal palette. Leave the terrain still. Let a crosshair settle on the edge and one new block snap into place. Use the printable-ASCII invitation “Play Minecraft Classic >”. This is a launch invitation, not an input-shaped field on GitHub.
3. The image link opens the arcade at the game row. Match the prompt, gutter and terrain position well enough that the click feels like continuing the command. Go straight to the player, with working controls and a visible “Return to terminal” immediately adjacent. Preserve the upstream game’s own artwork in the playable area. Give it enough room to recognize the world and use the hotbar.
4. Returning focuses a real text input at the next prompt. A visitor can run `ls`, `cd games`, `ls`, and `./minecraft-classic`. The displayed command is also a working command. Let visitors discover another game later by adding one entry to the directory. Add Space Cadet as the next entry once the featured launch works. Its own compact motif can use a ball, a bumper and paired flippers.

This is a single linked image. Clicking the island or stats will also open the arcade. Give the anchor an accessible destination via meaningful image alt text and keep the play invitation visible in the still frame. If GitHub rewrites the image link on the actual profile, use an ordinary descriptive play link immediately below the image. The game should remain discoverable when a reader disables images.

## How the motion should feel

The portfolio’s ASCII mode grows a weighted triangular mesh, settles, then breaks the faces away in a directional wave. Its 720 ms cover and 760 ms clear work at full screen. Here, borrow the closing cracks and uneven timing. Try a 500–800 ms reveal around the existing ink, with the first prompt continuously visible. Use a few deterministic polygons confined to the first screen, a little glyph texture and short staggered transforms. Preserve negative space and let the island carry the color. A full-screen shader, random flicker, elaborate blur or a typewriter pass over every line would obscure the work visitors came to see.

At rest the current biography, island and metrics should look like the original. At reduced motion the complete transcript, one island frame and the finished terrain still should appear immediately. Avoid tying the footer’s legibility to its position on a single long animation timeline. For a visitor who scrolls slowly, the terrain and invitation must read just as clearly after the motion finishes.

## Suggested release order

| Slice | What to settle before moving on |
| --- | --- |
| Prove the playable destination | Start a cold Minecraft visit, move, look around, place a block and return to the prompt. Test a phone. Decide whether the upstream chrome and mobile controls are acceptable. |
| Join the two surfaces | Fit the README attract frame and the arcade launch row to the existing gutter. Test the link from GitHub-rendered markup and the path under a project Pages URL. |
| Choreograph the reveal | Compare a still, a mid-shard frame and the settled profile side by side with today’s profile. Compare compressed size and first useful paint. |
| Review and publish | Have independent auditors actually play and inspect the screenshots. Publish the arcade before activating its profile link. |

[Feasibility, alternatives and measurements](02-feasibility.md) · [Implementation contract](03-implementation-contract.md) · [Prompt for the implementation agent](04-master-prompt.md)
