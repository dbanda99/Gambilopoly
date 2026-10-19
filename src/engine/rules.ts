import { BOARD } from "./boardData";
import type { GameState } from "./types";
export function rentFor(state: GameState, id: number): number {
  const space = BOARD[id],
    property = state.properties[id];
  if (!property?.ownerId || property.mortgaged) return 0;
  const owned = BOARD.filter(
    (s) =>
      s.type === space.type &&
      state.properties[s.id]?.ownerId === property.ownerId,
  );
  if (space.type === "railroad") return 25 * 2 ** (owned.length - 1);
  if (space.type === "utility")
    return (
      (state.dice?.reduce((a, b) => a + b, 0) ?? 0) *
      (owned.length === 2 ? 10 : 4)
    );
  const group = BOARD.filter((s) => s.group === space.group);
  if (property.buildings > 0) return space.rent?.[property.buildings] ?? 0;
  return (
    (space.rent?.[0] ?? 0) *
    (group.every((s) => state.properties[s.id].ownerId === property.ownerId)
      ? 2
      : 1)
  );
}
