import { expect, it } from "vitest";
import { botAction } from "./bot";
import { createGame } from "./gameState";
import { applyAction } from "./reducer";
it("plays automated turns, preserves engine invariants and handles bankruptcy", () => {
  let s = createGame(
    [
      { id: "bot-a", name: "A", token: "pumpkin", bot: true },
      { id: "bot-b", name: "B", token: "ghost", bot: true },
    ],
    { skipOpening: true },
  );
  let seed = 7;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 8000 && s.status !== "finished"; i++) {
    const action = botAction(s);
    expect(action).not.toBeNull();
    s = applyAction(s, action!, rng);
    expect(s.players.every((p) => p.money >= 0)).toBe(true);
  }
  if (s.status !== "finished") {
    s.currentPlayerIndex = 1;
    s.phase = "roll";
    s.players[1].inJail = false;
    s.players[1].position = 37;
    s.players[1].money = 100;
    s.doubles = 0;
    for (const p of s.players)
      p.propertyIds = p.propertyIds.filter((id) => id !== 39);
    s.properties[39].ownerId = s.players[0].id;
    s.properties[39].buildings = 5;
    s.players[0].propertyIds.push(39);
    s = applyAction(s, botAction(s)!, () => 0);
  }
  expect(s.status).toBe("finished");
  expect(s.players.filter((p) => !p.bankrupt)).toHaveLength(1);
});
it("does not act for a human player", () => {
  const s = createGame([
    { name: "Human", token: "pumpkin" },
    { name: "Bot", token: "ghost", bot: true },
  ]);
  expect(botAction(s)).toBeNull();
});
