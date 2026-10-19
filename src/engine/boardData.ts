import data from "../data/properties.json";
import type { BoardSpace } from "./types";
const propertyPositions = [
  1, 3, 6, 8, 9, 11, 13, 14, 16, 18, 19, 21, 23, 24, 26, 27, 29, 31, 32, 34, 37,
  39,
];
const special: Record<number, Partial<BoardSpace>> = {
  0: { name: "Witching Hour", type: "corner" },
  2: { name: "Trick or Treat", type: "community" },
  4: { name: "Candy Tax", type: "tax", amount: 200 },
  5: { name: "Phantom Express", type: "railroad", price: 200, rent: [25] },
  7: { name: "Fate & Fortune", type: "chance" },
  10: { name: "The Dungeon", type: "corner" },
  12: { name: "Moonlight Power", type: "utility", price: 150, rent: [4] },
  15: { name: "Midnight Express", type: "railroad", price: 200, rent: [25] },
  17: { name: "Trick or Treat", type: "community" },
  20: { name: "Rest in Peace", type: "corner" },
  22: { name: "Fate & Fortune", type: "chance" },
  25: { name: "Specter Express", type: "railroad", price: 200, rent: [25] },
  28: { name: "Witching Water", type: "utility", price: 150, rent: [4] },
  30: { name: "Go to Dungeon", type: "corner" },
  33: { name: "Trick or Treat", type: "community" },
  35: { name: "Raven Express", type: "railroad", price: 200, rent: [25] },
  36: { name: "Fate & Fortune", type: "chance" },
  38: { name: "Moon Tax", type: "tax", amount: 100 },
};
export const BOARD: BoardSpace[] = Array.from({ length: 40 }, (_, id) => {
  const index = propertyPositions.indexOf(id);
  if (index >= 0) {
    const [name, price, rent, group, color] = data[index];
    return {
      id,
      name: String(name),
      type: "property",
      price: Number(price),
      rent: [Number(rent)],
      group: String(group),
      color: String(color),
    };
  }
  return { id, ...special[id] } as BoardSpace;
});
export function boardPosition(id: number): [number, number] {
  const n = ((id % 40) + 40) % 40;
  if (n <= 10) return [5 - n, 5];
  if (n <= 20) return [-5, 15 - n];
  if (n <= 30) return [n - 25, -5];
  return [5, n - 35];
}
export const TOKENS = {
  pumpkin: { icon: "🎃", label: "Pumpkin", color: "#f0a35c" },
  ghost: { icon: "👻", label: "Ghost", color: "#9dccbd" },
  vampire: { icon: "🦇", label: "Vampire", color: "#bb9de0" },
  witch: { icon: "🧙", label: "Witch", color: "#da91a2" },
};
