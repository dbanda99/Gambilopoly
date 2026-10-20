import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const assert = (value, message) => {
  if (!value) throw Error(message);
};
try {
  await page.addInitScript(() => {
    window.titleStages = [];
    new MutationObserver(() => {
      const stage = document
        .querySelector(".title-screen")
        ?.getAttribute("data-stage");
      if (stage && window.titleStages.at(-1) !== stage)
        window.titleStages.push(stage);
    }).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-stage"],
    });
  });
  await page.goto("http://localhost:5174", { waitUntil: "domcontentloaded" });
  await page.locator('.title-screen[data-stage="logo"]').waitFor();
  assert(
    await page
      .getByRole("navigation", { name: "Game options" })
      .evaluate((e) => e.inert),
    "Menu can receive input during intro",
  );
  await page.locator('.title-screen[data-stage="caption"]').waitFor();
  await page.waitForTimeout(950);
  await page.screenshot({ path: "test-results/title-studio.png" });
  await page.locator('.title-screen[data-stage="blackout"]').waitFor();
  await page.screenshot({ path: "test-results/title-blackout.png" });
  assert(
    (await page
      .locator(".title-backdrop")
      .evaluate((e) => Number(getComputedStyle(e).opacity))) === 0,
    "Background appeared during blackout",
  );
  await page.locator('.title-screen[data-stage="menu"]').waitFor();
  await page.waitForTimeout(1200);
  assert(
    JSON.stringify(await page.evaluate(() => window.titleStages)) ===
      JSON.stringify([
        "black",
        "logo",
        "caption",
        "fade",
        "blackout",
        "background",
        "title",
        "menu",
      ]),
    "Incorrect reveal order",
  );
  assert(
    await page
      .locator(".title-screen img")
      .evaluateAll((images) =>
        images.every((i) => i.complete && i.naturalWidth > 0),
      ),
    "A supplied title image did not load",
  );
  await page.screenshot({ path: "test-results/title-menu-desktop.png" });
  await page.getByRole("button", { name: "Instructions", exact: true }).click();
  await page.getByRole("dialog", { name: "Own the night." }).waitFor();
  await page.getByRole("button", { name: "Close rules" }).click();
  await page.getByRole("button", { name: "Credits", exact: true }).click();
  await page.getByRole("dialog", { name: "Credits", exact: true }).waitFor();
  await page.keyboard.press("Escape");
  assert(
    (await page.getByRole("dialog").count()) === 0,
    "Credits did not close",
  );
  for (const [width, height] of [
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    for (const button of await page.locator(".title-menu button").all()) {
      const b = await button.boundingBox();
      assert(
        b.x >= 0 &&
          b.y >= 0 &&
          b.x + b.width <= width &&
          b.y + b.height < height - 24,
        `Options overflow at ${width}x${height}`,
      );
    }
    await page.screenshot({ path: `test-results/title-menu-${width}.png` });
  }
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("heading", { name: "Select mode" }).waitFor();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.locator('.title-screen[data-stage="menu"]').waitFor();
  assert(
    (await page.getByRole("button", { name: "Skip intro" }).count()) === 0,
    "Returning replays intro",
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.keyboard.press("Escape");
  await page.locator('.title-screen[data-stage="menu"]').waitFor();
  await page.waitForTimeout(1800);
  assert(
    (await page.locator(".title-screen").getAttribute("data-stage")) === "menu",
    "Skip was overwritten by a queued cue",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page
    .locator('.title-screen[data-stage="menu"]')
    .waitFor({ timeout: 5000 });
  assert(errors.length === 0, errors.join("\n"));
  console.log(
    "PASS: studio reveal, black pause, staged title/menu, all images, instructions, credits, play/setup, return, skip, reduced motion, desktop/portrait/landscape.",
  );
} finally {
  await browser.close();
}
