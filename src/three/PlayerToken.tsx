import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { boardPosition, TOKENS } from "../engine/boardData";
import type { GameState, Player } from "../engine/types";
import { sampleMovement, type Movement } from "../presentation/motion";
export default function PlayerToken({
  player,
  index,
  movement,
  motion,
  spotlight = false,
  introducing = false,
  reducedMotion = false,
}: {
  player: Player;
  index: number;
  movement: GameState["movement"];
  motion: Movement | null;
  spotlight?: boolean;
  introducing?: boolean;
  reducedMotion?: boolean;
}) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const frame =
      motion?.playerId === player.id
        ? sampleMovement(motion, performance.now(), reducedMotion)
        : null;
    const [x, z] = boardPosition(player.position);
    ref.current.position.set(
      (frame && !frame.done ? frame.x : x) + (index % 2 ? 0.17 : -0.17),
      0.33 + (frame?.hop ?? 0),
      (frame && !frame.done ? frame.z : z) + (index < 2 ? 0.16 : -0.16),
    );
    const scale =
      ref.current.scale.x +
      ((spotlight ? 1.3 : introducing ? 0.55 : 1) - ref.current.scale.x) *
        (1 - Math.exp(-delta * 7));
    ref.current.scale.setScalar(scale);
  });
  const color = TOKENS[player.token].color;
  return (
    <group ref={ref}>
      {spotlight && (
        <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.24, 0.31, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.65} />
        </mesh>
      )}
      <mesh position={[0, -0.13, 0]}>
        <cylinderGeometry args={[0.19, 0.23, 0.09, 20]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {player.token === "witch" ? (
        <>
          <mesh position={[0, 0.13, 0]}>
            <coneGeometry args={[0.17, 0.5, 16]} />
            <meshStandardMaterial color="#8771a8" />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.26, 0.26, 0.035, 20]} />
            <meshStandardMaterial color="#65527e" />
          </mesh>
        </>
      ) : (
        <>
          <mesh
            scale={player.token === "ghost" ? [0.85, 1.2, 0.85] : [1, 0.9, 1]}
          >
            <sphereGeometry args={[0.22, 16, 12]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {[-0.075, 0.075].map((x) => (
            <mesh key={x} position={[x, 0.04, 0.18]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#211b22" />
            </mesh>
          ))}
          {player.token === "pumpkin" && (
            <mesh position={[0, 0.23, 0]} rotation={[0.2, 0, 0.2]}>
              <cylinderGeometry args={[0.03, 0.035, 0.13, 6]} />
              <meshStandardMaterial color="#6e8750" />
            </mesh>
          )}
          {player.token === "vampire" &&
            [-1, 1].map((x) => (
              <mesh
                key={x}
                position={[x * 0.24, 0, 0]}
                rotation={[0, 0, x * -0.5]}
              >
                <coneGeometry args={[0.16, 0.36, 3]} />
                <meshStandardMaterial color={color} />
              </mesh>
            ))}
        </>
      )}
    </group>
  );
}
