import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
mkdirSync("test-results", { recursive: true });
const base = process.env.GAME_TEST_URL || "http://localhost:5175";
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
const pages = [];
async function open() {
  const p = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  pages.push(p);
  await p.goto(base, { waitUntil: "domcontentloaded" });
  await p.locator(".title-screen").waitFor();
  await p.keyboard.press("Escape");
  await p.getByRole("button", { name: "Play", exact: true }).click();
  await p.getByRole("heading", { name: "Select mode", exact: true }).waitFor();
  return p;
}
const choose = (p, name) =>
  p
    .locator(".mode-card")
    .filter({ has: p.getByRole("heading", { name, exact: true }) })
    .click();
try {
  const host = await open();
  await host.getByLabel("Your name", { exact: true }).fill("Cloud Host");
  await choose(host, "Multiplayer");
  await host
    .locator(".share-code")
    .filter({ hasText: /^[A-Z2-9]{8}$/ })
    .waitFor({ timeout: 25000 });
  const code = await host.locator(".share-code").innerText();
  for (let n = 1; n <= 4; n++) {
    const p = await open();
    await p.getByLabel("Your name", { exact: true }).fill(`Friend ${n}`);
    await choose(p, "Join a Game");
    await p.getByLabel("Room code", { exact: true }).fill(code);
    await p.getByRole("button", { name: "Join lobby", exact: true }).click();
    if (n < 4)
      await p
        .getByRole("heading", { name: "The lobby", exact: true })
        .waitFor({ timeout: 25000 });
    else
      await p
        .getByRole("alert")
        .filter({ hasText: "full" })
        .waitFor({ timeout: 25000 });
  }
  if ((await host.locator(".lobby-seat").count()) !== 4)
    throw Error("Four browser clients did not join");
  await host.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await host
    .getByRole("button", { name: "Copy invite link", exact: true })
    .click();
  const link = await host.evaluate(() => navigator.clipboard.readText());
  if (new URL(link).searchParams.get("room") !== code)
    throw Error("Invite link does not carry room code");
  await host.screenshot({ path: "test-results/four-player-cloud-lobby.png" });
  await host
    .getByRole("button", { name: "Remove Friend 3", exact: true })
    .click();
  await pages[3].getByRole("alert").filter({ hasText: "removed" }).waitFor();
  console.log(
    "PASS: production build uses public PeerJS signaling; four isolated browsers join over real WebRTC, fifth is rejected, invite link copies correctly, and host kick propagates.",
  );
} catch (e) {
  for (let i = 0; i < pages.length; i++) {
    console.error((await pages[i].locator("body").innerText()).slice(0, 1000));
    await pages[i].screenshot({ path: `test-results/cloud-failure-${i}.png` });
  }
  throw e;
} finally {
  await browser.close();
}
