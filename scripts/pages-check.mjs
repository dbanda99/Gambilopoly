import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.GAME_TEST_URL || "http://localhost:5175/Gambilopoly/";
const origin = new URL(base).origin,
  prefix = new URL(base).pathname;
const failures = [],
  assets = new Set();
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.on("pageerror", (e) => failures.push(e.message));
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (u.origin !== origin) return;
    if (r.status() >= 400) failures.push(`${r.status()} ${u.pathname}`);
    if (u.pathname.includes("/assets/")) {
      assets.add(u.pathname);
      if (!u.pathname.startsWith(prefix))
        failures.push(`Asset escaped base: ${u.pathname}`);
    }
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator(".title-screen").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page
    .locator(".mode-card")
    .filter({
      has: page.getByRole("heading", { name: "Single Player", exact: true }),
    })
    .click();
  await page.getByRole("heading", { name: "The lobby", exact: true }).waitFor();
  await page.getByRole("button", { name: "Start game", exact: true }).click();
  await page.locator("canvas").waitFor();
  await page.waitForFunction(
    () => !!JSON.parse(localStorage.getItem("gambilopoly-local-v1"))?.state,
    null,
    { timeout: 30000 },
  );
  await page.waitForTimeout(2500);
  for (const file of [
    "board/cards/chance-back-design.png",
    "board/cards/community-chest-text-design.png",
    "board/money/money-note.webp",
    "tabletop/house.glb",
    "tabletop/inn.glb",
  ]) {
    const response = await page.request.get(`${base}assets/${file}`);
    assert.equal(response.status(), 200, file);
  }
  assert(
    [...assets].some((s) => s.endsWith("dice.glb")),
    "Dice loaded under repository path",
  );
  assert(
    [...assets].some((s) => s.includes("/players/") && s.endsWith(".glb")),
    "Player models loaded",
  );
  assert(
    [...assets].some((s) => s.endsWith("title-background.webp")),
    "Title artwork loaded",
  );
  assert.deepEqual(failures, []);
  console.log(
    `PASS: ${prefix} title, lobby, 3D game, models, dice, cards and money assets load without root-path requests or HTTP errors.`,
  );
} finally {
  await browser.close();
}
