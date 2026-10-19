import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
import type { OrbitControls } from "@react-three/drei";
import type { ComponentRef, RefObject } from "react";
import type { GameState } from "../engine/types";
import { boardPosition } from "../engine/boardData";
import {
  sampleMovement,
  smooth,
  TOUR_SECONDS,
  type Cinematic,
  type Movement,
} from "../presentation/motion";

export default function CameraRig({
  topDown,
  motion,
  cinematic,
  state,
  reducedMotion,
  controls,
}: {
  topDown: boolean;
  motion: Movement | null;
  cinematic: Cinematic | null;
  state: GameState;
  reducedMotion: boolean;
  controls: RefObject<ComponentRef<typeof OrbitControls> | null>;
}) {
  const { camera, size } = useThree();
  const initialized = useRef(false),
    manual = useRef(false),
    settled = useRef(0);
  const eye = useRef(new Vector3()),
    target = useRef(new Vector3());
  useEffect(() => {
    manual.current = false;
    settled.current = 0;
  }, [
    topDown,
    motion?.revision,
    cinematic?.stage,
    cinematic?.index,
    state.opening?.stage,
    size.width,
    size.height,
  ]);
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const start = () => {
      manual.current = true;
    };
    orbit.addEventListener("start", start);
    return () => orbit.removeEventListener("start", start);
  }, [controls]);
  useFrame((_, delta) => {
    const c = camera as PerspectiveCamera,
      orbit = controls.current;
    if (!orbit) return;
    const portrait = size.height > size.width;
    const widthFraction = Math.max(
      0.35,
      (size.width - (portrait ? 20 : size.height < 540 ? 200 : 280)) /
        size.width,
    );
    const heightFraction = Math.max(
      0.25,
      (size.height - (portrait ? 380 : size.height < 540 ? 105 : 190)) /
        size.height,
    );
    const tangent = Math.tan((c.fov * Math.PI) / 360);
    const fit = Math.max(
      6.8 / (tangent * c.aspect * widthFraction),
      6.6 / (tangent * heightFraction),
    );
    const direction = topDown
      ? new Vector3(0, 1, 0.001)
      : new Vector3(0.55, 1, 0.8).normalize();
    const nextTarget = new Vector3(),
      nextEye = direction.multiplyScalar(fit);
    const now = performance.now();
    const movement = motion ? sampleMovement(motion, now, reducedMotion) : null;
    const automatic = !!cinematic || (!!movement && !movement.done);
    if (cinematic && !reducedMotion) {
      const elapsed = (now - cinematic.startedAt) / 1000;
      if (cinematic.stage === "tour") {
        const angle = -0.7 + Math.PI * 2 * smooth(elapsed / TOUR_SECONDS);
        nextEye.set(
          Math.sin(angle) * fit * 0.65,
          fit * 0.62,
          Math.cos(angle) * fit * 0.65,
        );
      } else {
        const p = state.players[cinematic.index];
        const [x, z] = boardPosition(p.position);
        nextTarget.set(
          x + (cinematic.index % 2 ? 0.17 : -0.17),
          0.3,
          z + (cinematic.index < 2 ? 0.16 : -0.16),
        );
        nextEye.copy(nextTarget).add(new Vector3(1.7, 1.7, 2.6));
      }
    } else if (movement && motion && !movement.done) {
      const i = state.players.findIndex((p) => p.id === motion.playerId);
      const follow = new Vector3(
        movement.x + (i % 2 ? 0.17 : -0.17),
        0.3,
        movement.z + (i < 2 ? 0.16 : -0.16),
      );
      const close = follow
        .clone()
        .add(
          new Vector3(0.45, 1, 0.8)
            .normalize()
            .multiplyScalar(portrait ? 10 : 8),
        );
      nextTarget.lerp(follow, movement.cameraWeight);
      nextEye.lerp(close, movement.cameraWeight);
    }
    orbit.enabled = !automatic;
    if (manual.current && !automatic) return;
    if (!automatic && settled.current >= 2) return;
    const factor =
      !initialized.current || reducedMotion
        ? 1
        : 1 - Math.exp(-Math.min(delta, 0.1) * 5);
    eye.current.copy(c.position).lerp(nextEye, factor);
    target.current.copy(orbit.target).lerp(nextTarget, factor);
    c.position.copy(eye.current);
    orbit.target.copy(target.current);
    const offsetX = portrait ? 0 : size.height < 540 ? -40 : -65,
      offsetY = portrait ? -6 : size.height < 540 ? -28 : topDown ? -35 : -75;
    c.setViewOffset(
      size.width,
      size.height,
      -offsetX,
      -offsetY,
      size.width,
      size.height,
    );
    c.updateProjectionMatrix();
    orbit.update();
    initialized.current = true;
    if (
      !automatic &&
      c.position.distanceTo(nextEye) < 0.015 &&
      orbit.target.distanceTo(nextTarget) < 0.015
    )
      settled.current++;
  });
  return null;
}
