import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const USERNAME = process.env.PROFILE_USERNAME ?? "tobias-livadariu";
const OUTPUT_PATH = path.join(ROOT, "assets", "profile-terminal.svg");
const ISLAND_PNG_PATH = path.join(ROOT, "assets", "source", "islands-1.png");
const ISLAND_JSON_PATH = path.join(ROOT, "assets", "source", "islands-1.json");
const IOSEVKA_REGULAR_PATH = path.join(
  ROOT,
  "assets",
  "fonts",
  "iosevka-term",
  "WOFF2",
  "IosevkaTerm-Regular.woff2",
);

const PALETTE = {
  bg: "#181616",
  bgDim: "#121111",
  bgAlt: "#1f1d1d",
  bgHighlight: "#2a2626",
  black: "#0d0c0c",
  fg: "#c5c9c5",
  fgBright: "#dcd7ba",
  fgDim: "#a6a69c",
  comment: "#727169",
  border: "#2a2626",
  borderBright: "#393433",
  pink: "#fb7da7",
  mint: "#76c5a4",
  yellow: "#e3cf65",
  orange: "#fdad5d",
  lavender: "#af98e6",
  cyan: "#51c7da",
};

const LANGUAGE_COLORS = {
  TypeScript: "#51c7da",
  JavaScript: "#e3cf65",
  "C#": "#af98e6",
  "C++": "#fdad5d",
  C: "#a6a69c",
  Python: "#76c5a4",
  Ruby: "#fb7da7",
  CSS: "#7fb4ca",
  SCSS: "#fb7da7",
  HTML: "#fdad5d",
  PHP: "#a292a3",
  Vue: "#76c5a4",
  Shell: "#c5c9c5",
  Dockerfile: "#51c7da",
  Other: "#727169",
};

const SVG_WIDTH = 1280;
const MARGIN = 28;
const FONT_SIZE = 15;
const SMALL_FONT_SIZE = 13;
const BANNER_FONT_SIZE = 8.5;
const CHAR_WIDTH = 8.1;
const LINE_HEIGHT = 21;
const SMALL_LINE_HEIGHT = 16;
const GUTTER_WIDTH = 76;
const ASCII_RAMP = " .:-=+*#%@";
const ACTIVITY_RAMP = " .:-=+*#%@";

const NAME_BANNER_BLOCKS = [
  [
    "88888888888 .d88888b.  888888b.  8888888        d8888  .d8888b.         ",
    "    888    d88P\" \"Y88b 888  \"88b   888         d88888 d88P  Y88b        ",
    "    888    888     888 888  .88P   888        d88P888 Y88b.             ",
    "    888    888     888 8888888K.   888       d88P 888  \"Y888b.          ",
    "    888    888     888 888  \"Y88b  888      d88P  888     \"Y88b.        ",
    "    888    888     888 888    888  888     d88P   888       \"888 888888 ",
    "    888    Y88b. .d88P 888   d88P  888    d8888888888 Y88b  d88P        ",
    "    888     \"Y88888P\"  8888888P\" 8888888 d88P     888  \"Y8888P\"         ",
  ],
  [
    "888      8888888 888     888     d8888 8888888b.        d8888 8888888b. ",
    "888        888   888     888    d88888 888  \"Y88b      d88888 888   Y88b",
    "888        888   888     888   d88P888 888    888     d88P888 888    888",
    "888        888   Y88b   d88P  d88P 888 888    888    d88P 888 888   d88P",
    "888        888    Y88b d88P  d88P  888 888    888   d88P  888 8888888P\" ",
    "888        888     Y88o88P  d88P   888 888    888  d88P   888 888 T88b  ",
    "888        888      Y888P  d8888888888 888  .d88P d8888888888 888  T88b ",
    "88888888 8888888     Y8P  d88P     888 8888888P\" d88P     888 888   T88b",
  ],
  [
    "8888888 888     888                        888                          ",
    "  888   888     888                        888                          ",
    "  888   888     888                        888                          ",
    "  888   888     888     88888b.d88b.   .d88888                          ",
    "  888   888     888     888 \"888 \"88b d88\" 888                          ",
    "  888   888     888     888  888  888 888  888                          ",
    "  888   Y88b. .d88P d8b 888  888  888 Y88b 888                          ",
    "8888888  \"Y88888P\"  Y8P 888  888  888  \"Y88888                          ",
  ],
];

