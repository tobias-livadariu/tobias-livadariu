// Shared by the daily Node renderer and the browser terminal.
export const palette = {
  bg: "#0d1117", fg: "#c5c9c5", fgBright: "#dcd7ba", fgDim: "#a6a69c",
  comment: "#727169", separator: "#5e6173", pink: "#fb7da7", mint: "#76c5a4",
  yellow: "#e3cf65", orange: "#fdad5d", lavender: "#af98e6", cyan: "#51c7da",
};
export const gutterColors = [
  palette.yellow, palette.orange, palette.pink, palette.lavender, palette.cyan, palette.mint,
];
export const featured = "minecraft-classic";
export const games = new Map([
  [featured, {
    title: "Minecraft Classic", url: "https://classic.minecraft.net/",
    credit: "Mojang", source: "https://www.minecraft.net/en-us/article/embrace-past-minecraft-classic",
    controls: "Click to capture the mouse. WASD moves, left click breaks or builds, right click switches between them, Esc releases.",
  }],
  ["space-cadet", {
    title: "3D Pinball for Windows – Space Cadet", url: "https://pinball.alula.me/",
    credit: "k4zmu2a / alula", source: "https://github.com/k4zmu2a/SpaceCadetPinball#known-source-ports",
    controls: "Space to pull the plunger. Release to launch. Z and / for flippers.",
  }],
]);
