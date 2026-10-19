import { BOARD } from "./boardData";
import type { GameState, Token } from "./types";
export function createGame(names: { name: string; token: Token }[]): GameState {
  if (
    names.length < 2 ||
    names.length > 4 ||
    new Set(names.map((p) => p.token)).size !== names.length ||
    names.some((p) => !p.name.trim())
  )
    throw new Error(
      "Choose 2–4 players with different tokens and a name each.",
    );
  return {
    id: crypto.randomUUID(),
    players: names.map((p, i) => ({
      id: `player-${i}`,
      name: p.name.trim().slice(0, 24),
      token: p.token,
      position: 0,
      money: 1500,
      propertyIds: [],
      inJail: false,
      jailTurns: 0,
      bankrupt: false,
    })),
    currentPlayerIndex: 0,
    phase: "roll",
    properties: Object.fromEntries(
      BOARD.filter((s) => s.price).map((s) => [
        s.id,
        { ownerId: null, buildings: 0, mortgaged: false },
      ]),
    ),
    dice: null,
    revision: 0,
    status: "playing",
    doubles: 0,
    extraTurn: false,
    log: ["The gates are open. Everyone starts with $1,500."],
    movement: null,
  };
}
