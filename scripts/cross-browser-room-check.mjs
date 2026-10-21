import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const url = process.env.GAME_TEST_URL || "http://localhost:5174";
const browsers = [];
const errors = [];
const testWebRTC = process.env.TEST_WEBRTC === "1";
const forceRelay = process.env.FORCE_RELAY === "1";
async function open(channel) {
  const browser = await chromium.launch({
    channel: channel === "bundled" ? undefined : channel,
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  browsers.push(browser);
  const page = await browser.newPage({ reducedMotion: "reduce" });
  if (!testWebRTC)
    await page.route(/https?:\/\/[^/]*peerjs\.com\//, (route) => route.abort());
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ forceRelay }) => {
      window.connectionTrace = [];
      const Original = RTCPeerConnection;
      window.RTCPeerConnection = class extends Original {
        constructor(...args) {
          super(
            forceRelay ? { ...args[0], iceTransportPolicy: "relay" } : args[0],
          );
          const log = (value) => window.connectionTrace.push(value);
          this.addEventListener("signalingstatechange", () =>
            log(`SDP: ${this.signalingState}`),
          );
          this.addEventListener("iceconnectionstatechange", () =>
            log(`ICE: ${this.iceConnectionState}`),
          );
          this.addEventListener("icecandidate", (e) =>
            log(`candidate: ${e.candidate?.type ?? "complete"}`),
          );
          this.addEventListener("icecandidateerror", (e) =>
            log(`candidate error: ${e.errorCode}`),
          );
        }
      };
    },
    { forceRelay },
  );
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
  const combinations = process.env.ROOM_TEST_BROWSER
    ? [[process.env.ROOM_TEST_BROWSER, process.env.ROOM_TEST_BROWSER]]
    : [
        ["chrome", "msedge"],
        ["msedge", "chrome"],
      ];
  for (const [hostBrowser, guestBrowser] of combinations) {
    const host = await open(hostBrowser),
      guest = await open(guestBrowser);
    try {
      await host
        .getByLabel("Your name", { exact: true })
        .fill("Cross-browser Host");
      await choose(host, "Multiplayer");
      await host
        .getByRole("status")
        .filter({ hasText: /^Room online$/ })
        .waitFor({ timeout: 35000 });
      const code = await host.locator(".share-code").innerText();
      await choose(guest, "Join a Game");
      await guest
        .getByLabel("Your name", { exact: true })
        .fill("Cross-browser Guest");
      await guest.getByLabel("Room code", { exact: true }).fill(code);
      await guest
        .getByRole("button", { name: "Join lobby", exact: true })
        .click();
      await guest
        .getByRole("heading", { name: "The lobby", exact: true })
        .waitFor({ timeout: 60000 });
      await guest
        .getByRole("textbox", { name: "Message to lobby" })
        .fill("Hello across browsers");
      await guest
        .getByRole("button", { name: "Send message", exact: true })
        .click();
      await host.getByText("Hello across browsers", { exact: true }).waitFor();
      assert.equal(await host.locator(".lobby-seat").count(), 2);
      console.log(
        `PASS: ${hostBrowser} host → ${guestBrowser} guest: join and chat${forceRelay ? " with relay-only ICE" : ""}`,
      );
    } catch (e) {
      for (const [role, page] of [
        ["host", host],
        ["guest", guest],
      ])
        console.error(
          role,
          await page.locator("body").innerText(),
          await page.evaluate(() => window.connectionTrace),
        );
      throw e;
    } finally {
      await host.close();
      await guest.close();
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await Promise.all(browsers.map((browser) => browser.close()));
}