const ABOUT_TITLE_BLOCKS = [
  [
    "      .o.        .o8                                 .  ",
    "     .888.      \"888                               .o8  ",
    "    .8\"888.      888oooo.   .ooooo.  oooo  oooo  .o888oo",
    "   .8' `888.     d88' `88b d88' `88b `888  `888    888  ",
    "  .88ooo8888.    888   888 888   888  888   888    888  ",
    " .8'     `888.   888   888 888   888  888   888    888 .",
    "o88o     o8888o  `Y8bod8P' `Y8bod8P'  `V88V\"V8P'   \"888\"",
  ],
  [
    "ooo        ooooo          ",
    "`88.       .888'          ",
    " 888b     d'888   .ooooo. ",
    " 8 Y88. .P  888  d88' `88b",
    " 8  `888'   888  888ooo888",
    " 8    Y     888  888    .o",
    "o8o        o888o `Y8bod8P'",
  ],
];

const FALLBACK_STATS = {
  languages: [
    { name: "TypeScript", color: LANGUAGE_COLORS.TypeScript, bytes: 31 },
    { name: "JavaScript", color: LANGUAGE_COLORS.JavaScript, bytes: 18 },
    { name: "C#", color: LANGUAGE_COLORS["C#"], bytes: 13 },
    { name: "Python", color: LANGUAGE_COLORS.Python, bytes: 12 },
    { name: "Ruby", color: LANGUAGE_COLORS.Ruby, bytes: 9 },
    { name: "CSS", color: LANGUAGE_COLORS.CSS, bytes: 8 },
    { name: "Other", color: LANGUAGE_COLORS.Other, bytes: 9 },
  ],
  activityDays: Array.from({ length: 31 }, (_, index) =>
    Math.max(0, Math.round(2 + Math.sin(index * 0.88) * 2 + (index % 6 === 0 ? 3 : 0))),
  ),
  recentRepos: [
    { name: "portfolio-website", count: 19 },
    { name: "tobias-livadariu", count: 11 },
    { name: "dotfiles", count: 10 },
    { name: "langsketch", count: 8 },
    { name: "codespeak", count: 6 },
    { name: "lights-on", count: 4 },
  ],
  source: "local fallback",
};

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function padRight(value, width) {
  const text = String(value);
  return text.length >= width ? text.slice(0, width) : text + " ".repeat(width - text.length);
}

function combineBlocks(blocks, gap = 3) {
  const height = Math.max(...blocks.map((block) => block.length));
  const widths = blocks.map((block) => Math.max(...block.map((line) => line.length)));

  return Array.from({ length: height }, (_, row) =>
    blocks
      .map((block, index) => padRight(block[row] ?? "", widths[index]))
      .join(" ".repeat(gap)),
  );
}

function tspan(segment) {
  const attrs = [
    `fill="${segment.color ?? PALETTE.fg}"`,
    segment.weight ? `font-weight="${segment.weight}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<tspan ${attrs}>${escapeXml(segment.text)}</tspan>`;
}

function textElement({ x, y, segments, size = FONT_SIZE, opacity = 1, extra = "" }) {
  const safeSegments =
    typeof segments === "string" ? [{ text: segments, color: PALETTE.fg }] : segments;

  return `<text class="mono" x="${x}" y="${y}" font-size="${size}" opacity="${opacity}" ${extra}>${safeSegments
    .map(tspan)
    .join("")}</text>`;
}

function rect({ x, y, width, height, fill, stroke = "none", radius = 0, opacity = 1 }) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" opacity="${opacity}"/>`;
}

function getBrightness(red, green, blue) {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function colorToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  if (upDistance <= upLeftDistance) {
    return up;
  }

  return upLeft;
}

