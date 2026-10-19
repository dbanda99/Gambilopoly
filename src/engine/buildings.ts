import { BOARD } from "./boardData";
import config from "../data/buildings.json";
import type { GameState } from "./types";
export function buildingCost(id: number) {
  return (config.costs as Record<string, number>)[BOARD[id]?.group ?? ""] ?? 0;
}
export function buildingSupply(s: GameState) {
  const props = Object.values(s.properties);
  return {
    houses:
      32 - props.reduce((n, p) => n + (p.buildings < 5 ? p.buildings : 0), 0),
    inns: 12 - props.filter((p) => p.buildings === 5).length,
  };
}
export function buildingError(
  s: GameState,
  playerId: string,
  id: number,
  sell = false,
): string | null {
  const tile = BOARD[id],
    p = s.players[s.currentPlayerIndex],
    property = s.properties[id];
  if (s.status !== "playing" || !["roll", "end"].includes(s.phase))
    return "Finish the current roll or card before managing buildings.";
  if (!p || p.id !== playerId || p.bankrupt)
    return "Only the current player can manage buildings.";
  if (tile?.type !== "property" || property?.ownerId !== playerId)
    return "You must own this property.";
  const group = BOARD.filter((t) => t.group === tile.group);
  if (
    group.some(
      (t) =>
        s.properties[t.id].ownerId !== playerId || s.properties[t.id].mortgaged,
    )
  )
    return "Own the complete, unmortgaged color set to build.";
  const levels = group.map((t) => s.properties[t.id].buildings),
    supply = buildingSupply(s);
  if (sell) {
    if (property.buildings === 0) return "There are no buildings to sell.";
    if (property.buildings !== Math.max(...levels))
      return "Sell evenly across the color set.";
    if (property.buildings === 5 && supply.houses < 4)
      return "The bank needs four houses before an inn can be sold.";
  } else {
    if (property.buildings === 5) return "This property already has an inn.";
    if (property.buildings !== Math.min(...levels))
      return "Build evenly across the color set.";
    if (p.money < buildingCost(id))
      return "You do not have enough money for this upgrade.";
    if (property.buildings < 4 && supply.houses < 1)
      return "The bank has no houses left.";
    if (property.buildings === 4 && supply.inns < 1)
      return "The bank has no inns left.";
  }
  return null;
}
