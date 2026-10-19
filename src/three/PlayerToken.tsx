import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { boardPosition, TOKENS } from "../engine/boardData";
import type { GameState, Player } from "../engine/types";
export default function PlayerToken({
  player,
  index,
  movement,
}: {
  player: Player;
  index: number;
  movement: GameState["movement"];
}) {
  const ref = useRef<Group>(null);
  const progress = useRef({ revision: -1, step: 0 });
  useFrame((_, delta) => {
    if (!ref.current) return;
    let position = player.position;
    if (movement?.playerId === player.id) {
      if (progress.current.revision !== movement.revision)
        progress.current = { revision: movement.revision, step: 0 };
      progress.current.step = Math.min(
        movement.steps,
        progress.current.step + delta * 5,
      );
      position = movement.from + progress.current.step;
    }
    const n = Math.floor(position),
      f = position - n,
      [x, z] = boardPosition(n),
      [nx, nz] = boardPosition(n + 1);
    ref.current.position.set(
      x + (nx - x) * f + (index % 2 ? 0.17 : -0.17),
      0.33 + Math.sin(f * Math.PI) * 0.18,
      z + (nz - z) * f + (index < 2 ? 0.16 : -0.16),
    );
  });
  const color = TOKENS[player.token].color;
  return (
    <group ref={ref}>
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
