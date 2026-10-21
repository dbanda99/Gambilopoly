import { expect, it } from "vitest";
import { iceConfig } from "./iceConfig";
it("does not advertise dead bundled TURN entries as an available relay", () => {
  expect(iceConfig().hasRelay).toBe(false);
  expect(JSON.stringify(iceConfig())).not.toContain("turn.peerjs.com");
});
it("supports provider URL arrays and preserves credentials without logging them", () => {
  const entry = {
    urls: [
      "turn:relay.example.com:3478",
      "turns:relay.example.com:443?transport=tcp",
    ],
    username: "temporary-user",
    credential: "temporary-secret",
  };
  expect(iceConfig(JSON.stringify([entry]))).toEqual({
    iceServers: [entry],
    hasRelay: true,
  });
  expect(iceConfig('[{"urls":"stun:stun.example.com:3478"}]').hasRelay).toBe(
    false,
  );
});
it("rejects malformed configuration without exposing credentials", () => {
  for (const raw of [
    '[{"urls":"https://bad.example","credential":"do-not-display"}]',
    "{",
    "[]",
    '[{"urls":[]}]',
  ]) {
    expect(() => iceConfig(raw)).toThrow("Invalid relay configuration");
    try {
      iceConfig(raw);
    } catch (e) {
      expect(String(e)).not.toContain("do-not-display");
    }
  }
});
