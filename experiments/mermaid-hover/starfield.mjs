// Experimental: a hover starfield drawn by GitHub's Mermaid renderer, placed
// under the profile SVG. Writes starfield.mmd (local preview) and PREVIEW.md
// (GitHub's real rendering). Run: node experiments/mermaid-hover/starfield.mjs
//
// Every cell holds one character. Mermaid's block diagrams give every column
// the width of the widest cell, so anything longer would stretch the grid.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { palette, gutterColors } from "../../arcade/profile.mjs";
import { PROFILE_SVG_PATH, PROFILE_STILL_PATH } from "../../scripts/profile-readme.config.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "../..");
const WIDTH = 93; // the SVG's 753-unit width at its 8.1-unit advance
const GUTTER = 8; // "# 83|" plus the gap before content, as in the SVG
const SKY_ROWS = 6;

// Continue the SVG's gutter numbering from its final row.
const svg = await fs.readFile(path.join(ROOT, PROFILE_SVG_PATH), "utf8");
const lastLine = Number([...svg.matchAll(/>\s*(\d+)<\/tspan><tspan[^>]*>\|</g)].at(-1)[1]);

// Seeded so the field is stable between renders.
let seed = 20261123;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const trail = [palette.yellow, palette.orange, palette.pink, palette.lavender, palette.cyan, palette.mint];

// Each row is a list of [char, ...classes].
const rows = [];
let line = lastLine;
function row(segments) {
  line++;
  const cells = [];
  const g = "#" + String(line).padStart(3) + "|";
  for (const ch of g.padEnd(GUTTER)) cells.push([ch, `gc${(line - 1) % 6}`]);
  for (const [text, cls] of segments) for (const ch of text) cells.push([ch, cls]);
  while (cells.length < WIDTH) cells.push([" ", "blank"]);
  rows.push(cells.slice(0, WIDTH));
}
row([["@", "mint"], ["repos/tobias-livadariu", "cyan"], [" | ", "dim"], ["main", "yellow"]]);
row([["% ", "dim"], ["./starfield", "fg"], ["        # move the cursor through the sky", "comment"]]);
for (let r = 0; r < SKY_ROWS; r++) {
  const sky = [];
  for (let c = GUTTER; c < WIDTH; c++) {
    const roll = rand();
    const glyph = roll < 0.06 ? "+" : roll < 0.16 ? "." : "*";
    sky.push([glyph, `${roll < 0.16 ? "faint" : "sky"} t${Math.floor(rand() * trail.length)}`]);
  }
  line++;
  const cells = [];
  const g = "#" + String(line).padStart(3) + "|";
  for (const ch of g.padEnd(GUTTER)) cells.push([ch, `gc${(line - 1) % 6}`]);
  rows.push(cells.concat(sky.map(([ch, cls]) => [ch, ...cls.split(" ")])));
}

const lines = ["block-beta", `  columns ${WIDTH}`];
const classes = new Map();
rows.forEach((cells, r) => {
  lines.push("  " + cells.map(([ch, ...cls], c) => {
    const id = `r${r}c${c}`;
    for (const name of cls) { if (!classes.has(name)) classes.set(name, []); classes.get(name).push(id); }
    return `${id}["${ch === " " ? "&nbsp;" : ch}"]`;
  }).join(" "));
});
// A bg-coloured stroke overlaps neighbours so no seams show between cells.
for (const name of classes.keys()) lines.push(`  classDef ${name} fill:${palette.bg},stroke:${palette.bg},stroke-width:2px`);
for (const [name, ids] of classes) lines.push(`  class ${ids.join(",")} ${name}`);

const colors = { mint: palette.mint, cyan: palette.cyan, dim: palette.fgDim, yellow: palette.yellow, fg: palette.fgBright, comment: palette.comment };
const css = [
  // No embedded font: Mermaid drops any themeCSS containing "url(data:", and
  // GitHub's frame only allows fonts from its own host.
  `.node rect{fill:${palette.bg} !important;stroke:${palette.bg} !important}`,
  `.nodeLabel,.label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace !important;font-size:15px !important;line-height:21px !important}`,
  ...gutterColors.map((c, i) => `.gc${i} .nodeLabel{color:${c} !important}`),
  ...Object.entries(colors).map(([k, c]) => `.${k} .nodeLabel{color:${c} !important}`),
  `.sky .nodeLabel{color:${palette.bg} !important;transition:color 1.8s ease-out,text-shadow 1.8s ease-out}`,
  `.faint .nodeLabel{color:#3a4150 !important;transition:color 1.8s ease-out,text-shadow 1.8s ease-out}`,
  ...trail.map((c, i) => `.t${i}:hover .nodeLabel{color:${c} !important;text-shadow:0 0 6px ${c};transition:none}`),
].join(" ");

const init = { theme: "base", themeVariables: { background: palette.bg }, block: { padding: 0 }, themeCSS: css };
const source = `%%{init: ${JSON.stringify(init)}}%%\n${lines.join("\n")}\n`;
await fs.writeFile(path.join(HERE, "starfield.mmd"), source);

const rel = p => path.relative(HERE, path.join(ROOT, p));
const readmeLine = (await fs.readFile(path.join(ROOT, "README.md"), "utf8")).split("\n")[0]
  .replaceAll("./" + PROFILE_SVG_PATH, rel(PROFILE_SVG_PATH)).replaceAll("./" + PROFILE_STILL_PATH, rel(PROFILE_STILL_PATH));
await fs.writeFile(path.join(HERE, "PREVIEW.md"), `${readmeLine}\n\n\`\`\`mermaid\n${source}\`\`\`\n`);
console.log(`starfield: lines ${lastLine + 1}-${line}, ${rows.length}x${WIDTH} cells, ${source.length} chars`);
