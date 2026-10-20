import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { networkInterfaces } from "node:os";
const ip = Object.values(networkInterfaces())
  .flat()
  .find((i) => i?.family === "IPv4" && !i.internal)?.address;
assert(ip, "A LAN IPv4 address is needed");
const urls = ["http://localhost:5174", `http://${ip}:5174`];
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const errors = [];
async function open(url) {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator(".title-screen").waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  return page;
}
const choose = (p, name) =>
  p
    .locator(".mode-card")
    .filter({ has: p.getByRole("heading", { name, exact: true }) })
    .click();
try {
  for (const [hostUrl, guestUrl] of [urls, [...urls].reverse()]) {
    const host = await open(hostUrl),
      guest = await open(guestUrl);
    await host.getByLabel("Your name", { exact: true }).fill("LAN Host");
    await choose(host, "Multiplayer");
    await host
      .getByRole("status")
      .filter({ hasText: /^Room online$/ })
      .waitFor({ timeout: 35000 });
    const code = await host.locator(".share-code").innerText();
    await guest.getByLabel("Your name", { exact: true }).fill("LAN Guest");
    await choose(guest, "Join a Game");
    await guest.getByLabel("Room code", { exact: true }).fill(code);
    await guest
      .getByRole("button", { name: "Join lobby", exact: true })
      .click();
    try {
      await guest
        .getByRole("heading", { name: "The lobby", exact: true })
        .waitFor({ timeout: 60000 });
    } catch (e) {
      console.error(
        "Host:",
        await host.locator("body").innerText(),
        "Guest:",
        await guest.locator("body").innerText(),
      );
      throw e;
    }
    const input = guest.getByRole("textbox", { name: /message/i });
    console.log(
      "LAN APIs",
      await guest.evaluate(() => ({
        secure: isSecureContext,
        uuid: typeof crypto.randomUUID,
      })),
    );
    await input.fill("Hello from the LAN device");
    await guest
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await host
      .getByText("Hello from the LAN device", { exact: true })
      .waitFor();
    assert.equal(await host.locator(".lobby-seat").count(), 2);
    console.log(
      `PASS: ${hostUrl} host → ${guestUrl} guest; join and guest chat`,
    );
    await host.close();
    await guest.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
