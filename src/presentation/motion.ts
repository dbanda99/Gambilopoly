import { boardPosition } from "../engine/boardData";
import type { GameState } from "../engine/types";
export type Movement = NonNullable<GameState["movement"]> & {
  startedAt: number;
};
import { DICE_SECONDS } from "./diceRoll";
export { DICE_SECONDS } from "./diceRoll";
export const APPROACH_SECONDS = 0.65;
export const STEP_SECONDS = 0.32;
export const LANDING_SECONDS = 0.8;
export const RETURN_SECONDS = 1.15;
export const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
export function movementDuration(steps: number) {
  return (
    DICE_SECONDS +
    APPROACH_SECONDS +
    steps * STEP_SECONDS +
    LANDING_SECONDS +
    RETURN_SECONDS
  );
}
export function sampleMovement(
  motion: Movement,
  now: number,
  reducedMotion = false,
) {
  const elapsed = Math.max(0, (now - motion.startedAt) / 1000);
  const walkingStart = DICE_SECONDS + APPROACH_SECONDS;
  const landing = walkingStart + motion.steps * STEP_SECONDS;
  const returnStart = landing + LANDING_SECONDS;
  const done = elapsed >= movementDuration(motion.steps);
  const step = Math.max(
    0,
    Math.min(motion.steps, (elapsed - walkingStart) / STEP_SECONDS),
  );
  const whole = Math.floor(step),
    fraction = step - whole;
  const [x, z] = boardPosition(motion.from + whole),
    [nx, nz] = boardPosition(motion.from + whole + 1);
  const blend = smooth(fraction);
  return {
    elapsed,
    done,
    rolling: elapsed < DICE_SECONDS,
    traveling: elapsed >= walkingStart && elapsed < landing,
    cameraWeight: reducedMotion
      ? 0
      : smooth((elapsed - DICE_SECONDS) / APPROACH_SECONDS) *
        (1 - smooth((elapsed - returnStart) / RETURN_SECONDS)),
    x: x + (nx - x) * blend,
    z: z + (nz - z) * blend,
    hop: reducedMotion ? 0 : Math.sin(fraction * Math.PI) * 0.16,
  };
}
export interface Cinematic {
  stage: "tour" | "introductions";
  index: number;
  startedAt: number;
}
export const TOUR_SECONDS = 8;
export const PLAYER_SECONDS = 2.8;
