import { BOARD } from "./boardData";
import { buildingError } from "./buildings";
import type { Action, GameState } from "./types";
export function botAction(s: GameState): Action | null {
  const p = s.players[s.currentPlayerIndex];
  if (!p?.bot || s.status !== "playing") return null;
  const action = (
    type: Exclude<Action["type"], "build" | "sell-building">,
  ): Action => ({ type, playerId: p.id });
  if (s.phase === "opening")
    return s.opening?.stage === "order" ? action("opening-roll") : null;
  if (s.phase === "card") return action("ack-card");
  if (s.phase === "purchase")
    return action(p.money - BOARD[p.position].price! >= 120 ? "buy" : "pass");
  if (s.phase === "roll") return action("roll");
  if (s.phase === "end") {
    const id =
      p.money > 400
        ? p.propertyIds.find((id) => !buildingError(s, p.id, id))
        : undefined;
    if (id !== undefined) return { type: "build", playerId: p.id, spaceId: id };
    return action("end");
  }
  return null;
}
