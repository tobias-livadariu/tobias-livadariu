import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  flipFrameHorizontally,
  imageAtlasToAsciiFrames,
} from "./ascii-image-pipeline.mjs";
import { STATIC_ASCII_PROFILES } from "./ascii-image-profiles.mjs";
import { PROFILE_SVG_PATH } from "./profile-readme.config.mjs";
import {
  ASCII_FRAMES_CACHE_PATH,
  decodeFrames,
  encodeFrames,
  fingerprintFrameInputs,
} from "./ascii-frames-cache.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const USERNAME = process.env.PROFILE_USERNAME ?? "tobias-livadariu";
const OUTPUT_PATH = path.join(ROOT, ...PROFILE_SVG_PATH.split("/"));
const README_PATH = path.join(ROOT, "README.md");
const ISLAND_PNG_PATH = path.join(ROOT, "assets", "source", "islands-1.png");
const ISLAND_JSON_PATH = path.join(ROOT, "assets", "source", "islands-1.json");
const ASCII_FRAMES_PATH = path.join(ROOT, ...ASCII_FRAMES_CACHE_PATH.split("/"));
// Rebuilding samples the spritesheet in a real browser; every other run
// replays the committed cache and needs no extra dependencies.
const REBUILD_FRAMES =
  process.argv.includes("--rebuild-frames") ||
  process.env.PROFILE_REBUILD_FRAMES === "1";
// The vendored .ascii face still carries every one of Iosevka's 2809 glyph
// outlines; only its cmap was trimmed. Embedding it spent 64 KB of the ~211 KB
// a visitor downloads on glyphs that can never be drawn. This subset keeps the
// same 95 printable ASCII codepoints and the same advance widths, at 5 KB.
// Rebuild it with `npm run build:font`. See scripts/README.md.
const IOSEVKA_REGULAR_PATH = path.join(
  ROOT,
  "assets",
  "generated",
  "iosevka-term-regular.ascii.subset.woff2",
);

