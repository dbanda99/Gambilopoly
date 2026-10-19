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
    .getByRole("button", { name: "Player 1: Witch", exact: true })
    .click();
  await page.getByRole("button", { name: "Enter the neighborhood" }).click();
  await page.getByRole("button", { name: "Roll the dice" }).waitFor();
  await page.waitForTimeout(1800);
  assert((await page.locator("canvas").count()) === 1, "3D canvas missing");
  await page.screenshot({
    path: "test-results/desktop-board.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Roll the dice" }).click();
  const decision = page.getByRole("button", {
    name: /^Pass for now$|^End turn$|^Doubles! Roll again$/,
  });
  await decision.waitFor({ state: "visible" });
  await page.waitForTimeout(3000);
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
  await page.getByRole("button", { name: "How to play" }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("button", { name: "Close rules" }).click();
  await page.getByRole("button", { name: "New game", exact: true }).click();
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
