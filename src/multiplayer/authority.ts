import type { Action, GameState } from "../engine/types";
import { actionSchema } from "./protocol";
export function authorizeAction(
  game: GameState,
  input: unknown,
  actor: string,
  hostId: string,
  revision: number,
  system = false,
): Action {
  const action = actionSchema.parse(input),
    current = game.players[game.currentPlayerIndex];
  if (revision !== game.revision)
    throw Error("The game changed. Please try again.");
  if (["advance-intro", "skip-intro", "begin"].includes(action.type)) {
    if (actor !== hostId)
      throw Error("Only the host controls the introduction.");
    return { ...action, playerId: current.id };
  }
  if (
    action.playerId !== actor ||
    current.id !== actor ||
    (!system && current.bot)
  )
    throw Error("It is another player’s turn.");
  return action;
}