const PALETTE = {
  bg: "#0d1117",
  fg: "#c5c9c5",
  fgBright: "#dcd7ba",
  fgDim: "#a6a69c",
  comment: "#727169",
  separator: "#5e6173",
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

const FONT_SIZE = 15;
const CHAR_WIDTH = 8.1;
const LINE_HEIGHT = 21;
const GUTTER_WIDTH = 64;
const HORIZONTAL_PADDING = 0;
const FIRST_BASELINE_Y = FONT_SIZE;
const BOTTOM_PADDING = 4;
const ABOUT_TITLE_GAP = 3;
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
const ABOUT_TITLE_ROWS = combineBlocks(ABOUT_TITLE_BLOCKS, ABOUT_TITLE_GAP);
const TITLE_COLS = Math.max(...ABOUT_TITLE_ROWS.map((line) => line.length));
const ISLAND_COLS = TITLE_COLS - 10;
const ISLAND_ROWS = Math.round((ISLAND_COLS * CHAR_WIDTH) / LINE_HEIGHT);
// The single README planet matches the mirrored, left-hand About-modal planet.
const ISLAND_FLIP_X = true;

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
  commitRepos: [
    { name: "portfolio-website", count: 31 },
  ],
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

function textElement({ x, y, segments, size = FONT_SIZE }) {
  const safeSegments =
    typeof segments === "string" ? [{ text: segments, color: PALETTE.fg }] : segments;

  return `<text class="mono" x="${x}" y="${y}" font-size="${size}">${safeSegments
    .map(tspan)
    .join("")}</text>`;
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

async function buildIslandFrames(columns, rows, imageBuffer, atlasText) {
  const atlas = JSON.parse(atlasText);
  const frameKeys = atlas.animations?.["islands-1"] ?? Object.keys(atlas.frames);
  const sources = frameKeys
    .map((key) => atlas.frames[key])
    .filter(Boolean)
    .map((frame) => frame.frame);

  return imageAtlasToAsciiFrames({
    imageBuffer,
    sources,
    columns,
    rows,
    profile: STATIC_ASCII_PROFILES.modalHeaderPlanet,
  });
}

async function readFrameCache() {
  try {
    return JSON.parse(await fs.readFile(ASCII_FRAMES_PATH, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function loadIslandFrames(columns, rows) {
  const profile = STATIC_ASCII_PROFILES.modalHeaderPlanet;
  const [imageBuffer, atlasText] = await Promise.all([
    fs.readFile(ISLAND_PNG_PATH),
    fs.readFile(ISLAND_JSON_PATH, "utf8"),
  ]);
  const fingerprint = fingerprintFrameInputs({
    imageBuffer,
    atlasText,
    profile,
    columns,
    rows,
    flipX: ISLAND_FLIP_X,
  });

  let frames;

  if (REBUILD_FRAMES) {
    frames = await buildIslandFrames(columns, rows, imageBuffer, atlasText);
    await fs.mkdir(path.dirname(ASCII_FRAMES_PATH), { recursive: true });
    await fs.writeFile(
      ASCII_FRAMES_PATH,
      `${JSON.stringify({ profileId: profile.id, columns, rows, fingerprint, ...encodeFrames(frames) })}\n`,
      "utf8",
    );
    console.log(`Rebuilt ${ASCII_FRAMES_CACHE_PATH} (${frames.length} frames)`);
  } else {
    const cache = await readFrameCache();

    if (!cache) {
      throw new Error(
        `Missing ${ASCII_FRAMES_CACHE_PATH}. Run \`npm run build:frames\` to build it.`,
      );
    }

    if (cache.fingerprint !== fingerprint) {
      throw new Error(
        `${ASCII_FRAMES_CACHE_PATH} was built from different source art, tuning ` +
          `profile, or grid size. Run \`npm run build:frames\` to refresh it.`,
      );
    }

    frames = decodeFrames(cache);
  }

  return frames.map((frame) => {
    const displayFrame = ISLAND_FLIP_X ? flipFrameHorizontally(frame) : frame;
    return displayFrame.map(rowToRuns);
  });
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

  const visibleLanguageRows = 7;
  const top =
    sorted.length > visibleLanguageRows
      ? sorted.slice(0, visibleLanguageRows - 1)
      : sorted.slice(0, visibleLanguageRows);
  const otherBytes =
    sorted.length > visibleLanguageRows
      ? sorted.slice(visibleLanguageRows - 1).reduce((sum, item) => sum + item.bytes, 0)
      : 0;

  if (otherBytes > 0) {
    top.push({ name: "Other", bytes: otherBytes, color: LANGUAGE_COLORS.Other });
  }

  return top.length > 0 ? top : FALLBACK_STATS.languages;
}

async function fetchMonthlyCommitStats() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const events = [];

  for (let page = 1; page <= 3; page += 1) {
    const batch = await githubJson(
      `https://api.github.com/users/${USERNAME}/events/public?per_page=100&page=${page}`,
    );
    events.push(
      ...batch.filter(
        (event) => event.type === "PushEvent" && new Date(event.created_at) >= monthStart,
      ),
    );

    if (
      batch.length < 100 ||
      batch.some((event) => new Date(event.created_at) < monthStart)
    ) {
      break;
    }
  }

  const latestHeadsByRef = new Map();
  for (const event of events) {
    const repoName = event.repo?.name;
    const head = event.payload?.head;
    const ref = event.payload?.ref;
    if (!repoName || !head || !ref) {
      continue;
    }

    const refKey = `${repoName}:${ref}`;
    if (!latestHeadsByRef.has(refKey)) {
      latestHeadsByRef.set(refKey, { repoName, ref, head });
    }
  }

  const commitsByRepo = new Map();
  for (const { repoName, ref, head } of latestHeadsByRef.values()) {
    const repoCommits = commitsByRepo.get(repoName) ?? new Set();
    const refName = ref.startsWith("refs/heads/") ? ref.slice("refs/heads/".length) : head;
    const targets = refName === head ? [head] : [refName, head];

    for (const target of targets) {
      const targetCommits = new Set();
      let targetResolved = true;

      for (let page = 1; page <= 10; page += 1) {
        let commits;
        try {
          const params = new URLSearchParams({
            sha: target,
            since: monthStart.toISOString(),
            until: now.toISOString(),
            author: USERNAME,
            per_page: "100",
            page: String(page),
          });
          commits = await githubJson(
            `https://api.github.com/repos/${repoName}/commits?${params}`,
          );
        } catch {
          targetResolved = false;
          break;
        }

        for (const commit of commits) {
          targetCommits.add(commit.sha);
        }

        if (commits.length < 100) {
          break;
        }
      }

      if (targetResolved) {
        for (const sha of targetCommits) {
          repoCommits.add(sha);
        }
        break;
      }
    }

    commitsByRepo.set(repoName, repoCommits);
  }

  const sorted = [...commitsByRepo.entries()]
    .map(([nameWithOwner, commits]) => ({
      name: nameWithOwner.replace(`${USERNAME}/`, ""),
      count: commits.size,
    }))
    .filter((repo) => repo.count > 0)
    .sort((a, b) => b.count - a.count);
  const visibleCommitRows = 7;
  const top =
    sorted.length > visibleCommitRows
      ? sorted.slice(0, visibleCommitRows - 1)
      : sorted.slice(0, visibleCommitRows);
  const otherCount =
    sorted.length > visibleCommitRows
      ? sorted.slice(visibleCommitRows - 1).reduce((sum, repo) => sum + repo.count, 0)
      : 0;

  if (otherCount > 0) {
    top.push({ name: "Other", count: otherCount });
  }

  return top;
}

async function fetchProfileStats() {
  if (process.env.PROFILE_README_OFFLINE === "1") {
    return FALLBACK_STATS;
  }

  try {
    const repos = await fetchRepos();
    const [languages, commitRepos] = await Promise.all([
      fetchLanguageStats(repos),
      fetchMonthlyCommitStats().catch((error) => {
        console.warn(`Using fallback commit stats: ${error.message}`);
        return FALLBACK_STATS.commitRepos;
      }),
    ]);

    return {
      languages,
      commitRepos,
    };
  } catch (error) {
    console.warn(`Using fallback profile stats: ${error.message}`);
    return FALLBACK_STATS;
  }
}

function allocateDistributionCells(items, total, cells, colorForItem, valueForItem) {
  if (items.length === 0 || total <= 0 || cells <= 0) {
    return [];
  }

  const raw = items
    .map((item, index) => ({
      ...item,
      index,
      color: colorForItem(item, index),
      exactCells: (valueForItem(item) / Math.max(1, total)) * cells,
    }))
    .map((item) => ({
      ...item,
      cells: Math.max(0, Math.floor(item.exactCells)),
    }));
  let used = raw.reduce((sum, item) => sum + item.cells, 0);
  const remainderOrder = [...raw].sort(
    (a, b) => b.exactCells - b.cells - (a.exactCells - a.cells) || a.index - b.index,
  );
  let remainderIndex = 0;

  while (used < cells && remainderOrder.length > 0) {
    remainderOrder[remainderIndex % remainderOrder.length].cells += 1;
    used += 1;
    remainderIndex += 1;
  }

  return raw.filter((item) => item.cells > 0);
}

function makeDistributionBar(
  items,
  total,
  cells = 76,
  colorForItem = (item) => item.color,
  valueForItem = (item) => item.bytes,
  character = "#",
) {
  const distribution = allocateDistributionCells(
    items,
    total,
    cells,
    colorForItem,
    valueForItem,
  ).map(
    (item) => ({
      text: character.repeat(item.cells),
      color: item.color,
    }),
  );

  return distribution.length > 0
    ? distribution
    : [{ text: "-".repeat(cells), color: PALETTE.comment }];
}

function makeDistributionText(text, items, total, colorForItem, valueForItem) {
  let offset = 0;

  return allocateDistributionCells(
    items,
    total,
    text.length,
    colorForItem,
    valueForItem,
  ).map((item) => {
    const segment = {
      text: text.slice(offset, offset + item.cells),
      color: item.color,
    };
    offset += item.cells;
    return segment;
  });
}

function makeValueBarSegments(value, max, color, width = 26, character = "#") {
  const filled = value > 0 && max > 0 ? Math.max(1, Math.round((value / max) * width)) : 0;

  return [
    { text: "[", color: PALETTE.comment },
    { text: character.repeat(filled), color },
    { text: "-".repeat(Math.max(0, width - filled)), color: PALETTE.comment },
    { text: "]", color: PALETTE.comment },
  ].filter((segment) => segment.text.length > 0);
}

function pct(value, total) {
  return `${((value / Math.max(1, total)) * 100).toFixed(1)}%`;
}

const GUTTER_COLOR_CYCLE = [
  PALETTE.yellow,
  PALETTE.orange,
  PALETTE.pink,
  PALETTE.lavender,
  PALETTE.cyan,
  PALETTE.mint,
];

function gutterColor(lineNumber) {
  return GUTTER_COLOR_CYCLE[(lineNumber - 1) % GUTTER_COLOR_CYCLE.length];
}

function gutterSegments(lineNumber) {
  const color = gutterColor(lineNumber);

  return [
    { text: "#", color },
    { text: String(lineNumber).padStart(3, " "), color },
    { text: "|", color },
  ];
}

// Matches dotfiles starship.toml + git-status.zsh — letters lowercase, no
// internal spaces, single leading space after the branch, per-letter colors
// from starship.toml.
const GIT_STATE_COLORS = {
  "!": PALETTE.pink,
  d: PALETTE.pink,
  r: PALETTE.cyan,
  m: PALETTE.orange,
  D: PALETTE.mint,
  s: PALETTE.mint,
  u: PALETTE.lavender,
};

function promptSegments(directory, branch, states = []) {
  const stateSegments = states.length
    ? [
        { text: " ", color: PALETTE.fg },
        ...states.map((state) => ({
          text: state,
          color: GIT_STATE_COLORS[state] ?? PALETTE.pink,
        })),
      ]
    : [];

  return [
    { text: "@", color: PALETTE.mint },
    { text: directory, color: PALETTE.cyan },
    { text: " ", color: PALETTE.fg },
    { text: "|", color: PALETTE.separator },
    { text: " ", color: PALETTE.fg },
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

function infoBlockRows() {
  const aboutRows = ABOUT_TITLE_ROWS.map((line) => [
    { text: line, color: PALETTE.cyan },
  ]);
  const infoRows = [
    [],
    [{ text: "tobias@uwaterloo", color: PALETTE.mint }],
    [{ text: "----------------", color: PALETTE.comment }],
    [
      { text: "Name:     ", color: PALETTE.yellow },
      { text: "Tobias Livadariu", color: PALETTE.fgBright },
    ],
    [
      { text: "School:   ", color: PALETTE.yellow },
      { text: "University of Waterloo", color: PALETTE.fgBright },
    ],
    [
      { text: "Program:  ", color: PALETTE.yellow },
      { text: "Software Engineering", color: PALETTE.fgBright },
    ],
    [
      { text: "Frontend: ", color: PALETTE.yellow },
      {
        text: "React, Redux, Tailwind, GraphQL, TypeScript, JavaScript, HTML, CSS, SCSS",
        color: PALETTE.fgBright,
      },
    ],
    [
      { text: "Backend:  ", color: PALETTE.yellow },
      {
        text: "Node, .NET, Rails, Flask, Laravel, FastAPI, Python, Ruby, C#, PHP",
        color: PALETTE.fgBright,
      },
    ],
    [
      { text: "Data+AI:  ", color: PALETTE.yellow },
      {
        text: "MySQL, PostgreSQL, MongoDB, BigQuery, Azure, GCP, Docker, Flink, LangChain",
        color: PALETTE.fgBright,
      },
    ],
    [
      { text: "Open to:  ", color: PALETTE.yellow },
      { text: "Internships, Feedback, Project Conversations", color: PALETTE.fgBright },
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
              color: run.color === "transparent" ? "none" : run.color,
            })),
            size: FONT_SIZE,
          }),
        )
        .join("\n");

      return `<g class="island-frame island-frame-${frameIndex}">\n${rows}\n</g>`;
    })
    .join("\n");
}

function pushLine(elements, lineNumber, y, contentSegments, x) {
  elements.push(
    textElement({
      x,
      y,
      segments: gutterSegments(lineNumber),
      size: FONT_SIZE,
    }),
  );
  if (contentSegments && contentSegments.length > 0) {
    elements.push(
      textElement({
        x: x + GUTTER_WIDTH,
        y,
        segments: contentSegments,
        size: FONT_SIZE,
      }),
    );
  }
}

const DISTRIBUTION_BAR_TOTAL_WIDTH = TITLE_COLS;
const DISTRIBUTION_BAR_CELLS = DISTRIBUTION_BAR_TOTAL_WIDTH - 2;
const METRIC_BAR_WIDTH = 28;
const METRIC_BAR_TOTAL_WIDTH = METRIC_BAR_WIDTH + 2;

function percentageSegments(percentage, percentageWidth, color) {
  const digits = percentage.slice(0, -1);
  const leadingPadding = " ".repeat(Math.max(0, percentageWidth - percentage.length));

  return [
    { text: `${leadingPadding}${digits}`, color },
    { text: "%", color: PALETTE.comment },
  ];
}

function languageMetricValueSegments(
  percentage,
  percentageWidth,
  commitCountWidth,
  color,
) {
  return [
    { text: " ", color },
    ...percentageSegments(percentage, percentageWidth, color),
    { text: " ".repeat(3 + commitCountWidth), color },
  ];
}

function monthlyCommitMetricValueSegments(
  count,
  percentage,
  percentageWidth,
  commitCountWidth,
  color,
) {
  return [
    { text: " ", color },
    ...percentageSegments(percentage, percentageWidth, color),
    { text: " | ", color: PALETTE.comment },
    { text: String(count).padStart(commitCountWidth, " "), color },
  ];
}

function headingPadding(width, side) {
  if (width <= 0) {
    return "";
  }

  const remaining = width - 1;
  const trailing = remaining % 2 === 1 ? "<" : "";
  const leftPadding = `>${"<>".repeat(Math.floor(remaining / 2))}${trailing}`;

  if (side === "left") {
    return leftPadding;
  }

  return [...leftPadding]
    .reverse()
    .map((character) => (character === "<" ? ">" : "<"))
    .join("");
}

function metricHeadingSegments({
  marker,
  label,
  items,
  total,
  lineNumber,
  valueForItem,
}) {
  const labelSegments =
    total > 0 && items.length > 0
      ? makeDistributionText(
          label,
          items,
          total,
          (_item, index) => gutterColor(lineNumber + 2 + index),
          valueForItem,
        )
      : [{ text: label, color: gutterColor(lineNumber + 2) }];
  const heading = [
    { text: marker, color: PALETTE.comment },
    ...labelSegments,
    { text: marker, color: PALETTE.comment },
  ];
  const headingWidth = segmentsCharLength(heading);
  const availablePadding = Math.max(0, DISTRIBUTION_BAR_TOTAL_WIDTH - headingWidth);
  const leftPadding = Math.floor(availablePadding / 2);
  const rightPadding = availablePadding - leftPadding;

  return [
    { text: headingPadding(leftPadding, "left"), color: PALETTE.comment },
    ...heading,
    { text: headingPadding(rightPadding, "right"), color: PALETTE.comment },
  ];
}

function makeAlternatingSeparator(width) {
  function getCurrChar(index) {
    if (index === 0 || index === baseWidth - 1) {
      return "=";
    }
    if (index === 1 || index === baseWidth - 2) {
      return "-";
    }
    if (index === 2 || index === baseWidth - 3) {
      return "#";
    }
    if (index === 3 || index === baseWidth - 4) {
      return "-";
    }
    if (index === 4 || index === baseWidth - 5) {
      return "=";
    }
    return index % 2 === 0 ? "-" : "|";
  }

  const baseWidth = width % 2 === 0 ? width - 1 : width;
  const characters = Array.from({ length: baseWidth }, (_value, index) =>
    getCurrChar(index),
  );

  if (baseWidth !== width) {
    const center = Math.floor(characters.length / 2);
    const plusIndex = characters[center] === "|" ? center : Math.max(1, center - 1);
    characters.splice(plusIndex, 0, "|");
  }

  return characters.join("");
}

function metricLines(stats) {
  const lines = [];
  const languages = stats.languages.slice(0, 7);
  const totalLanguageBytes = languages.reduce((sum, item) => sum + item.bytes, 0);
  const commitRepos = stats.commitRepos.slice(0, 7);
  const totalCommits = commitRepos.reduce((sum, repo) => sum + repo.count, 0);
  const maxRepoCommits = Math.max(...commitRepos.map((repo) => repo.count), 1);
  const languagePercentages = languages.map((language) =>
    pct(language.bytes, totalLanguageBytes),
  );
  const commitPercentages = commitRepos.map((repo) => pct(repo.count, totalCommits));
  const percentageWidth = Math.max(
    "0.0%".length,
    ...languagePercentages.map((percentage) => percentage.length),
    ...commitPercentages.map((percentage) => percentage.length),
  );
  const commitCountWidth = Math.max(
    1,
    ...commitRepos.map((repo) => String(repo.count).length),
  );
  const metricValueWidth = 1 + percentageWidth + 3 + commitCountWidth;
  const metricLabelWidth =
    DISTRIBUTION_BAR_TOTAL_WIDTH - METRIC_BAR_TOTAL_WIDTH - metricValueWidth - 1;
  const updated = new Date().toISOString().slice(0, 10);

  lines.push(promptSegments("repos/tobias-livadariu", "main", ["m", "u"]));
  lines.push(commandSegments("profile-metrics --ascii --public"));
  lines.push((lineNumber) =>
    metricHeadingSegments({
      marker: "#",
      label: "LANGUAGES",
      items: languages,
      total: totalLanguageBytes,
      lineNumber,
      valueForItem: (language) => language.bytes,
    }),
  );
  lines.push((lineNumber) => [
    { text: "[", color: PALETTE.comment },
    ...makeDistributionBar(
      languages,
      totalLanguageBytes,
      DISTRIBUTION_BAR_CELLS,
      (_language, index) => gutterColor(lineNumber + 1 + index),
      (language) => language.bytes,
      "#",
    ),
    { text: "]", color: PALETTE.comment },
  ]);

  for (const [index, language] of languages.entries()) {
    lines.push((lineNumber) => {
      const lineColor = gutterColor(lineNumber);
      const percentage = languagePercentages[index];

      return [
        { text: `${padRight(language.name, metricLabelWidth)} `, color: lineColor },
        ...makeValueBarSegments(
          language.bytes,
          totalLanguageBytes,
          lineColor,
          METRIC_BAR_WIDTH,
        ),
        ...languageMetricValueSegments(
          percentage,
          percentageWidth,
          commitCountWidth,
          lineColor,
        ),
      ];
    });
  }

  lines.push([
    { text: makeAlternatingSeparator(DISTRIBUTION_BAR_TOTAL_WIDTH), color: PALETTE.comment },
  ]);
  lines.push((lineNumber) =>
    metricHeadingSegments({
      marker: "@",
      label: "MONTHLY-COMMITS",
      items: commitRepos,
      total: totalCommits,
      lineNumber,
      valueForItem: (repo) => repo.count,
    }),
  );
  lines.push((lineNumber) => [
    { text: "[", color: PALETTE.comment },
    ...makeDistributionBar(
      commitRepos,
      totalCommits,
      DISTRIBUTION_BAR_CELLS,
      (_repo, index) => gutterColor(lineNumber + 1 + index),
      (repo) => repo.count,
      "@",
    ),
    { text: "]", color: PALETTE.comment },
  ]);

  for (const [index, repo] of commitRepos.entries()) {
    lines.push((lineNumber) => {
      const lineColor = gutterColor(lineNumber);
      const percentage = commitPercentages[index];

      return [
        { text: `${padRight(repo.name, metricLabelWidth)} `, color: lineColor },
        ...makeValueBarSegments(
          repo.count,
          maxRepoCommits,
          lineColor,
          METRIC_BAR_WIDTH,
          "@",
        ),
        ...monthlyCommitMetricValueSegments(
          repo.count,
          percentage,
          percentageWidth,
          commitCountWidth,
          lineColor,
        ),
      ];
    });
  }

  lines.push([]);
  lines.push([
    { text: "updated: ", color: PALETTE.comment },
    { text: updated, color: PALETTE.fgDim },
  ]);

  return lines;
}

function resolveLine(line, lineNumber) {
  return typeof line === "function" ? line(lineNumber) : line;
}

function segmentsCharLength(segments) {
  return segments.reduce((sum, segment) => sum + segment.text.length, 0);
}

function renderProfileStream(elements, frames, stats) {
  const bodyX = HORIZONTAL_PADDING;
  const contentX = bodyX + GUTTER_WIDTH;
  const artX = contentX;

  let lineNumber = 1;
  let y = FIRST_BASELINE_Y;
  let maxInfoChars = 0;
  let maxMetricsChars = 0;

  pushLine(elements, lineNumber, y, promptSegments("repos/tobias-livadariu", "main", ["m", "u"]), bodyX);
  lineNumber += 1;
  y += LINE_HEIGHT;

  pushLine(elements, lineNumber, y, commandSegments("tobifetch"), bodyX);
  lineNumber += 1;
  y += LINE_HEIGHT;

  const fetchFirstY = y;
  const info = infoBlockRows();
  const islandGroups = renderAnimatedIslandFrames(frames, artX, fetchFirstY, LINE_HEIGHT);
  elements.push(islandGroups);

  for (let row = 0; row < ISLAND_ROWS; row += 1) {
    const lineY = fetchFirstY + row * LINE_HEIGHT;
    elements.push(
      textElement({
        x: bodyX,
        y: lineY,
        segments: gutterSegments(lineNumber),
        size: FONT_SIZE,
      }),
    );
    lineNumber += 1;
  }
  y = fetchFirstY + ISLAND_ROWS * LINE_HEIGHT;

  for (const infoRow of info) {
    if (infoRow.length > 0) {
      maxInfoChars = Math.max(maxInfoChars, segmentsCharLength(infoRow));
    }
    pushLine(elements, lineNumber, y, infoRow, bodyX);
    lineNumber += 1;
    y += LINE_HEIGHT;
  }

  pushLine(elements, lineNumber, y, [], bodyX);
  lineNumber += 1;
  y += LINE_HEIGHT;

  for (const item of metricLines(stats)) {
    const segments = resolveLine(item, lineNumber);
    maxMetricsChars = Math.max(maxMetricsChars, segmentsCharLength(segments));
    pushLine(elements, lineNumber, y, segments, bodyX);
    lineNumber += 1;
    y += LINE_HEIGHT;
  }

  const islandSectionWidth = GUTTER_WIDTH + ISLAND_COLS * CHAR_WIDTH;
  const aboutSectionWidth = GUTTER_WIDTH + maxInfoChars * CHAR_WIDTH;
  const metricsSectionWidth = GUTTER_WIDTH + maxMetricsChars * CHAR_WIDTH;
  const contentWidth = Math.max(islandSectionWidth, aboutSectionWidth, metricsSectionWidth);

  return { endY: y, contentWidth };
}

async function buildSvg() {
  const [fontData, frames, stats] = await Promise.all([
    fs.readFile(IOSEVKA_REGULAR_PATH),
    loadIslandFrames(ISLAND_COLS, ISLAND_ROWS),
    fetchProfileStats(),
  ]);
  const fontBase64 = fontData.toString("base64");
  const elements = [];

  const { endY, contentWidth } = renderProfileStream(elements, frames, stats);

  const svgWidth = Math.ceil(HORIZONTAL_PADDING + contentWidth + HORIZONTAL_PADDING);
  const height = Math.ceil(endY - LINE_HEIGHT + FONT_SIZE + BOTTOM_PADDING);
  const css = `
@font-face {
  font-family: "Iosevka Term Web";
  src: url(data:font/woff2;base64,${fontBase64}) format("woff2");
  font-weight: 400;
  font-style: normal;
}
.mono {
  font-family: "Iosevka Term Web", "Iosevka Term", ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-variant-ligatures: none;
  font-feature-settings: "calt" 0, "liga" 0, "dlig" 0, "zero" 1;
  dominant-baseline: alphabetic;
  white-space: pre;
}
svg {
  text-rendering: geometricPrecision;
  shape-rendering: crispEdges;
}
${frameCss(frames.length)}
`;

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc" viewBox="0 0 ${svgWidth} ${height}" width="${svgWidth}" height="${height}">
<title id="title">Tobias Livadariu terminal profile</title>
<desc id="desc">ASCII terminal profile with animated island art, tobifetch details, language distribution, and current-month public commit distribution.</desc>
<style>${css}</style>
<rect width="100%" height="100%" fill="${PALETTE.bg}" />
${elements.join("\n")}
</svg>
`;
}

async function main() {
  const svg = await buildSvg();
  await fs.writeFile(OUTPUT_PATH, svg, "utf8");
  await syncReadmeImagePath();
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}`);
}

async function syncReadmeImagePath() {
  const readme = await fs.readFile(README_PATH, "utf8");
  const imageSrc = PROFILE_SVG_PATH.startsWith("./") ? PROFILE_SVG_PATH : `./${PROFILE_SVG_PATH}`;
  const imageMarkup = `<img src="${imageSrc}" width="100%" alt="ASCII terminal profile for Tobias Livadariu" />`;
  const nextReadme = readme.replace(
    /<img src="[^"]*profile-terminal\.v\d+\.svg" width="100%" alt="ASCII terminal profile for Tobias Livadariu" \/>/,
    imageMarkup,
  );

  if (nextReadme === readme && !readme.includes(imageMarkup)) {
    throw new Error("Could not find the profile SVG image reference in README.md");
  }

  if (nextReadme !== readme) {
    await fs.writeFile(README_PATH, nextReadme, "utf8");
  }
}

await main();
