import { describe, expect, it } from "vitest";
import { createGame } from "./gameState";
import { applyAction } from "./reducer";
import { parseSnapshot } from "./snapshot";
import type { Action, GameState } from "./types";
const game = () =>
  createGame([
    { name: "A", token: "pumpkin" },
    { name: "B", token: "ghost" },
    { name: "C", token: "witch" },
  ]);
const act = (s: GameState, type: Action["type"], roll = 0) =>
  applyAction(
    s,
    { type, playerId: s.players[s.currentPlayerIndex].id },
    () => roll,
  );
describe("opening sequence", () => {
  it("starts with the tour, introduces every player and then opens the dice round", () => {
    let s = game();
    expect(s.phase).toBe("opening");
    expect(s.opening?.stage).toBe("tour");
    s = act(s, "advance-intro");
    expect(s.opening?.stage).toBe("introductions");
    for (let i = 0; i < 3; i++) {
      expect(s.opening?.spotlightIndex).toBe(i);
      s = act(s, "advance-intro");
    }
    expect(s.opening?.stage).toBe("order");
  });
  it("blocks normal gameplay and premature order rolls", () => {
    const s = game();
    for (const type of ["roll", "buy", "end", "begin", "opening-roll"] as const)
      expect(() => act(s, type)).toThrow();
    expect(() =>
      applyAction(s, { type: "skip-intro", playerId: "player-1" }),
    ).toThrow();
  });
  it("rolls once per player, makes the highest roller first and preserves clockwise order", () => {
    let s = act(game(), "skip-intro");
    s = act(s, "opening-roll", 0.01);
    s = act(s, "opening-roll", 0.99);
    s = act(s, "opening-roll", 0.4);
    expect(s.opening?.winnerId).toBe("player-1");
    expect(s.currentPlayerIndex).toBe(1);
    expect(s.players.every((p) => p.position === 0 && p.money === 1500)).toBe(
      true,
    );
    expect(s.opening?.history).toHaveLength(3);
    expect(parseSnapshot({ version: 1, state: s })).toEqual(s);
    s = act(s, "begin");
    expect(s.phase).toBe("roll");
    expect(s.dice).toBeNull();
    s = act(s, "roll", 0.1);
    if (s.phase === "purchase") s = act(s, "pass");
    s.extraTurn = false;
    expect(act(s, "end").currentPlayerIndex).toBe(2);
  });
  it("rerolls only tied highest players, including repeated ties", () => {
    let s = act(game(), "skip-intro");
    s = act(s, "opening-roll", 0.8);
    s = act(s, "opening-roll", 0.8);
    s = act(s, "opening-roll", 0.01);
    expect(s.opening?.round).toBe(2);
    expect(s.opening?.candidateIds).toEqual(["player-0", "player-1"]);
    s = act(s, "opening-roll", 0.5);
    s = act(s, "opening-roll", 0.5);
    expect(s.opening?.round).toBe(3);
    s = act(s, "opening-roll", 0.2);
    s = act(s, "opening-roll", 0.99);
    expect(s.opening?.winnerId).toBe("player-1");
    expect(s.opening?.history).toHaveLength(7);
  });
  it("resumes a partially rolled round and rejects duplicate actors and malformed opening saves", () => {
    let s = act(game(), "skip-intro");
    s = act(s, "opening-roll", 0.1);
    const restored = parseSnapshot(
      JSON.parse(JSON.stringify({ version: 1, state: s })),
    )!;
    expect(restored).toEqual(s);
    expect(() =>
      applyAction(restored, { type: "opening-roll", playerId: "player-0" }),
    ).toThrow();
    s = act(restored, "opening-roll", 0.6);
    expect(s.currentPlayerIndex).toBe(2);
    s.opening!.candidateIds = ["missing"];
    expect(parseSnapshot({ version: 1, state: s })).toBeNull();
  });
  it("keeps legacy saved matches playable without requiring another opening", () => {
    const s = createGame(
      [
        { name: "A", token: "pumpkin" },
        { name: "B", token: "ghost" },
      ],
      { skipOpening: true },
    );
    delete s.opening;
    expect(parseSnapshot({ version: 1, state: s })).toEqual(s);
    expect(act(s, "roll").revision).toBe(1);
  });
});
