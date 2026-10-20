import { isDeepStrictEqual } from "node:util";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const base = process.env.GAME_TEST_URL || "http://localhost:5174";
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
const errors = [];
const assert = (ok, message) => {
  if (!ok) throw Error(message);
};
const page = async (url = base) => {
  const p = await browser.newPage({
    viewport: { width: 1440, height: 960 },
    reducedMotion: "reduce",
  });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(url, { waitUntil: "domcontentloaded" });
  await p.locator(".title-screen").waitFor();
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Play", exact: true }).click();
  await p.getByRole("heading", { name: /Select mode|Join a game/ }).waitFor();
  return p;
};
const choose = async (p, label) =>
  p
    .locator(".mode-card")
    .filter({ has: p.getByRole("heading", { name: label, exact: true }) })
    .click();
const saved = (p) =>
  p.evaluate(
    () => JSON.parse(localStorage.getItem("gambilopoly-local-v1")).state,
  );
const wait = async (p, predicate) =>
  p.waitForFunction(predicate, null, { timeout: 60000 });
const values = async (p, v) =>
  p.evaluate((v) => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (a) => {
      if (a instanceof Uint32Array && a.length === 1 && v.length) {
        a[0] = Math.floor(v.shift() * 4294967296);
        return a;
      }
      return original(a);
    };
  }, v);
const waitOrder = (p) =>
  wait(
    p,
    () =>
      JSON.parse(localStorage.getItem("gambilopoly-local-v1"))?.state.opening
        ?.stage === "order",
  );
