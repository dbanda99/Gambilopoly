import { expect, it } from "vitest";
import { createGame } from "./gameState";
import { parseSnapshot } from "./snapshot";
import { applyAction } from "./reducer";
const state = () =>
  createGame(
    [
      { name: "A", token: "pumpkin" },
      { name: "B", token: "ghost" },
      { name: "C", token: "witch" },
    ],
    { skipOpening: true },
  );
it("round-trips snapshots and rejects corrupt or inconsistent saves", () => {
  const s = state();
  expect(parseSnapshot({ version: 1, state: s })).toEqual(s);
  expect(parseSnapshot({ version: 2, state: s })).toBeNull();
  expect(
    parseSnapshot({ version: 1, state: { ...s, currentPlayerIndex: 3 } }),
  ).toBeNull();
  s.properties[1].ownerId = "player-0";
  expect(parseSnapshot({ version: 1, state: s })).toBeNull();
  s.players[0].propertyIds = [1];
  expect(parseSnapshot({ version: 1, state: s })).toEqual(s);
  expect(
    parseSnapshot({ version: 1, state: { ...s, properties: {} } }),
  ).toBeNull();
});
it("can resume a multiplayer-count local match between bankruptcy and the next turn", () => {
  const s = applyAction(state(), { type: "resign", playerId: "player-0" });
  expect(s.status).toBe("playing");
  expect(parseSnapshot({ version: 1, state: s })).toEqual(s);
  const next = applyAction(s, { type: "end", playerId: "player-0" });
  expect(next.currentPlayerIndex).toBe(1);
});
