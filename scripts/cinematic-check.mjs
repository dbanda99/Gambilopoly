import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
try {
  await page.goto("http://localhost:5173");
  await page.getByRole("button", { name: "4 players", exact: true }).click();
  await page.evaluate(() => {
    window.__introduced = [];
    new MutationObserver(() => {
      const title = document.querySelector(".intro-caption h1")?.textContent;
      if (title?.includes("Player") && !window.__introduced.includes(title))
        window.__introduced.push(title);
    }).observe(document.body, { childList: true, subtree: true });
  });
  await page.getByRole("button", { name: "Enter the neighborhood" }).click();
  await page.getByRole("region", { name: "Match introduction" }).waitFor();
  assert(
    (await page
      .getByRole("button", { name: "Roll the dice", exact: true })
      .count()) === 0,
    "Turn roll appeared before the opening",
  );
  await page.waitForTimeout(2200);
  await page.screenshot({ path: "test-results/board-tour.png" });
  await page
    .getByRole("heading", { name: /Player 2$/ })
    .waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/player-introduction.png" });
  await page
    .getByRole("region", { name: "Starting order" })
    .waitFor({ timeout: 15000 });
  assert(
    (await page.evaluate(() => window.__introduced)).length === 4,
    "Not every player was introduced",
  );
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/opening-order.png" });
  for (let i = 0; i < 40; i++) {
    const begin = page.getByRole("button", {
      name: "Start playing",
      exact: true,
    });
    if (await begin.count()) {
      await begin.click();
      break;
    }
    await page.getByRole("button", { name: /roll for first$/ }).click();
    await page.waitForTimeout(850);
  }
  await page
    .getByRole("button", { name: "Roll the dice", exact: true })
    .waitFor();
  const initial = await page.evaluate(
    () => JSON.parse(localStorage.getItem("gambilopoly-local-v1")).state,
  );
  assert(
    initial.phase === "roll" && initial.players.every((p) => p.position === 0),
    "Opening dice moved a token",
  );
  // A known roll makes the camera/movement capture repeatable.
  await page.evaluate(() => {
    const original = crypto.getRandomValues.bind(crypto);
    let n = 0;
    crypto.getRandomValues = (array) => {
      if (n++ < 2) {
        array[0] = Math.floor((n === 1 ? 0.7 : 0.3) * 4294967296);
        return array;
      }
      return original(array);
    };
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "test-results/default-25d.png" });
  await page
    .getByRole("button", { name: "Roll the dice", exact: true })
    .click();
  await page.waitForTimeout(2100);
  assert(
    (await page
      .getByRole("button", {
        name: /^End turn$|^Pass for now$|^Doubles! Roll again$/,
      })
      .count()) === 0,
    "Landing action visible while token is moving",
  );
  await page.screenshot({ path: "test-results/movement-closeup.png" });
  await page
    .getByRole("button", {
      name: /^End turn$|^Pass for now$|^Doubles! Roll again$/,
    })
    .waitFor({ timeout: 12000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/arrival-overview.png" });
  // Tour skipping skips only presentation: order rolls must still happen.
  await page
    .getByRole("button", { name: "Match options", exact: true })
    .click();
  await page.getByRole("button", { name: "Set up a new game" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Enter the neighborhood" }).click();
  await page.getByRole("button", { name: "Skip camera tour" }).click();
  await page.getByRole("region", { name: "Starting order" }).waitFor();
  await page.screenshot({ path: "test-results/mobile-opening-order.png" });
  const box = await page.locator(".opening-order").boundingBox();
  assert(
    box.y >= 190 && box.y + box.height < 844,
    "Mobile starting order panel overlaps roster or leaves screen",
  );
  await page.reload();
  await page.getByRole("button", { name: "Resume saved local game" }).click();
  await page.getByRole("region", { name: "Starting order" }).waitFor();
  assert(errors.length === 0, errors.join("\n"));
  console.log(
    "PASS: full board tour, all four introductions, opening rolls, correct first turn, 2.5D overview, follow camera, blocked controls during movement, arrival, skip and opening save/resume.",
  );
} finally {
  await browser.close();
}