async function decodePng(filePath) {
  const buffer = await fs.readFile(filePath);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error(`${filePath} is not a PNG`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error("Only non-interlaced 8-bit RGBA PNGs are supported");
  }

  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let inputOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const row = Buffer.alloc(stride);

    for (let index = 0; index < stride; index += 1) {
      const raw = inflated[inputOffset];
      inputOffset += 1;
      const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
      const up = previous[index] ?? 0;
      const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;

      if (filter === 0) {
        row[index] = raw;
      } else if (filter === 1) {
        row[index] = (raw + left) & 0xff;
      } else if (filter === 2) {
        row[index] = (raw + up) & 0xff;
      } else if (filter === 3) {
        row[index] = (raw + Math.floor((left + up) / 2)) & 0xff;
      } else if (filter === 4) {
        row[index] = (raw + paethPredictor(left, up, upLeft)) & 0xff;
      } else {
        throw new Error(`Unsupported PNG filter ${filter}`);
      }
    }

    row.copy(pixels, rowIndex * stride);
    previous = row;
  }

  return { width, height, pixels };
}

function pixelAt(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [
    image.pixels[offset],
    image.pixels[offset + 1],
    image.pixels[offset + 2],
    image.pixels[offset + 3],
  ];
}

function frameToAscii(image, source, columns, rows) {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const flippedColumn = columns - 1 - column;
      const sourceX = Math.min(
        image.width - 1,
        source.x + Math.floor(((flippedColumn + 0.5) * source.w) / columns),
      );
      const sourceY = Math.min(
        image.height - 1,
        source.y + Math.floor(((row + 0.5) * source.h) / rows),
      );
      const [red, green, blue, alpha] = pixelAt(image, sourceX, sourceY);

      if (alpha / 255 < 0.08) {
        return { char: " ", color: "transparent" };
      }

      const rampIndex = Math.min(
        ASCII_RAMP.length - 1,
        Math.floor((getBrightness(red, green, blue) / 255) * ASCII_RAMP.length),
      );

      return {
        char: ASCII_RAMP[rampIndex],
        color: colorToHex(red, green, blue),
      };
    }),
  );
}

function rowToRuns(row) {
  const runs = [];

  for (const cell of row) {
    const last = runs.at(-1);
    if (last && last.color === cell.color) {
      last.text += cell.char;
    } else {
      runs.push({ color: cell.color, text: cell.char });
    }
  }

  return runs;
}

async function loadIslandFrames(columns, rows) {
  const [image, atlasText] = await Promise.all([
    decodePng(ISLAND_PNG_PATH),
    fs.readFile(ISLAND_JSON_PATH, "utf8"),
  ]);
  const atlas = JSON.parse(atlasText);
  const frameKeys = atlas.animations?.["islands-1"] ?? Object.keys(atlas.frames);

  return frameKeys
    .map((key) => atlas.frames[key])
    .filter(Boolean)
    .map((frame) => frameToAscii(image, frame.frame, columns, rows).map(rowToRuns));
}

function authHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "tobias-livadariu-profile-readme",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function githubJson(url) {
  const response = await fetch(url, { headers: authHeaders() });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }

  return response.json();
}

async function fetchRepos() {
  const repos = [];

  for (let page = 1; page <= 3; page += 1) {
    const batch = await githubJson(
      `https://api.github.com/users/${USERNAME}/repos?per_page=100&type=owner&sort=updated&page=${page}`,
    );
    repos.push(...batch);
    if (batch.length < 100) {
      break;
    }
  }

  return repos.filter((repo) => !repo.fork && !repo.archived && repo.name !== USERNAME);
}

