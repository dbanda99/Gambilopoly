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
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const tick = async (ms) => {
  await page.clock.fastForward(ms);
  await page.clock.runFor(64);
};
try {
  await page.goto("http://localhost:5174", { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    const { createGame } = await import("/src/engine/gameState.ts");
    const s = createGame(
      [
        { name: "Payer", token: "pumpkin", color: "#f0a35c" },
        { name: "Payee", token: "ghost", color: "#9dccbd" },
      ],
      { skipOpening: true },
    );
    s.properties[3].ownerId = "player-1";
    s.players[1].propertyIds = [3];
    localStorage.setItem(
      "gambilopoly-local-v1",
      JSON.stringify({ version: 1, state: s }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator(".title-screen").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page
    .getByRole("button", { name: "Resume saved local game", exact: false })
    .click();
  await page.waitForTimeout(1800);
  await page.clock.install({ time: new Date("2030-01-01T00:00:00Z") });
  await page.clock.pauseAt(new Date("2030-01-01T00:00:01Z"));
  await page.evaluate(() => {
    const original = crypto.getRandomValues.bind(crypto),
      v = [0, 0.2];
    crypto.getRandomValues = (a) => {
      if (a instanceof Uint32Array && a.length === 1 && v.length) {
        a[0] = Math.floor(v.shift() * 4294967296);
        return a;
      }
      return original(a);
    };
  });
  await page
    .getByRole("button", { name: "Roll the dice", exact: true })
    .click();
  await tick(5000);
  assert(
    (await page.locator(".money-effects").count()) === 0,
    "Money flew before movement finished",
  );
  await tick(2500);
  await page.getByRole("heading", { name: "Rent paid", exact: true }).waitFor();
  await page.locator(".flying-note").first().waitFor();
  assert(
    (await page.locator(".flying-note").count()) === 7,
    "Expected several money notes",
  );
  assert(
    (await page.locator(".money-effects").getAttribute("data-from")) ===
      "player-0" &&
      (await page.locator(".money-effects").getAttribute("data-to")) ===
        "player-1",
    "Money animation travels between wrong players",
  );
  await page.evaluate(() => {
    for (const e of document.querySelectorAll(
      ".flying-note,.money-change,.game-announcement",
    ))
      for (const a of e.getAnimations()) {
        a.pause();
        a.currentTime = e.classList.contains("flying-note") ? 650 : 450;
      }
  });
  await page.screenshot({ path: "test-results/rent-money-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await tick(64);
  await page.waitForTimeout(200);
  const box = await page.locator(".game-announcement").boundingBox();
  assert(
    box.x >= 0 &&
      box.x + box.width <= 390 &&
      box.y >= 190 &&
      box.y + box.height < 650,
    "Mobile announcement overflows",
  );
  await page.screenshot({ path: "test-results/rent-money-mobile.png" });
  assert(
    (await page
      .locator(".announcement-copy h2")
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize))) >= 20,
    "Notification text remains too small",
  );
  await tick(3000);
  assert(
    (await page.locator(".money-effects").count()) === 0,
    "Money effects did not clean up",
  );
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await tick(500);
  await page
    .getByRole("heading", { name: "Payee’s turn", exact: true })
    .waitFor();
  assert(errors.length === 0, errors.join("\n"));
  console.log(
    "PASS: exact rent transfer, seven money-note sprites after movement, payer/payee endpoints, readable desktop/mobile banners, turn notice and cleanup.",
  );
} catch (e) {
  console.log(await page.locator("body").innerText());
  await page.screenshot({ path: "test-results/feedback-failure.png" });
  throw e;
} finally {
  await browser.close();
}
