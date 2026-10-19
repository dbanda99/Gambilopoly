import { describe, expect, it } from "vitest";
import { createGame } from "./gameState";
import { applyAction } from "./reducer";
import { BOARD, boardPosition } from "./boardData";
import { rentFor } from "./rules";
import type { Action, GameState } from "./types";
const game = () =>
  createGame(
    [
      { name: "Pumpkin", token: "pumpkin" },
      { name: "Ghost", token: "ghost" },
    ],
    { skipOpening: true },
  );
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};
const act = (
  s: GameState,
  type: Action["type"],
  random = sequence(0.01, 0.2),
) =>
  applyAction(
    s,
    { type, playerId: s.players[s.currentPlayerIndex].id },
    random,
  );
describe("board configuration", () => {
  it("has 40 unique spaces and positions around an 11 × 11 perimeter", () => {
    expect(BOARD).toHaveLength(40);
    expect(new Set(BOARD.map((s) => s.id)).size).toBe(40);
    expect(new Set(BOARD.map((s) => boardPosition(s.id).join(","))).size).toBe(
      40,
    );
    expect(BOARD.filter((s) => s.type === "property")).toHaveLength(22);
    expect(BOARD.filter((s) => s.price)).toHaveLength(28);
  });
  it("rejects duplicate tokens, empty names, and invalid player counts", () => {
    expect(() =>
      createGame([
        { name: "", token: "pumpkin" },
        { name: "B", token: "ghost" },
      ]),
    ).toThrow();
    expect(() =>
      createGame([
        { name: "A", token: "ghost" },
        { name: "B", token: "ghost" },
      ]),
    ).toThrow();
    expect(() => createGame([{ name: "A", token: "pumpkin" }])).toThrow();
  });
});
describe("validated transitions", () => {
  it("rejects the wrong actor and out-of-phase actions without mutating state", () => {
    const s = game(),
      copy = structuredClone(s);
    expect(() =>
      applyAction(s, { type: "roll", playerId: "player-1" }),
    ).toThrow();
    expect(() => act(s, "buy")).toThrow();
    expect(() => act(s, "end")).toThrow();
    expect(s).toEqual(copy);
  });
  it("rolls, moves, buys, records ownership and changes turns", () => {
    const initial = game();
    const moved = act(initial, "roll");
    expect(moved.dice).toEqual([1, 2]);
    expect(moved.players[0].position).toBe(3);
    expect(moved.phase).toBe("purchase");
    expect(initial.players[0].position).toBe(0);
    const bought = act(moved, "buy");
    expect(bought.players[0].money).toBe(1440);
    expect(bought.properties[3].ownerId).toBe("player-0");
    expect(bought.players[0].propertyIds).toEqual([3]);
    expect(act(bought, "end").currentPlayerIndex).toBe(1);
    expect(() => act(bought, "buy")).toThrow();
  });
  it("rejects unaffordable purchases and permits passing", () => {
    let s = game();
    s.players[0].money = 10;
    s = act(s, "roll");
    expect(() => act(s, "buy")).toThrow();
    expect(act(s, "pass").phase).toBe("end");
  });
  it("pays rent to the owner and doubles it for complete color groups", () => {
    let s = game();
    s.properties[3].ownerId = "player-1";
    s.players[1].propertyIds = [3];
    s = act(s, "roll");
    expect(s.players.map((p) => p.money)).toEqual([1496, 1504]);
    s.properties[1].ownerId = "player-1";
    expect(rentFor(s, 3)).toBe(8);
    s.properties[3].mortgaged = true;
    expect(rentFor(s, 3)).toBe(0);
  });
  it("scales railroad and utility rent by owned count", () => {
    const s = game();
    s.properties[5].ownerId = "player-0";
    expect(rentFor(s, 5)).toBe(25);
    s.properties[15].ownerId = "player-0";
    expect(rentFor(s, 5)).toBe(50);
    s.properties[12].ownerId = "player-0";
    s.dice = [3, 4];
    expect(rentFor(s, 12)).toBe(28);
    s.properties[28].ownerId = "player-0";
    expect(rentFor(s, 12)).toBe(70);
  });
  it("awards $200 passing start and applies tax", () => {
    let s = game();
    s.players[0].position = 38;
    s = act(s, "roll");
    expect(s.players[0].position).toBe(1);
    expect(s.players[0].money).toBe(1700);
    let tax = game();
    tax.players[0].position = 1;
    tax = act(tax, "roll");
    expect(tax.players[0].money).toBe(1300);
  });
  it("draws configurable cash cards", () => {
    const s = act(game(), "roll", sequence(0.01, 0.01, 0));
    expect(s.players[0].position).toBe(2);
    expect(s.players[0].money).toBe(1600);
  });
  it("grants a doubles turn and sends the third double to jail", () => {
    let s = game();
    for (let i = 0; i < 3; i++) {
      s = act(s, "roll", () => 0.01);
      if (s.phase === "purchase") s = act(s, "pass");
      if (i < 2) {
        s = act(s, "end");
        expect(s.currentPlayerIndex).toBe(0);
      }
    }
    expect(s.players[0].position).toBe(10);
    expect(s.players[0].inJail).toBe(true);
    expect(s.extraTurn).toBe(false);
    expect(act(s, "end").currentPlayerIndex).toBe(1);
  });
  it("supports bail and jail doubles without another extra turn", () => {
    let s = game();
    s.players[0].inJail = true;
    s.players[0].position = 10;
    s = act(s, "bail");
    expect(s.players[0].money).toBe(1450);
    expect(s.players[0].inJail).toBe(false);
    let j = game();
    j.players[0].inJail = true;
    j.players[0].position = 10;
    j = act(j, "roll", () => 0.01);
    expect(j.players[0].position).toBe(12);
    expect(j.players[0].inJail).toBe(false);
    expect(j.extraTurn).toBe(false);
  });
  it("forces a $50 release on the third failed jail roll", () => {
    let s = game();
    s.players[0].inJail = true;
    s.players[0].jailTurns = 2;
    s.players[0].position = 10;
    s = act(s, "roll");
    expect(s.players[0].position).toBe(13);
    expect(s.players[0].money).toBe(1450);
    expect(s.players[0].inJail).toBe(false);
  });
  it("transfers assets to a creditor on bankruptcy and declares a winner", () => {
    let s = game();
    s.players[0].money = 1;
    s.players[0].propertyIds = [1];
    s.properties[1].ownerId = "player-0";
    s.properties[3].ownerId = "player-1";
    s.players[1].propertyIds = [3];
    s = act(s, "roll");
    expect(s.status).toBe("finished");
    expect(s.players[0].bankrupt).toBe(true);
    expect(s.properties[1].ownerId).toBe("player-1");
    expect(s.players[1].propertyIds).toContain(1);
    expect(s.players[0].money).toBe(0);
    expect(() => act(s, "roll")).toThrow();
  });
  it("preserves invariants through long simulations and finishes via elimination", () => {
    for (let seed = 1; seed <= 5; seed++) {
      let n = seed;
      const random = () => {
        n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
        return n / 4294967296;
      };
      let s = game();
      let steps = 0;
      while (s.status === "playing" && steps++ < 1000) {
        s = act(
          s,
          s.phase === "roll"
            ? "roll"
            : s.phase === "purchase"
              ? s.players[s.currentPlayerIndex].money >=
                BOARD[s.players[s.currentPlayerIndex].position].price!
                ? "buy"
                : "pass"
              : "end",
          random,
        );
        for (const p of s.players) {
          expect(p.money).toBeGreaterThanOrEqual(0);
          for (const id of p.propertyIds)
            expect(s.properties[id].ownerId).toBe(p.id);
        }
        expect(s.revision).toBe(steps);
      }
      while (s.status === "playing") s = act(s, "resign");
      expect(s.status).toBe("finished");
    }
  });
});
