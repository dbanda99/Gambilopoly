export const THROW_SECONDS = 1.35;
export const SETTLE_SECONDS = 0.35;
export const PICKUP_SECONDS = 0.7;
export const RESULT_SECONDS = 1.05;
export const EXIT_SECONDS = 0.35;
export const DICE_SECONDS =
  THROW_SECONDS +
  SETTLE_SECONDS +
  PICKUP_SECONDS +
  RESULT_SECONDS +
  EXIT_SECONDS;
export interface RollPresentation {
  dice: [number, number];
  playerId: string;
  revision: number;
  purpose: "opening" | "turn";
  startedAt: number;
}
export function diceStage(elapsed: number) {
  if (elapsed < THROW_SECONDS) return "throw";
  if (elapsed < THROW_SECONDS + SETTLE_SECONDS) return "settled";
  if (elapsed < THROW_SECONDS + SETTLE_SECONDS + PICKUP_SECONDS)
    return "pickup";
  if (elapsed < DICE_SECONDS - EXIT_SECONDS) return "result";
  if (elapsed < DICE_SECONDS) return "exit";
  return "done";
}
// Verified from the 21 separate black pip meshes in the supplied ivory OBJ.
export const DIE_FACE_NORMALS: Record<number, [number, number, number]> = {
  1: [0, 0, -1],
  2: [1, 0, 0],
  3: [0, -1, 0],
  4: [0, 1, 0],
  5: [-1, 0, 0],
  6: [0, 0, 1],
};
