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
let page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const save = () =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("gambilopoly-local-v1")).state,
  );
const reopen = async () => {
  const fixture = await save(),
    viewport = page.viewportSize();
  await page.close();
  page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    (s) =>
      localStorage.setItem(
        "gambilopoly-local-v1",
        JSON.stringify({ version: 1, state: s }),
      ),
    fixture,
  );
  await page.goto("http://localhost:5173");
  await page.getByRole("button", { name: "Resume saved local game" }).click();
};
const tick = async (ms) => {
  await page.clock.fastForward(ms);
  await page.clock.runFor(32);
};
try {
  await page.goto("http://localhost:5173");
  await page.evaluate(async () => {
    const { createGame } = await import("/src/engine/gameState.ts");
    const s = createGame(
      [
        { name: "Tester", token: "pumpkin" },
        { name: "Boo", token: "ghost" },
      ],
      { skipOpening: true },
    );
    s.players[0].position = 4;
    s.players[0].money = 5000;
    for (const id of [1, 3]) {
      s.properties[id].ownerId = "player-0";
      s.players[0].propertyIds.push(id);
    }
    localStorage.setItem(
      "gambilopoly-local-v1",
      JSON.stringify({ version: 1, state: s }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Resume saved local game" }).click();
  await page.waitForTimeout(1800);
  await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2030-01-01T00:00:01Z"));
  await page.evaluate(() => {
    const random = crypto.getRandomValues.bind(crypto);
    const values = [0.01, 0.2, 0];
    crypto.getRandomValues = (array) => {
      if (values.length) {
        array[0] = Math.floor(values.shift() * 4294967296);
        return array;
      }
      return random(array);
    };
  });
  await page
    .getByRole("button", { name: "Roll the dice", exact: true })
    .click();
  await tick(700);
  assert(
    (await page.locator(".dice-result-label").getAttribute("data-stage")) ===
      "throw",
    "Missing board throw stage",
  );
  await page.screenshot({ path: "test-results/dice-board-throw.png" });
  await tick(800);
  assert(
    (await page.locator(".dice-result-label").getAttribute("data-stage")) ===
      "settled",
    "Dice were picked up before settling",
  );
  await page.screenshot({ path: "test-results/dice-board-settled.png" });
  await tick(1100);
  assert(
    (await page.locator(".dice-result-label").getAttribute("data-stage")) ===
      "result",
    "Missing screen-center result",
  );
  assert(
    (await page.locator(".dice-result-label").innerText()).includes(
      "1 + 2 = 3",
    ),
    "Dice result differs from engine",
  );
  await page.screenshot({ path: "test-results/dice-screen-result.png" });
  await tick(9000);
  await page.getByRole("dialog", { name: "Chance", exact: true }).waitFor();
  await page.waitForTimeout(300);
  assert(
    !(await page
      .locator(".flipping-card")
      .evaluate((e) => e.classList.contains("is-face-up"))),
    "Card did not start with its back",
  );
  await page.screenshot({ path: "test-results/chance-card-back.png" });
  await tick(1050);
  await tick(1000);
  await page.waitForTimeout(900);
  assert(
    await page
      .locator(".flipping-card")
      .evaluate((e) => e.classList.contains("is-face-up")),
    "Card did not flip",
  );
  await page.screenshot({ path: "test-results/chance-card-front.png" });
  assert(
    (await save()).players[0].money === 5000,
    "Card paid out before acknowledgment",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  assert(
    (await save()).players[0].money === 5050,
    "Chance payout was not applied once",
  );

  await page.evaluate(() => {
    const v = JSON.parse(localStorage.getItem("gambilopoly-local-v1")),
      s = v.state;
    s.phase = "card";
    s.movement = null;
    s.players[0].position = 2;
    s.pendingCard = {
      deck: "community",
      index: 0,
      text: "Your neighbors share their candy haul. Collect $100.",
      amount: 100,
      playerId: "player-0",
      revision: s.revision,
    };
    localStorage.setItem("gambilopoly-local-v1", JSON.stringify(v));
  });
  await reopen();

  await page.waitForTimeout(2200);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  assert(
    (await save()).players[0].money === 5150,
    "Community Chest payout incorrect",
  );
  await page.locator(".player-badge.is-current").click();
  await page
    .getByRole("button", { name: "Midnight Hollow", exact: true })
    .click();
  await page.getByRole("button", { name: /^Build a house/ }).click();
  assert((await save()).properties[1].buildings === 1, "House action failed");
  await page.getByRole("button", { name: "Close property" }).click();
  await page.getByRole("button", { name: "Close player properties" }).click();
  await page.evaluate(() => {
    const v = JSON.parse(localStorage.getItem("gambilopoly-local-v1"));
    v.state.properties[1].buildings = 4;
    v.state.properties[3].buildings = 4;
    v.state.movement = null;
    localStorage.setItem("gambilopoly-local-v1", JSON.stringify(v));
  });
  await reopen();

  await page.locator(".player-badge.is-current").click();
  await page
    .getByRole("button", { name: "Midnight Hollow", exact: true })
    .click();
  await page.getByRole("button", { name: /^Upgrade to inn/ }).click();
  assert(
    (await save()).properties[1].buildings === 5,
    "Inn upgrade action failed",
  );
  await page.getByRole("button", { name: "Close property" }).click();
  await page.getByRole("button", { name: "Close player properties" }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "test-results/houses-and-inn-board.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    const v = JSON.parse(localStorage.getItem("gambilopoly-local-v1"));
    v.state.phase = "card";
    v.state.pendingCard = {
      deck: "community",
      index: 0,
      text: "Your neighbors share their candy haul. Collect $100.",
      amount: 100,
      playerId: "player-0",
      revision: v.state.revision,
    };
    localStorage.setItem("gambilopoly-local-v1", JSON.stringify(v));
  });
  await reopen();

  await page.getByRole("button", { name: "Continue", exact: true }).waitFor();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: "test-results/mobile-community-card.png" });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile card overflows",
  );
  assert(errors.length === 0, errors.join("\n"));
  console.log(
    "PASS: actual OBJ dice throw, settling, pickup and matching result; back-to-front card reveal; once-only Chance/Community effects; building and inn upgrade UI; mobile card.",
  );
} catch (error) {
  console.log(await page.locator("body").innerText());
  await page.screenshot({ path: "test-results/play-effects-failure.png" });
  throw error;
} finally {
  await browser.close();
}
