import { expect, it } from "vitest";
import { boardPosition } from "../engine/boardData";
import {
  sampleMovement,
  movementDuration,
  DICE_SECONDS,
  APPROACH_SECONDS,
  STEP_SECONDS,
  type Movement,
} from "./motion";
const motion: Movement = {
  playerId: "a",
  from: 38,
  steps: 5,
  revision: 1,
  startedAt: 0,
};
it("holds the token during dice and approach, then follows the perimeter across start", () => {
  expect(sampleMovement(motion, 300).rolling).toBe(true);
  expect(sampleMovement(motion, 1000).x).toBe(boardPosition(38)[0]);
  const start = DICE_SECONDS + APPROACH_SECONDS;
  const corner = sampleMovement(motion, (start + 2 * STEP_SECONDS) * 1000);
  expect(corner.x).toBeCloseTo(5);
  expect(corner.z).toBeCloseTo(5);
  const end = sampleMovement(motion, movementDuration(5) * 1000 + 1);
  expect(end.done).toBe(true);
  expect([end.x, end.z]).toEqual(boardPosition(3));
  expect(end.cameraWeight).toBe(0);
});
it("disables camera movement and hopping under reduced motion", () => {
  const frame = sampleMovement(motion, 2000, true);
  expect(frame.cameraWeight).toBe(0);
  expect(frame.hop).toBe(0);
});
