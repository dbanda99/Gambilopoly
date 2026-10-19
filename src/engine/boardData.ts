import data from "../data/properties.json";
import buildingData from "../data/buildings.json";
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
      rent: (buildingData.rents as Record<string, number[]>)[String(id)] ?? [
        Number(rent),
      ],
      group: String(group),
      color: String(color),
    };
  }
  return { id, ...special[id] } as BoardSpace;
});
// Nine rectangular spaces fit between the square corners on each side.
// Keep the corner centers at +/-5 so existing camera paths remain compatible.
export const TILE_DEPTH = 10 / (1 + 9 * (307 / 512));
export const TILE_WIDTH = TILE_DEPTH * (307 / 512);
export const BOARD_SIZE = 10 + TILE_DEPTH;
export const CENTER_SIZE = 9 * TILE_WIDTH;
export function boardPosition(id: number): [number, number] {
  const n = ((id % 40) + 40) % 40;
  const along = (coordinate: number) =>
    n % 10 === 0 ? coordinate : coordinate * TILE_WIDTH;
  if (n <= 10) return [along(5 - n), 5];
  if (n <= 20) return [-5, along(15 - n)];
  if (n <= 30) return [along(n - 25), -5];
  return [5, along(n - 35)];
}
export const TOKENS = {
  pumpkin: { icon: "🐈‍⬛", label: "Jack-o’-lantern", color: "#f0a35c" },
  ghost: { icon: "👻", label: "Boo", color: "#9dccbd" },
  vampire: { icon: "🦇", label: "Vex", color: "#bb9de0" },
  witch: { icon: "🧙", label: "Hexie", color: "#da91a2" },
  rattle: { icon: "💀", label: "Rattle", color: "#dacb9c" },
  sparks: { icon: "🎃", label: "Sparks", color: "#b4c478" },
  warps: { icon: "🧟", label: "Warps", color: "#90b4cf" },
};