async function join(p, code, name) {
  await p.getByLabel("Your name", { exact: true }).fill(name);
  if (
    await p.getByRole("heading", { name: "Select mode", exact: true }).count()
  )
    await choose(p, "Join a Game");
  await p.getByLabel("Room code", { exact: true }).fill(code);
  await p.getByRole("button", { name: "Join lobby", exact: true }).click();
  await p
    .getByRole("heading", { name: "The lobby", exact: true })
    .waitFor({ timeout: 25000 });
}
try {
  if (!process.env.SKIP_SOLO) {
    const solo = await page();
    await solo.getByLabel("Your name", { exact: true }).fill("Solo");
    await choose(solo, "Single Player");
    await solo
      .getByRole("heading", { name: "The lobby", exact: true })
      .waitFor();
    assert(
      (await solo.locator(".lobby-seat").count()) === 4,
      "Single Player did not create bots",
    );
    await solo
      .getByRole("button", { name: "Remove Bot 3", exact: true })
      .click();
    await solo
      .getByRole("button", { name: "Remove Bot 2", exact: true })
      .click();
    await solo.getByLabel("Character for Solo").selectOption("warps");
    await solo
      .getByRole("button", { name: "Solo: color 6", exact: true })
      .click();
    await solo.screenshot({ path: "test-results/single-player-lobby.png" });
    await solo.setViewportSize({ width: 390, height: 844 });
    await solo.screenshot({ path: "test-results/mobile-lobby.png" });
    assert(
      await solo.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Mobile lobby overflows",
    );
    await solo.setViewportSize({ width: 1100, height: 820 });
    await values(solo, [0, 0, 0.9, 0.9, 0.01, 0.2]);
    await solo.getByRole("button", { name: "Start game", exact: true }).click();
    await waitOrder(solo);
    await solo
      .getByRole("button", { name: "Solo: roll for first", exact: true })
      .click();
    await wait(solo, () => {
      const s = JSON.parse(localStorage.getItem("gambilopoly-local-v1")).state;
      return (
        s.phase === "roll" &&
        s.currentPlayerIndex === 0 &&
        s.players[1].propertyIds.includes(3)
      );
    });
    const botState = await saved(solo);
    assert(
      botState.players[0].color === "#91baf2" &&
        botState.players[0].token === "warps",
      "Customization was lost",
    );
    assert(
      botState.players[1].money === 1440,
      "Bot did not purchase its landing",
    );
    await solo.screenshot({ path: "test-results/bot-game.png" });
    await solo.close();
    console.log(
      "PASS: single-player lobby, customization and automatic bot opening/roll/purchase/end.",
    );
  }
  const host = await page();
  await host.getByLabel("Your name", { exact: true }).fill("Captain");
  await choose(host, "Multiplayer");
  await host
    .locator(".share-code")
    .filter({ hasText: /^[A-Z2-9]{8}$/ })
    .waitFor({ timeout: 25000 });
  const code = await host.locator(".share-code").innerText();
  const guest = await page(`${base}/?room=${code}`);
  await join(guest, code, "Friend");
  await host.locator(".lobby-seat").filter({ hasText: "Friend" }).waitFor();
  await host
    .getByLabel("Message to lobby", { exact: true })
    .fill("Welcome to the haunted lobby!");
  await host.getByRole("button", { name: "Send message", exact: true }).click();
  await guest
    .getByRole("log", { name: "Lobby messages" })
    .getByText("Welcome to the haunted lobby!", { exact: true })
    .waitFor();
  await guest
    .getByLabel("Message to lobby", { exact: true })
    .fill("<img src=x onerror=alert(1)> Ready!");
  await guest
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await host
    .getByRole("log", { name: "Lobby messages" })
    .getByText("<img src=x onerror=alert(1)> Ready!", { exact: true })
    .waitFor();
  assert(
    (await host.locator(".chat-message p img").count()) === 0,
    "Chat interpreted HTML",
  );
  const third = await page();
  await join(third, code, "Uninvited");
  await third
    .getByRole("log", { name: "Lobby messages" })
    .getByText("Welcome to the haunted lobby!", { exact: true })
    .waitFor();
  await host.screenshot({ path: "test-results/lobby-chat-desktop.png" });
  await guest.setViewportSize({ width: 390, height: 844 });
  await guest.locator(".lobby-chat").scrollIntoViewIfNeeded();
  await guest.screenshot({ path: "test-results/lobby-chat-mobile.png" });
  assert(
    await guest.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile chat overflows",
  );
  await guest.setViewportSize({ width: 1440, height: 960 });
  await host
    .getByRole("button", { name: "Remove Uninvited", exact: true })
    .click();
  await third.getByRole("alert").filter({ hasText: "removed" }).waitFor();
  assert(
    (await host.locator(".lobby-seat").count()) === 2,
    "Kick did not remove seat",
  );
  await third.close();
  await guest.getByLabel("Character for Friend").selectOption("witch");
  await guest.waitForTimeout(200);
  await guest
    .getByRole("button", { name: "Friend: color 6", exact: true })
    .click();
  await host.waitForFunction(() =>
    Array.from(document.querySelectorAll(".seat-ribbon strong")).some(
      (e) => e.textContent === "Friend",
    ),
  );
  assert(
    await guest
      .getByRole("button", { name: "Friend: color 1", exact: true })
      .isDisabled(),
    "Color conflicts are selectable",
  );
  assert(
    await host.getByLabel("Character for Friend").isDisabled(),
    "Host can edit a human guest",
  );
  await host.screenshot({ path: "test-results/online-lobby.png" });
  assert(
    await host
      .getByRole("button", { name: "Start game", exact: true })
      .isDisabled(),
    "Host can start with an unready guest",
  );
  await guest.waitForTimeout(200);
  await guest
    .getByRole("button", { name: "Ready to play", exact: true })
    .click();
  await values(host, [0.9, 0.9, 0, 0, 0.01, 0.2, 0.2, 0.01]);
  await host.getByRole("button", { name: "Start game", exact: true }).click();
  await waitOrder(host);
  await host
    .getByRole("button", { name: "Captain: roll for first", exact: true })
    .click();
  await guest
    .getByRole("button", { name: "Friend: roll for first", exact: true })
    .click();
  await host
    .getByRole("button", { name: "Roll the dice", exact: true })
    .waitFor({ timeout: 25000 });
  assert(
    await guest
      .getByRole("button", { name: "Roll the dice", exact: true })
      .isDisabled(),
    "Guest can roll on the host turn",
  );
  await host
    .getByRole("button", { name: "Roll the dice", exact: true })
    .click();
  await host.getByRole("button", { name: "Buy for $60", exact: true }).click();
  await host.getByRole("button", { name: "End turn", exact: true }).click();
  await guest
    .getByRole("button", { name: "Roll the dice", exact: true })
    .click();
  await guest
    .getByRole("button", { name: "End turn", exact: true })
    .waitFor({ state: "visible", timeout: 30000 });
  await guest.waitForTimeout(1200);
  const a = await saved(host),
    b = await saved(guest);
  assert(isDeepStrictEqual(a, b), "Host and guest diverged");
  assert(
    a.players[0].money === 1444 && a.players[1].money === 1496,
    "Rent did not transfer",
  );
  assert(
    a.players[1].color === "#91baf2" && a.players[1].token === "witch",
    "Guest customization was lost",
  );
  await guest.screenshot({ path: "test-results/guest-game.png" });
  await guest.close();
  await host.locator(".session-indicator.is-paused").waitFor();
  await host.close();
  console.log(
    "PASS: actual WebRTC host/join, invite code, kick, ready gate, unique profiles, authoritative opening, movement, purchase, rent, equal snapshots and disconnect pause.",
  );
  assert(errors.length === 0, errors.join("\n"));
} catch (e) {
  console.error(e);
  for (const context of browser.contexts())
    for (const p of context.pages()) {
      console.error((await p.locator("body").innerText()).slice(0, 3000));
      await p.screenshot({
        path: `test-results/modes-failure-${browser.contexts().indexOf(context)}.png`,
      });
    }
  throw e;
} finally {
  await browser.close();
}
