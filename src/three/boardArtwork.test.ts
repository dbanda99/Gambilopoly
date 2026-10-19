import { expect, it } from "vitest";
import { existsSync } from "node:fs";
import {
  BOARD,
  boardPosition,
  TILE_DEPTH,
  TILE_WIDTH,
  CENTER_SIZE,
  BOARD_SIZE,
} from "../engine/boardData";
import { artworkFor } from "./boardArtwork";
it("maps every space to a supplied board template", () => {
  for (const tile of BOARD) {
    expect(
      existsSync(artworkFor(tile).replace('/assets/board/', '2d-textures/')),
      `${tile.name}: ${artworkFor(tile)}`,
    ).toBe(true);
  }
  expect(new Set(BOARD.map(artworkFor)).size).toBe(19);
});
it("fits nine rectangular tiles exactly between square corners, preserving the art aspect", () => {
  expect(TILE_WIDTH / TILE_DEPTH).toBeCloseTo(307 / 512);
  expect(CENTER_SIZE + 2 * TILE_DEPTH).toBeCloseTo(BOARD_SIZE);
  expect(boardPosition(1)[0] + TILE_WIDTH / 2).toBeCloseTo(5 - TILE_DEPTH / 2);
  expect(boardPosition(9)[0] - TILE_WIDTH / 2).toBeCloseTo(-5 + TILE_DEPTH / 2);
  expect(boardPosition(0)).toEqual([5, 5]);
  expect(boardPosition(10)).toEqual([-5, 5]);
});
