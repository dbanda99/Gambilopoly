import { Suspense, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Euler, Group, Quaternion, Vector3 } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  DIE_FACE_NORMALS,
  DICE_SECONDS,
  EXIT_SECONDS,
  THROW_SECONDS,
  SETTLE_SECONDS,
  PICKUP_SECONDS,
  type RollPresentation,
} from "../presentation/diceRoll";
import { smooth } from "../presentation/motion";
import { assetUrl } from "../utils/assetUrl";
function Die({
  roll,
  index,
  reducedMotion,
}: {
  roll: RollPresentation;
  index: number;
  reducedMotion: boolean;
}) {
  const gltf = useGLTF(assetUrl("/assets/tabletop/dice.glb")),
    scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const ref = useRef<Group>(null);
  const { camera, size } = useThree();
  const value = roll.dice[index],
    normal = useMemo(() => new Vector3(...DIE_FACE_NORMALS[value]), [value]);
  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const t = Math.max(0, (performance.now() - roll.startedAt) / 1000);
    group.visible = t < DICE_SECONDS;
    if (!group.visible) return;
    const sign = index ? 1 : -1,
      u = Math.min(1, t / THROW_SECONDS);
    const settled = new Vector3(sign * 0.8, 0.39, 0.35 + index * 0.5);
    const boardPosition = new Vector3(
      sign * (2.8 - 2 * u),
      0.39 +
        (reducedMotion
          ? 0
          : Math.sin(u * Math.PI) * 1.7 +
            Math.abs(Math.sin(u * Math.PI * 4)) * 0.35 * (1 - u)),
      -2.5 + (2.85 + index * 0.5) * u,
    );
    if (u >= 1) boardPosition.copy(settled);
    const faceUp = new Quaternion().setFromUnitVectors(
      normal,
      new Vector3(0, 1, 0),
    );
    let rotation = faceUp.clone();
    if (!reducedMotion && u < 1) {
      const spin = new Quaternion().setFromEuler(
        new Euler(
          1.7 + u * Math.PI * 8,
          sign * (0.4 + u * Math.PI * 6),
          u * Math.PI * 5,
        ),
      );
      rotation.copy(spin).slerp(faceUp, smooth((u - 0.68) / 0.32));
    }
    const pickup = smooth(
      (t - THROW_SECONDS - SETTLE_SECONDS) / PICKUP_SECONDS,
    );
    const distance = 4,
      spacing = size.height > size.width ? 0.34 : 0.56;
    const forward = camera.getWorldDirection(new Vector3());
    const ray = new Vector3(0, 0, 0.5).unproject(camera).sub(camera.position);
    const inHand = ray
      .multiplyScalar(distance / ray.dot(forward))
      .add(camera.position)
      .addScaledVector(
        new Vector3(1, 0, 0).applyQuaternion(camera.quaternion),
        sign * spacing,
      );
    const facing = camera.quaternion
      .clone()
      .multiply(
        new Quaternion().setFromUnitVectors(normal, new Vector3(0, 0, 1)),
      );
    group.position
      .copy(boardPosition)
      .lerp(inHand, reducedMotion ? (pickup > 0 ? 1 : 0) : pickup);
    group.quaternion
      .copy(rotation)
      .slerp(facing, reducedMotion ? (pickup > 0 ? 1 : 0) : pickup);
    const exit = smooth((t - (DICE_SECONDS - EXIT_SECONDS)) / EXIT_SECONDS);
    const scale =
      (0.3 + pickup * (size.height > size.width ? -0.04 : 0.08)) * (1 - exit);
    group.scale.setScalar(scale);
  });
  return (
    <group ref={ref} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}
export default function DiceScene({
  roll,
  reducedMotion,
}: {
  roll: RollPresentation | null;
  reducedMotion: boolean;
}) {
  if (!roll) return null;
  return (
    <Suspense fallback={null}>
      <Die
        key={`${roll.revision}-0`}
        roll={roll}
        index={0}
        reducedMotion={reducedMotion}
      />
      <Die
        key={`${roll.revision}-1`}
        roll={roll}
        index={1}
        reducedMotion={reducedMotion}
      />
    </Suspense>
  );
}
useGLTF.preload(assetUrl("/assets/tabletop/dice.glb"));
