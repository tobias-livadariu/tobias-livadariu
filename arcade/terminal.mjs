import { featured, games, gutterColors } from "./profile.mjs";

const byId = id => document.getElementById(id);
const historyLog = byId("transcript");
const input = byId("command");
const form = input.form;
const shell = byId("shell");
const player = byId("player");
const repo = "repos/tobias-livadariu";
let cwd = "/";
let line = Number(new URLSearchParams(location.search).get("line"));
if (!Number.isInteger(line) || line < 1 || line > 999) line = 1;
let active;
// Space Cadet draws a fixed desktop canvas. Scale its whole browsing context
// so the launch lane and score stay in view on a narrow terminal.
const screen = byId("screen");
new ResizeObserver(([entry]) => {
  screen.style.setProperty("--scale", entry.contentRect.width / 620);
}).observe(screen);

function span(text, className) {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
}
function gutter(n) { return "#" + String(n).padStart(3) + "|"; }
function color(n) { return gutterColors[(n - 1) % gutterColors.length]; }
function print(...content) {
  const row = document.createElement("div");
  row.className = "row";
  const number = span(gutter(line), "number");
  number.style.color = color(line++);
  number.setAttribute("aria-hidden", "true");
  const output = span("", "output");
  output.append(...content);
  row.append(number, output);
  historyLog.append(row);
}
function prompt(focus = true) {
  print(span("@", "sigil"), span(cwd === "/" ? repo : "games", "directory"),
    span(" | ", "dim"), span("main", "branch"));
  form.dataset.gutter = gutter(line);
  form.style.setProperty("--line-color", color(line));
  shell.hidden = false;
  if (focus) input.focus();
}
function resolvePath(path) {
  const parts = path.startsWith("/") ? [] : cwd.split("/").filter(Boolean);
  for (const part of path.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return "/" + parts.join("/");
}
function launch(id) {
  if (active === id) return;
  if (!active) print(span("% ", "dim"), cwd === "/games" ? "./" + id : "./games/" + id);
  const game = games.get(id);
  active = id;
  shell.hidden = true;
  player.hidden = false;
  byId("direct").href = game.url;
  byId("credit").textContent = game.credit;
  byId("credit").href = game.source;
  byId("controls").textContent = game.controls;
  const frame = document.createElement("iframe");
  frame.title = game.title;
  frame.src = game.url;
  screen.classList.toggle("pinball", id === "space-cadet");
  // Focus once the game document exists. Focus given before load did not
  // carry into the game: Space Cadet then received no keys at all.
  frame.addEventListener("load", () => {
    if (document.activeElement === frame || document.activeElement === document.body) focusGame();
  });
  byId("screen").replaceChildren(frame);
  player.scrollIntoView({ block: "nearest" });
}
// Space Cadet cancels mousedown, so clicking it can never move focus into the
// frame. Hand focus over from the parent instead. Re-focusing an iframe the
// parent already treats as focused is a no-op, hence the blur.
function focusGame() {
  const frame = byId("screen").querySelector("iframe");
  if (!frame) return;
  frame.blur();
  frame.focus({ preventScroll: true });
}
// A click on the page around the player otherwise strands focus on the body.
document.addEventListener("pointerup", () => {
  if (active && document.activeElement === document.body) focusGame();
});
function go(id) {
  location.hash = "play/" + id;
}
function syncRoute() {
  const id = location.hash.slice(1).replace(/^play\//, "");
  if (games.has(id)) launch(id);
  else if (active) {
    byId("screen").replaceChildren();
    player.hidden = true;
    active = undefined;
    prompt();
  }
}
byId("leave").onclick = () => {
  history.replaceState(null, "", location.pathname + location.search);
  syncRoute();
};
window.addEventListener("hashchange", syncRoute);
form.onsubmit = event => {
  event.preventDefault();
  const raw = input.value.trim();
  input.value = "";
  if (!raw) return;
  const [cmd, arg, ...extra] = raw.split(/\s+/);
  const path = resolvePath(arg || "/");
  const file = resolvePath(cmd);
  const id = file.slice("/games/".length);
  if (!arg && cmd.includes("/") && file.startsWith("/games/") && games.has(id)) {
    go(id);
    return;
  }
  print(span("% ", "dim"), raw);
  const run = cwd === "/games" ? "./" : "./games/";
  if (!["help", "pwd", "ls", "cd"].includes(cmd)) {
    if (!cmd.includes("/")) print("Unknown command: " + cmd + ". Type help.");
    else if (file === "/" || file === "/games") print("Is a directory: " + file);
    else if (file.startsWith("/games/") && games.has(id)) print("Games take no arguments.");
    else print("No such file: " + file);
  } else if (extra.length || (arg && cmd !== "ls" && cmd !== "cd")) print("Too many arguments.");
  else if (cmd === "help") print("pwd   ls [path]   cd [path]   " + run + featured);
  else if (cmd === "pwd") print(cwd);
  else {
    const dest = cmd === "ls" && !arg ? cwd : path;
    if (dest !== "/" && dest !== "/games") print("No such directory: " + dest);
    else if (cmd === "cd") cwd = dest;
    else print(dest === "/" ? "games/" : [...games.keys()].join("   "));
  }
  prompt();
};
for (const [id, game] of games) {
  const button = document.createElement("button");
  button.textContent = game.title;
  button.onclick = () => go(id);
  document.querySelector(".launchers").append(button);
}
prompt(false);
syncRoute();
if (!active) input.focus();
