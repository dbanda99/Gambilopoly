import { expect, it } from "vitest";
import { Quaternion, Vector3 } from "three";
import {
  DIE_FACE_NORMALS,
  DICE_SECONDS,
  THROW_SECONDS,
  SETTLE_SECONDS,
  PICKUP_SECONDS,
  diceStage,
} from "./diceRoll";
it("settles before pickup, shows the result, and finishes before movement", () => {
  expect(diceStage(0.2)).toBe("throw");
  expect(diceStage(THROW_SECONDS + 0.1)).toBe("settled");
  expect(diceStage(THROW_SECONDS + SETTLE_SECONDS + 0.1)).toBe("pickup");
  expect(diceStage(THROW_SECONDS + SETTLE_SECONDS + PICKUP_SECONDS + 0.1)).toBe(
    "result",
  );
  expect(diceStage(DICE_SECONDS)).toBe("done");
});
it("orients each verified pip face upward on the board and toward the camera in hand", () => {
  for (let value = 1; value <= 6; value++) {
    const normal = new Vector3(...DIE_FACE_NORMALS[value]);
    for (const target of [new Vector3(0, 1, 0), new Vector3(0, 0, 1)])
      expect(
        normal
          .clone()
          .applyQuaternion(new Quaternion().setFromUnitVectors(normal, target))
          .distanceTo(target),
      ).toBeLessThan(1e-6);
  }
});
