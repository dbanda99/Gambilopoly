import { expect, it } from "vitest";
import { createGame } from "./gameState";
import { applyAction } from "./reducer";
import { buildingSupply } from "./buildings";
import { rentFor } from "./rules";
import { parseSnapshot } from "./snapshot";
const game = () => {
  const s = createGame(
    [
      { name: "A", token: "pumpkin" },
      { name: "B", token: "ghost" },
    ],
    { skipOpening: true },
  );
  for (const id of [1, 3]) {
    s.properties[id].ownerId = "player-0";
    s.players[0].propertyIds.push(id);
  }
  s.players[0].money = 10000;
  return s;
};
it("requires an owned full set, enough cash, and even building", () => {
  const s = game();
  s.properties[3].ownerId = null;
  expect(() =>
    applyAction(s, { type: "build", playerId: "player-0", spaceId: 1 }),
  ).toThrow(/complete/);
  let t = game();
  t = applyAction(t, { type: "build", playerId: "player-0", spaceId: 1 });
  expect(t.properties[1].buildings).toBe(1);
  expect(t.players[0].money).toBe(9950);
  expect(rentFor(t, 1)).toBe(10);
  expect(() =>
    applyAction(t, { type: "build", playerId: "player-0", spaceId: 1 }),
  ).toThrow(/evenly/);
  expect(() =>
    applyAction(t, { type: "build", playerId: "player-1", spaceId: 3 }),
  ).toThrow();
  t.players[0].money = 49;
  expect(() =>
    applyAction(t, { type: "build", playerId: "player-0", spaceId: 3 }),
  ).toThrow(/enough/);
});
it("upgrades four houses to an inn, returns houses to the bank and persists buildings", () => {
  let s = game();
  for (let level = 0; level < 4; level++)
    for (const id of [1, 3])
      s = applyAction(s, { type: "build", playerId: "player-0", spaceId: id });
  expect(buildingSupply(s)).toEqual({ houses: 24, inns: 12 });
  s = applyAction(s, { type: "build", playerId: "player-0", spaceId: 1 });
  expect(s.properties[1].buildings).toBe(5);
  expect(rentFor(s, 1)).toBe(250);
  expect(buildingSupply(s)).toEqual({ houses: 28, inns: 11 });
  expect(parseSnapshot({ version: 1, state: s })).toEqual(s);
  s = applyAction(s, {
    type: "sell-building",
    playerId: "player-0",
    spaceId: 1,
  });
  expect(s.properties[1].buildings).toBe(4);
  expect(buildingSupply(s)).toEqual({ houses: 24, inns: 12 });
  s = applyAction(s, {
    type: "sell-building",
    playerId: "player-0",
    spaceId: 1,
  });
  expect(() =>
    applyAction(s, { type: "sell-building", playerId: "player-0", spaceId: 1 }),
  ).toThrow(/evenly/);
});
it("enforces the bank house limit", () => {
  const s = game();
  for (const id of [6, 8, 9, 11, 13, 14, 16, 18])
    s.properties[id].buildings = 4;
  expect(() =>
    applyAction(s, { type: "build", playerId: "player-0", spaceId: 1 }),
  ).toThrow(/no houses/);
});
it("blocks turns until a card is acknowledged and applies its effect exactly once", () => {
  let s = game();
  s.players[0].position = 0;
  s = applyAction(s, { type: "roll", playerId: "player-0" }, () => 0);
  expect(s.phase).toBe("card");
  expect(s.players[0].money).toBe(10000);
  expect(s.pendingCard?.text).toContain("Collect");
  expect(() => applyAction(s, { type: "end", playerId: "player-0" })).toThrow(
    /card/,
  );
  expect(parseSnapshot({ version: 1, state: s })).toEqual(s);
  s = applyAction(s, { type: "ack-card", playerId: "player-0" });
  expect(s.players[0].money).toBe(10100);
  expect(s.pendingCard).toBeNull();
  expect(() =>
    applyAction(s, { type: "ack-card", playerId: "player-0" }),
  ).toThrow();
});
