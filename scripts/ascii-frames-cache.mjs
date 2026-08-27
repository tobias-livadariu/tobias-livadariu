/**
 * Storage format for the pre-built island ASCII frames.
 *
 * Turning the source spritesheet into ASCII needs a browser to rasterize and
 * sample pixels, which is the only reason this repository would depend on
 * playwright. The frames are fully determined by the source atlas plus the
 * tuning profile, so they are built once, committed, and replayed by every
 * later render. That keeps the daily refresh a dependency-free Node script.
 *
 * Rebuild with `npm run build:frames` after changing the source art, the
 * atlas, or STATIC_ASCII_PROFILES. See scripts/README.md.
 */
import crypto from "node:crypto";

export const ASCII_FRAMES_CACHE_PATH = "assets/generated/island-ascii-frames.json";

/**
 * Identifies the inputs a cache was built from. A render compares this against
 * the inputs it sees so a stale cache fails loudly instead of quietly drawing
 * the previous artwork.
 */
export function fingerprintFrameInputs({
  imageBuffer,
  atlasText,
  profile,
  columns,
  rows,
  flipX,
}) {
  return crypto
    .createHash("sha256")
    .update(imageBuffer)
    .update(atlasText)
    .update(JSON.stringify(profile))
    .update(`${columns}x${rows}:${flipX ? "flip" : "noflip"}`)
    .digest("hex");
}

/**
 * Packs frames into a palette plus per-row run lengths. Neighbouring cells
 * usually share a colour, so runs keep the committed file far smaller than one
 * entry per cell would.
 */
export function encodeFrames(frames) {
  const palette = [];
  const paletteIndex = new Map();

  const indexOf = (color) => {
    let index = paletteIndex.get(color);

    if (index === undefined) {
      index = palette.length;
      palette.push(color);
      paletteIndex.set(color, index);
    }

    return index;
  };

  const encoded = frames.map((frame) =>
    frame.map((row) => {
      let text = "";
      const runs = [];

      for (const cell of row) {
        text += cell.char;
        const index = indexOf(cell.color);
        const last = runs.at(-1);

        if (last && last[0] === index) {
          last[1] += 1;
        } else {
          runs.push([index, 1]);
        }
      }

      return { text, runs };
    }),
  );

  return { palette, frames: encoded };
}

/** Expands {@link encodeFrames} output back into cells of `{ char, color }`. */
export function decodeFrames({ palette, frames }) {
  return frames.map((frame) =>
    frame.map((row) => {
      const cells = [];
      let column = 0;

      for (const [index, length] of row.runs) {
        const color = palette[index];

        for (let step = 0; step < length; step += 1) {
          cells.push({ char: row.text[column] ?? " ", color });
          column += 1;
        }
      }

      return cells;
    }),
  );
}
