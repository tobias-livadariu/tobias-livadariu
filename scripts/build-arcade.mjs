// Stage only the static files served by Pages, using the same font as the SVG.
import { mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const out = resolve(process.argv[2] || "dist");
await mkdir(out, { recursive: true });
for (const name of ["index.html", "terminal.css", "terminal.mjs", "profile.mjs"]) {
  await copyFile(resolve(root, "arcade", name), resolve(out, name));
}
await copyFile(resolve(root, "assets/generated/iosevka-term-regular.ascii.subset.woff2"), resolve(out, "iosevka.woff2"));