async function fetchLanguageStats(repos) {
  const totals = new Map();

  for (const repo of repos) {
    try {
      const languages = await githubJson(repo.languages_url);
      for (const [name, bytes] of Object.entries(languages)) {
        totals.set(name, (totals.get(name) ?? 0) + Number(bytes));
      }
    } catch {
      if (repo.language) {
        totals.set(repo.language, (totals.get(repo.language) ?? 0) + Math.max(1, repo.size ?? 1));
      }
    }
  }

  const sorted = [...totals.entries()]
    .map(([name, bytes]) => ({
      name,
      bytes,
      color: LANGUAGE_COLORS[name] ?? LANGUAGE_COLORS.Other,
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const top = sorted.slice(0, 7);
  const otherBytes = sorted.slice(7).reduce((sum, item) => sum + item.bytes, 0);

  if (otherBytes > 0) {
    top.push({ name: "Other", bytes: otherBytes, color: LANGUAGE_COLORS.Other });
  }

  return top.length > 0 ? top : FALLBACK_STATS.languages;
}

function eventWeight(event) {
  if (event.type === "PushEvent") {
    return Math.max(1, event.payload?.commits?.length ?? 1);
  }

  if (event.type === "PullRequestEvent") {
    return 2;
  }

  if (event.type === "IssuesEvent" || event.type === "ReleaseEvent") {
    return 1;
  }

  return 1;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

async function fetchActivityStats() {
  const events = [];

  for (let page = 1; page <= 3; page += 1) {
    const batch = await githubJson(
      `https://api.github.com/users/${USERNAME}/events/public?per_page=100&page=${page}`,
    );
    events.push(...batch);
    if (batch.length < 100) {
      break;
    }
  }

  const today = new Date();
  const dates = Array.from({ length: 31 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (30 - index));
    return isoDate(date);
  });
  const countsByDate = new Map(dates.map((date) => [date, 0]));
  const countsByRepo = new Map();

  for (const event of events) {
    const date = event.created_at?.slice(0, 10);
    const weight = eventWeight(event);

    if (countsByDate.has(date)) {
      countsByDate.set(date, countsByDate.get(date) + weight);
    }

    if (event.repo?.name) {
      const name = event.repo.name.replace(`${USERNAME}/`, "");
      countsByRepo.set(name, (countsByRepo.get(name) ?? 0) + weight);
    }
  }

  const recentRepos = [...countsByRepo.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    activityDays: dates.map((date) => countsByDate.get(date) ?? 0),
    recentRepos: recentRepos.length > 0 ? recentRepos : FALLBACK_STATS.recentRepos,
  };
}

async function fetchProfileStats() {
  if (process.env.PROFILE_README_OFFLINE === "1") {
    return FALLBACK_STATS;
  }

  try {
    const repos = await fetchRepos();
    const [languages, activity] = await Promise.all([
      fetchLanguageStats(repos),
      fetchActivityStats(),
    ]);

    return {
      languages,
      activityDays: activity.activityDays,
      recentRepos: activity.recentRepos,
      source: process.env.GITHUB_TOKEN ? "GitHub REST + token" : "GitHub REST",
    };
  } catch (error) {
    console.warn(`Using fallback profile stats: ${error.message}`);
    return FALLBACK_STATS;
  }
}

function makeDistributionBar(items, total, cells = 76) {
  const raw = items.map((item) => ({
    ...item,
    cells: Math.max(0, Math.floor((item.bytes / total) * cells)),
  }));
  let used = raw.reduce((sum, item) => sum + item.cells, 0);
  let index = 0;

  while (used < cells && raw.length > 0) {
    raw[index % raw.length].cells += 1;
    used += 1;
    index += 1;
  }

  return raw
    .filter((item) => item.cells > 0)
    .map((item) => ({
      text: "#".repeat(item.cells),
      color: item.color,
    }));
}

function makeValueBar(value, max, width = 26) {
  const filled = max > 0 ? Math.max(1, Math.round((value / max) * width)) : 0;
  return `${"#".repeat(filled)}${"-".repeat(Math.max(0, width - filled))}`;
}

function pct(value, total) {
  return `${((value / Math.max(1, total)) * 100).toFixed(1).padStart(5, " ")}%`;
}

function activitySegments(days) {
  const max = Math.max(...days, 1);
  return days.map((count) => {
    const index = count === 0 ? 0 : Math.max(1, Math.round((count / max) * (ACTIVITY_RAMP.length - 1)));
    const color =
      count === 0
        ? PALETTE.comment
        : count >= max * 0.72
          ? PALETTE.mint
          : count >= max * 0.45
            ? PALETTE.cyan
            : PALETTE.yellow;

    return { text: ACTIVITY_RAMP[index], color };
  });
}

function gutterSegments(lineNumber) {
  const colors = [
    PALETTE.yellow,
    PALETTE.orange,
    PALETTE.pink,
    PALETTE.lavender,
    PALETTE.cyan,
    PALETTE.mint,
  ];
  const color = colors[(lineNumber - 1) % colors.length];

  return [
    { text: "#", color: color },
    { text: String(lineNumber).padStart(3, " "), color },
    { text: "|", color },
  ];
}

function promptSegments(directory, branch, states = []) {
  const stateSegments = states.flatMap((state) => {
    const color =
      state === "M"
        ? PALETTE.orange
        : state === "U"
          ? PALETTE.lavender
          : state === "S"
            ? PALETTE.mint
            : PALETTE.pink;
    return [
      { text: " ", color: PALETTE.fg },
      { text: state, color },
    ];
  });

  return [
    { text: "@", color: PALETTE.mint },
    { text: directory, color: PALETTE.cyan },
    { text: " | ", color: PALETTE.comment },
    { text: branch, color: PALETTE.yellow },
    ...stateSegments,
  ];
}

function commandSegments(command) {
  return [
    { text: "% ", color: PALETTE.comment },
    { text: command, color: PALETTE.fgBright },
  ];
}

function renderTerminalLine(elements, lineNumber, y, contentSegments, x) {
  elements.push(
    textElement({
      x,
      y,
      segments: gutterSegments(lineNumber),
      size: FONT_SIZE,
    }),
  );
  elements.push(
    textElement({
      x: x + GUTTER_WIDTH,
      y,
      segments: contentSegments,
      size: FONT_SIZE,
    }),
  );
}

function rightInfoRows() {
  const aboutRows = combineBlocks(ABOUT_TITLE_BLOCKS, 2).map((line) => [
    { text: line, color: PALETTE.cyan },
  ]);
  const infoRows = [
    [],
    [{ text: "tobias@uwaterloo", color: PALETTE.mint }],
    [{ text: "----------------", color: PALETTE.comment }],
    [],
    [
      { text: "Name:      ", color: PALETTE.yellow },
      { text: "Tobias Livadariu", color: PALETTE.fgBright },
    ],
    [
      { text: "School:    ", color: PALETTE.yellow },
      { text: "University of Waterloo", color: PALETTE.fgBright },
    ],
    [
      { text: "Program:   ", color: PALETTE.yellow },
      { text: "Software Engineering", color: PALETTE.fgBright },
    ],
    [
      { text: "Focus:     ", color: PALETTE.yellow },
      { text: "full-stack systems + LLM tooling", color: PALETTE.fgBright },
    ],
    [
      { text: "Frontend:  ", color: PALETTE.yellow },
      { text: "React, TypeScript, Redux, Vite", color: PALETTE.fgBright },
    ],
    [
      { text: "Backend:   ", color: PALETTE.yellow },
      { text: "Node, .NET, Rails, Flask", color: PALETTE.fgBright },
    ],
    [
      { text: "Data:      ", color: PALETTE.yellow },
      { text: "SQL, Azure, Docker, MongoDB", color: PALETTE.fgBright },
    ],
    [
      { text: "Projects:  ", color: PALETTE.yellow },
      { text: "portfolio-v3, LangSketch, CodeSpeak", color: PALETTE.fgBright },
    ],
    [
      { text: "Open to:   ", color: PALETTE.yellow },
      { text: "internships, feedback, sharp tools", color: PALETTE.fgBright },
    ],
  ];

  return [...aboutRows, ...infoRows];
}

function frameCss(frameCount) {
  const duration = frameCount * 140;
  const rules = [
    `.island-frame{opacity:0;animation-duration:${duration}ms;animation-iteration-count:infinite;animation-timing-function:steps(1,end);}`,
  ];

  for (let index = 0; index < frameCount; index += 1) {
    const start = (index / frameCount) * 100;
    const end = ((index + 1) / frameCount) * 100;
    const before = Math.max(0, start - 0.001);
    const after = Math.min(100, end + 0.001);

    rules.push(`.island-frame-${index}{animation-name:island-${index};}`);
    if (index === 0) {
      rules.push(
        `@keyframes island-${index}{0%,${end.toFixed(3)}%{opacity:1}${after.toFixed(3)}%,100%{opacity:0}}`,
      );
    } else {
      rules.push(
        `@keyframes island-${index}{0%,${before.toFixed(3)}%{opacity:0}${start.toFixed(3)}%,${end.toFixed(3)}%{opacity:1}${after.toFixed(3)}%,100%{opacity:0}}`,
      );
    }
  }

  return rules.join("\n");
}

function renderAnimatedIslandFrames(frames, x, firstRowY, lineHeight) {
  return frames
    .map((frame, frameIndex) => {
      const rows = frame
        .map((runs, rowIndex) =>
          textElement({
            x,
            y: firstRowY + rowIndex * lineHeight,
            segments: runs.map((run) => ({
              text: run.text,
              color: run.color === "transparent" ? PALETTE.bgDim : run.color,
            })),
            size: FONT_SIZE,
          }),
        )
        .join("\n");

      return `<g class="island-frame island-frame-${frameIndex}">\n${rows}\n</g>`;
    })
    .join("\n");
}

function renderHeader(elements, y) {
  const bannerRows = combineBlocks(NAME_BANNER_BLOCKS, 3);
  const x = MARGIN;
  const lineHeight = 12;

  elements.push(
    rect({
      x: MARGIN - 1,
      y: y - 20,
      width: SVG_WIDTH - MARGIN * 2 + 2,
      height: bannerRows.length * lineHeight + 28,
      fill: PALETTE.bg,
      stroke: PALETTE.border,
    }),
  );

  bannerRows.forEach((row, index) => {
    elements.push(
      textElement({
        x,
        y: y + index * lineHeight,
        size: BANNER_FONT_SIZE,
        segments: [{ text: row, color: PALETTE.cyan }],
      }),
    );
  });

  return y + bannerRows.length * lineHeight + 38;
}

function renderTobifetchTerminal(elements, frames, y) {
  const x = MARGIN;
  const width = SVG_WIDTH - MARGIN * 2;
  const bodyX = x + 18;
  const contentX = bodyX + GUTTER_WIDTH;
  const toolbarHeight = 34;
  const commandTop = y + toolbarHeight + 30;
  const artColumns = 42;
  const artRows = 22;
  const artX = contentX;
  const rightX = artX + artColumns * CHAR_WIDTH + 40;
  const infoRows = rightInfoRows();
  const fetchRows = Math.max(artRows, infoRows.length);
  const lineCount = 2 + fetchRows;
  const height = toolbarHeight + 24 + lineCount * LINE_HEIGHT + 28;

  elements.push(
    rect({
      x,
      y,
      width,
      height,
      fill: PALETTE.bgDim,
      stroke: PALETTE.borderBright,
    }),
  );
  elements.push(rect({ x, y, width, height: toolbarHeight, fill: PALETTE.bgAlt }));
  elements.push(
    textElement({
      x: x + 14,
      y: y + 22,
      size: SMALL_FONT_SIZE,
      segments: [{ text: "File: about.profile", color: PALETTE.fgDim }],
    }),
  );
  elements.push(
    textElement({
      x: x + width - 310,
      y: y + 22,
      size: SMALL_FONT_SIZE,
      segments: [
        { text: "github://", color: PALETTE.comment },
        { text: USERNAME, color: PALETTE.yellow },
      ],
    }),
  );

  renderTerminalLine(
    elements,
    1,
    commandTop,
    promptSegments("repos/all-about-me", "main", ["M", "U"]),
    bodyX,
  );
  renderTerminalLine(elements, 2, commandTop + LINE_HEIGHT, commandSegments("tobifetch"), bodyX);

  const firstOutputY = commandTop + LINE_HEIGHT * 2;
  const islandGroups = renderAnimatedIslandFrames(frames, artX, firstOutputY, LINE_HEIGHT);
  elements.push(islandGroups);

  for (let row = 0; row < fetchRows; row += 1) {
    const lineNumber = row + 3;
    const lineY = firstOutputY + row * LINE_HEIGHT;
    elements.push(textElement({ x: bodyX, y: lineY, segments: gutterSegments(lineNumber), size: FONT_SIZE }));

    const info = infoRows[row];
    if (info) {
      elements.push(textElement({ x: rightX, y: lineY, segments: info, size: FONT_SIZE }));
    }
  }

  return y + height + 26;
}

function metricLines(stats) {
  const lines = [];
  const totalLanguageBytes = stats.languages.reduce((sum, item) => sum + item.bytes, 0);
  const distribution = makeDistributionBar(stats.languages, totalLanguageBytes);
  const maxRepo = Math.max(...stats.recentRepos.map((repo) => repo.count), 1);
  const totalRecentActivity = stats.activityDays.reduce((sum, count) => sum + count, 0);
  const updated = new Date().toISOString().slice(0, 10);

  lines.push(promptSegments("repos/profile-readme", "main", ["S"]));
  lines.push(commandSegments("profile-metrics --ascii --public"));
  lines.push([]);
  lines.push([{ text: "language mix", color: PALETTE.mint }]);
  lines.push([
    { text: "[", color: PALETTE.comment },
    ...distribution,
    { text: "]", color: PALETTE.comment },
  ]);

  for (const language of stats.languages.slice(0, 7)) {
    lines.push([
      { text: `${padRight(language.name, 12)} `, color: language.color },
      { text: makeValueBar(language.bytes, totalLanguageBytes, 24), color: language.color },
      { text: ` ${pct(language.bytes, totalLanguageBytes)}`, color: PALETTE.fgDim },
    ]);
  }

  lines.push([]);
  lines.push([
    { text: "activity/day ", color: PALETTE.mint },
    { text: "(last 31 public events) ", color: PALETTE.comment },
    { text: String(totalRecentActivity), color: PALETTE.yellow },
  ]);
  lines.push([
    { text: "[", color: PALETTE.comment },
    ...activitySegments(stats.activityDays),
    { text: "]", color: PALETTE.comment },
  ]);

  lines.push([]);
  lines.push([{ text: "recent repo pulse", color: PALETTE.mint }]);
  for (const repo of stats.recentRepos.slice(0, 6)) {
    const color = repo.name.includes("portfolio")
      ? PALETTE.cyan
      : repo.name.includes("dotfiles")
        ? PALETTE.lavender
        : repo.name.includes("tobias")
          ? PALETTE.yellow
          : PALETTE.orange;
    lines.push([
      { text: `${padRight(repo.name, 28)} `, color },
      { text: makeValueBar(repo.count, maxRepo, 28), color },
      { text: ` ${String(repo.count).padStart(3, " ")}`, color: PALETTE.fgDim },
    ]);
  }

  lines.push([]);
  lines.push([
    { text: "updated: ", color: PALETTE.comment },
    { text: updated, color: PALETTE.fgDim },
    { text: " | source: ", color: PALETTE.comment },
    { text: stats.source, color: PALETTE.fgDim },
  ]);

  return lines;
}

function renderMetricsTerminal(elements, stats, y) {
  const x = MARGIN;
  const width = SVG_WIDTH - MARGIN * 2;
  const bodyX = x + 18;
  const toolbarHeight = 34;
  const lines = metricLines(stats);
  const height = toolbarHeight + 24 + lines.length * LINE_HEIGHT + 28;
  const firstLineY = y + toolbarHeight + 30;

  elements.push(
    rect({
      x,
      y,
      width,
      height,
      fill: PALETTE.bgDim,
      stroke: PALETTE.borderBright,
    }),
  );
  elements.push(rect({ x, y, width, height: toolbarHeight, fill: PALETTE.bgAlt }));
  elements.push(
    textElement({
      x: x + 14,
      y: y + 22,
      size: SMALL_FONT_SIZE,
      segments: [{ text: "File: metrics.profile", color: PALETTE.fgDim }],
    }),
  );
  elements.push(
    textElement({
      x: x + width - 472,
      y: y + 22,
      size: SMALL_FONT_SIZE,
      segments: [
        { text: "widgets: ", color: PALETTE.comment },
        { text: "language-bar | activity-chart | repo-pulse", color: PALETTE.yellow },
      ],
    }),
  );

  lines.forEach((segments, index) => {
    renderTerminalLine(elements, index + 1, firstLineY + index * LINE_HEIGHT, segments, bodyX);
  });

  return y + height + 28;
}

function renderLinkRow(elements, y) {
  const x = MARGIN;
  const width = SVG_WIDTH - MARGIN * 2;
  const links = [
    { label: "portfolio", value: "tobias-livadariu.online/portfolio", color: PALETTE.cyan },
    { label: "email", value: "tlivadar@uwaterloo.ca", color: PALETTE.mint },
    { label: "linkedin", value: "linkedin.com/in/tobias-livadariu", color: PALETTE.lavender },
  ];
  let cursorX = x + 18;

  elements.push(rect({ x, y: y - 17, width, height: 42, fill: PALETTE.bg, stroke: PALETTE.border }));
  for (const [index, link] of links.entries()) {
    const text = `${link.label}: ${link.value}`;
    elements.push(
      textElement({
        x: cursorX,
        y: y + 9,
        size: SMALL_FONT_SIZE,
        segments: [
          { text: `${link.label}: `, color: link.color },
          { text: link.value, color: PALETTE.fgDim },
        ],
      }),
    );
    cursorX += text.length * 7.4 + 44;
    if (index < links.length - 1) {
      elements.push(
        textElement({
          x: cursorX - 26,
          y: y + 9,
          size: SMALL_FONT_SIZE,
          segments: [{ text: "|", color: PALETTE.comment }],
        }),
      );
    }
  }

  return y + 38;
}

async function buildSvg() {
  const [fontData, frames, stats] = await Promise.all([
    fs.readFile(IOSEVKA_REGULAR_PATH),
    loadIslandFrames(42, 22),
    fetchProfileStats(),
  ]);
  const fontBase64 = fontData.toString("base64");
  const elements = [];
  let y = 44;

  y = renderHeader(elements, y);
  y = renderTobifetchTerminal(elements, frames, y);
  y = renderMetricsTerminal(elements, stats, y);
  y = renderLinkRow(elements, y + 4);

  const height = Math.ceil(y + 12);
  const css = `
@font-face {
  font-family: "Iosevka Term Web";
  src: url(data:font/woff2;base64,${fontBase64}) format("woff2");
  font-weight: 400;
  font-style: normal;
}
.mono {
  font-family: "Iosevka Term Web", "Iosevka Term", monospace;
  font-variant-ligatures: none;
  font-feature-settings: "calt" 0, "liga" 0, "dlig" 0, "zero" 1;
  dominant-baseline: alphabetic;
  white-space: pre;
}
svg {
  background: ${PALETTE.bg};
  text-rendering: geometricPrecision;
  shape-rendering: crispEdges;
}
${frameCss(frames.length)}
`;

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 ${SVG_WIDTH} ${height}" width="${SVG_WIDTH}" height="${height}">
<title id="title">Tobias Livadariu terminal profile</title>
<desc id="desc">ASCII terminal profile with animated island art, tobifetch details, language mix, activity chart, and recent repository pulse.</desc>
<style>${css}</style>
${rect({ x: 0, y: 0, width: SVG_WIDTH, height, fill: PALETTE.bg })}
${elements.join("\n")}
</svg>
`;
}

async function main() {
  const svg = await buildSvg();
  await fs.writeFile(OUTPUT_PATH, svg, "utf8");
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
}

await main();
