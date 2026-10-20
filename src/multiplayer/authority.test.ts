import { expect, it } from "vitest";
import { authorizeAction } from "./authority";
import { createGame } from "../engine/gameState";
const game = () =>
  createGame([
    { id: "host", name: "Host", token: "pumpkin" },
    { id: "guest", name: "Guest", token: "ghost" },
  ]);
it("rejects actor spoofing, stale revisions and guest control over the intro", () => {
  const s = game();
  expect(() =>
    authorizeAction(s, { type: "roll", playerId: "host" }, "guest", "host", 0),
  ).toThrow(/another/);
  expect(() =>
    authorizeAction(s, { type: "roll", playerId: "host" }, "host", "host", 1),
  ).toThrow(/changed/);
  expect(() =>
    authorizeAction(
      s,
      { type: "skip-intro", playerId: "guest" },
      "guest",
      "host",
      0,
    ),
  ).toThrow(/host/);
  s.currentPlayerIndex = 1;
  expect(
    authorizeAction(
      s,
      { type: "advance-intro", playerId: "host" },
      "host",
      "host",
      0,
    ).playerId,
  ).toBe("guest");
});
it("accepts only the bound current actor and does not accept human actions for a bot", () => {
  const s = game();
  s.currentPlayerIndex = 1;
  expect(
    authorizeAction(s, { type: "roll", playerId: "guest" }, "guest", "host", 0),
  ).toEqual({ type: "roll", playerId: "guest" });
  s.players[1].bot = true;
  expect(() =>
    authorizeAction(s, { type: "roll", playerId: "guest" }, "guest", "host", 0),
  ).toThrow();
  expect(
    authorizeAction(
      s,
      { type: "roll", playerId: "guest" },
      "guest",
      "host",
      0,
      true,
    ).type,
  ).toBe("roll");
});
