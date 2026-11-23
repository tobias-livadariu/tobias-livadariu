// Local preview of the profile as GitHub shows it, plus the playable terminal.
//
//   npm run preview            then open http://127.0.0.1:4173/
//
// The page embeds README.md's own image markup, so the <picture>, reduced
// motion source and link are exactly what GitHub renders. Only the link target
// changes, from the Pages URL to the local arcade/ files served at the same
// project subpath. Node standard library only, like the daily render.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ARCADE_URL } from "./profile-readme.config.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PORT = Number(process.env.PORT) || 4173;
const SUBPATH = new URL(ARCADE_URL).pathname; // "/tobias-livadariu/"
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".mjs": "text/javascript",
  ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2",
  ".png": "image/png", ".json": "application/json",
};

// Mirrors scripts/build-arcade.mjs: arcade/ plus the subset font as iosevka.woff2.
function arcadeFile(rest) {
  if (rest === "") return path.join(ROOT, "arcade/index.html");
  if (rest === "iosevka.woff2") return path.join(ROOT, "assets/generated/iosevka-term-regular.ascii.subset.woff2");
  return path.join(ROOT, "arcade", rest);
}

function within(file, dir) {
  const rel = path.relative(path.join(ROOT, dir), file);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

async function branchName() {
  try {
    const head = (await fs.readFile(path.join(ROOT, ".git/HEAD"), "utf8")).trim();
    return head.startsWith("ref: refs/heads/") ? head.slice(16) : null;
  } catch { return null; }
}

async function page() {
  const readme = await fs.readFile(path.join(ROOT, "README.md"), "utf8");
  const markup = readme.split("\n").find(line => line.includes("profile-terminal.v"));
  if (!markup) throw new Error("README.md has no profile image line");
  const local = markup.replaceAll(ARCADE_URL, SUBPATH).replaceAll('"./assets/', '"/assets/');
  const still = (local.match(/srcset="([^"]+)"/) || [])[1];
  const branch = await branchName();
  const onGithub = branch
    ? `<a href="https://github.com/tobias-livadariu/tobias-livadariu/blob/${branch.split("/").map(encodeURIComponent).join("/")}/README.md">this branch on GitHub</a> (pushed version)`
    : "";
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Profile preview</title><link rel="icon" href="data:,">
<style>
:root{--page:#ffffff;--box:#ffffff;--line:#d1d9e0;--text:#1f2328;--muted:#59636e}
:root[data-theme=dark]{--page:#0d1117;--box:#0d1117;--line:#3d444d;--text:#f0f6fc;--muted:#9198a1}
body{margin:0;background:var(--page);color:var(--text);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
header{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line)}
header a{color:inherit}
button{font:inherit;padding:3px 10px;border:1px solid var(--line);border-radius:6px;background:var(--box);color:var(--text);cursor:pointer}
button[aria-pressed=true]{border-color:#0969da;box-shadow:inset 0 0 0 1px #0969da}
.group{display:flex;gap:4px;align-items:center}.group span{color:var(--muted);margin-right:2px}
main{margin:24px auto;padding:0 16px;width:var(--w,896px);max-width:100%;box-sizing:border-box}
.readme{border:1px solid var(--line);border-radius:6px;padding:24px;background:var(--box)}
.readme img{max-width:100%;box-sizing:content-box}
.note{color:var(--muted);font-size:12px;margin-top:12px}
</style>
<header>
  <strong>Profile preview</strong>
  <div class="group"><span>Page</span><button data-theme="light" aria-pressed="true">Light</button><button data-theme="dark">Dark</button></div>
  <div class="group"><span>Width</span><button data-w="896px" aria-pressed="true">Desktop</button><button data-w="600px">Narrow</button><button data-w="390px">Phone</button></div>
  <div class="group"><span>Motion</span><button id="still" aria-pressed="false">Reduced (still)</button><button id="replay">Replay</button></div>
</header>
<main><div class="readme" id="readme">${local}</div>
<p class="note">Image markup comes from README.md; only its link points here instead of GitHub Pages. Widths approximate GitHub's profile column. ${onGithub}</p></main>
<script>
const readme=document.getElementById("readme"),original=readme.innerHTML;
const press=(sel,btn)=>document.querySelectorAll(sel).forEach(b=>b.setAttribute("aria-pressed",b===btn));
document.querySelectorAll("[data-theme]").forEach(b=>b.onclick=()=>{document.documentElement.dataset.theme=b.dataset.theme;press("[data-theme]",b)});
document.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{document.querySelector("main").style.setProperty("--w",b.dataset.w);press("[data-w]",b)});
const still=document.getElementById("still");let isStill=false;
// The <picture> follows the OS setting; "Reduced" forces the still source instead.
// A fresh query string gives a new image document, which restarts the animation.
function render(){const t="?t="+Date.now();let html=original.replace(/(src(?:set)?="[^"]+\\.svg)"/g,"$1"+t+'"');
  if(isStill)html=html.replace(/<source[^>]*>/,"").replace(/src="[^"]*profile-terminal[^"]*"/,'src="${still || ""}"');
  readme.innerHTML=html}
still.onclick=()=>{isStill=!isStill;still.setAttribute("aria-pressed",isStill);render()};
document.getElementById("replay").onclick=render;
</script>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  try {
    let file;
    if (pathname === "/") {
      res.writeHead(200, { "content-type": TYPES[".html"], "cache-control": "no-store" });
      return res.end(await page());
    } else if (pathname.startsWith("/assets/")) {
      file = path.join(ROOT, pathname);
      if (!within(file, "assets")) throw Object.assign(new Error(), { code: "ENOENT" });
    } else if (pathname === SUBPATH.slice(0, -1)) {
      res.writeHead(301, { location: SUBPATH + url.search });
      return res.end();
    } else if (pathname.startsWith(SUBPATH)) {
      file = arcadeFile(pathname.slice(SUBPATH.length));
      if (!within(file, "arcade") && !file.endsWith(".subset.woff2")) throw Object.assign(new Error(), { code: "ENOENT" });
    } else {
      throw Object.assign(new Error(), { code: "ENOENT" });
    }
    const body = await fs.readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    res.end(body);
  } catch (error) {
    const missing = error.code === "ENOENT" || error.code === "EISDIR";
    res.writeHead(missing ? 404 : 500, { "content-type": "text/plain" });
    res.end(missing ? "Not found" : String(error));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Profile preview:   http://127.0.0.1:${PORT}/`);
  console.log(`Playable terminal: http://127.0.0.1:${PORT}${SUBPATH}`);
  console.log("Re-run `PROFILE_README_OFFLINE=1 npm run render` after renderer changes, then reload.");
});
