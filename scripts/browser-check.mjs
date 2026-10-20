import { openSetup } from "./open-setup.mjs";
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
page.on("pageerror", (error) => errors.push(error.message));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
try {
  await page.goto("http://localhost:5173");
  await openSetup(page);
  await page.getByRole("heading", { name: "Gather your ghouls" }).waitFor();
  await page.screenshot({
    path: "test-results/desktop-lobby.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "4 players", exact: true }).click();
  assert(
    (await page.locator("input").count()) === 4,
    "Four player inputs missing",
  );
  await page
    .getByRole("button", { name: "Player 1: Hexie", exact: true })
    .click();
  await page.getByRole("button", { name: "Enter the neighborhood" }).click();
  await page.getByRole("button", { name: "Skip camera tour" }).click();
  for (let attempt = 0; attempt < 40; attempt++) {
    const phase = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("gambilopoly-local-v1")).state.phase,
    );
    if (phase !== "opening") break;
    // Wait for the same button to finish its reveal animation; its label can
    // change to Start playing while a slow WebGL frame is being rendered.
    await page.locator(".opening-order > .game-action").click();
  }
  await page.getByRole("button", { name: "Roll the dice" }).waitFor();
  await page.waitForTimeout(1800);
  const fullViewport = await page.locator(".game-screen").boundingBox();
  assert(
    fullViewport.width === 1440 && fullViewport.height === 1000,
    "Game does not fill the desktop viewport",
  );
  assert(
    await page.locator(".header").isHidden(),
    "Page header is still visible during gameplay",
  );
  assert((await page.locator("canvas").count()) === 1, "3D canvas missing");
  await page.screenshot({
    path: "test-results/desktop-board.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Roll the dice" }).click();
  const decision = page.getByRole("button", {
    name: /^Pass for now$|^End turn$|^Doubles! Roll again$|^Continue$/,
  });
  await decision.waitFor({ state: "visible" });
  await page.waitForTimeout(3000);
  if (await page.getByRole("button", { name: "Continue", exact: true }).count())
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  if (
    await page
      .getByRole("button", { name: "Pass for now", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Pass for now", exact: true })
      .click();
  await page
    .getByRole("button", { name: /^End turn$|^Doubles! Roll again$/ })
    .click();
  await page.getByRole("button", { name: "Roll the dice" }).waitFor();
  const snapshot = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gambilopoly-local-v1")),
  );
  assert(snapshot.state.revision >= 2, "Actions were not saved");
  assert(snapshot.state.players.length === 4, "Wrong player count");
  assert(
    new Set(snapshot.state.players.map((p) => p.token)).size === 4,
    "Tokens not unique",
  );
  await page.reload();
  await openSetup(page);
  await page.getByRole("button", { name: "Resume saved local game" }).click();
  await page.getByRole("button", { name: "Roll the dice" }).waitFor();
  assert(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("gambilopoly-local-v1")),
      )
    ).state.revision === snapshot.state.revision,
    "Resume changed state",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Mobile layout overflows",
  );
  await page.screenshot({
    path: "test-results/mobile-board.png",
    fullPage: true,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight,
    ),
    "Gameplay scrolls vertically on mobile",
  );
  const dock = await page.locator(".game-turn-dock").boundingBox();
  assert(
    dock.x >= 0 && dock.x + dock.width <= 390 && dock.y + dock.height <= 844,
    "Turn controls leave the mobile screen",
  );
  await page.getByRole("button", { name: "How to play" }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Close rules" }).click();
  // Resume a valid landing fixture so the purchase panel is checked on every run.
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem("gambilopoly-local-v1"));
    const s = save.state,
      p = s.players[s.currentPlayerIndex];
    p.position = 3;
    s.phase = "purchase";
    s.movement = null;
    s.dice = [1, 2];
    s.extraTurn = false;
    s.revision++;
    localStorage.setItem("gambilopoly-local-v1", JSON.stringify(save));
  });
  await page.reload();
  await openSetup(page);
  await page.getByRole("button", { name: "Resume saved local game" }).click();
  await page.getByRole("region", { name: "Property purchase" }).waitFor();
  for (const [name, width, height] of [
    ["portrait", 390, 844],
    ["small-phone", 375, 667],
    ["landscape", 844, 390],
    ["desktop", 1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(600);
    for (const button of await page
      .locator(".game-screen .game-action,.game-tools button,.player-badge")
      .all()) {
      if (!(await button.isVisible())) continue;
      const box = await button.boundingBox();
      assert(
        box.x >= 0 &&
          box.y >= 0 &&
          box.x + box.width <= width + 1 &&
          box.y + box.height <= height + 1,
        `${name}: control outside viewport`,
      );
    }
    const deed = await page.locator(".purchase-overlay").boundingBox();
    const turn = await page.locator(".game-turn-dock").boundingBox();
    assert(
      deed.y >= 0 && deed.y + deed.height < turn.y,
      `${name}: purchase card overlaps turn dock`,
    );
    await page.screenshot({ path: `test-results/${name}-purchase.png` });
  }
  const beforePurchase = await page.evaluate(
    () => JSON.parse(localStorage.getItem("gambilopoly-local-v1")).state,
  );
  await page.getByRole("button", { name: "Buy for $60" }).click();
  await page.getByRole("button", { name: "End turn", exact: true }).waitFor();
  const bought = await page.evaluate(
    () => JSON.parse(localStorage.getItem("gambilopoly-local-v1")).state,
  );
  assert(
    bought.players[bought.currentPlayerIndex].money ===
      beforePurchase.players[beforePurchase.currentPlayerIndex].money - 60,
    "Purchase did not debit cash",
  );
  assert(
    bought.properties[3].ownerId ===
      bought.players[bought.currentPlayerIndex].id,
    "Purchase did not assign ownership",
  );
  await page.locator(".player-badge.is-current").click();
  await page.getByRole("button", { name: "Cobweb Cottage" }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Close property" }).click();
  await page.getByRole("button", { name: "Close player properties" }).click();
  (await page.getByRole("button", { name: "Top view", exact: true }).count())
    ? await page.getByRole("button", { name: "Top view", exact: true }).click()
    : await page
        .getByRole("button", { name: "Angled view", exact: true })
        .click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "test-results/desktop-angled-board.png" });
  await page
    .getByRole("button", { name: "Match options", exact: true })
    .click();
  await page.getByRole("button", { name: "Set up a new game" }).click();
  await page.screenshot({
    path: "test-results/mobile-lobby.png",
    fullPage: true,
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Mobile lobby overflows",
  );
  assert(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
  console.log(
    "PASS: four-player setup, unique token swap, WebGL board, roll, purchase pass, next turn, save/resume, rules dialog, mobile layouts.",
  );
} finally {
  await browser.close();
}
