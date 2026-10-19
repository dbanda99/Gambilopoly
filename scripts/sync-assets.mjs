import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import sharp from "sharp";
await import("./prepare-models.mjs");
const output = path.join(process.cwd(), "public", "assets");
mkdirSync(output, { recursive: true });
if (!existsSync("2d-textures"))
  throw new Error("Missing board source folder: 2d-textures");
cpSync("2d-textures", path.join(output, "board"), { recursive: true });
await sharp("2d-textures/map-center/cementary-background.png")
  .resize(2048, 2048, { withoutEnlargement: true })
  .webp({ quality: 90 })
  .toFile(path.join(output, "board", "map-center", "cemetery-background.webp"));
cpSync("assets/players", path.join(output, "players"), { recursive: true });
const catalog = JSON.parse(readFileSync("src/data/playerAssets.json", "utf8"));
const models = Object.fromEntries(
  Object.entries(catalog).map(([token, entry]) => [
    token,
    `/assets/players/${entry.file}`,
  ]),
);
mkdirSync("src/generated", { recursive: true });
writeFileSync(
  "src/generated/assets.json",
  JSON.stringify({ models }, null, 2) + "\n",
);
console.log("Board artwork and seven web-ready player models synchronized.");
