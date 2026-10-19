import {
  Suspense,
  Component,
  useRef,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BOARD, TOKENS } from "../engine/boardData";
import type { GameState } from "../engine/types";
import BoardTile from "./BoardTile";
import PlayerToken from "./PlayerToken";
import CameraRig from "./CameraRig";
import type { Cinematic, Movement } from "../presentation/motion";
class BoardBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function House({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <group position={[x, 0.13, z]} scale={scale}>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.62, 0.7, 0.65]} />
        <meshStandardMaterial color="#53624b" />
      </mesh>
      <mesh position={[0, 0.9, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.6, 0.55, 4]} />
        <meshStandardMaterial color="#343d32" />
      </mesh>
      <mesh position={[0, 0.42, 0.331]}>
        <planeGeometry args={[0.18, 0.25]} />
        <meshBasicMaterial color="#efb86c" />
      </mesh>
    </group>
  );
}
export default function GameBoard({
  state,
  onSelect,
  topDown,
  motion,
  cinematic,
  reducedMotion,
}: {
  state: GameState;
  onSelect: (id: number) => void;
  topDown: boolean;
  motion: Movement | null;
  cinematic: Cinematic | null;
  reducedMotion: boolean;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const fallback = (
    <div className="flat-board">
      {BOARD.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          style={{ borderTopColor: s.color }}
        >
          {s.id}. {s.name}
          <br />
          {state.players
            .filter((p) => p.position === s.id && !p.bankrupt)
            .map((p) => TOKENS[p.token].icon)
            .join(" ")}
        </button>
      ))}
    </div>
  );
  return (
    <BoardBoundary fallback={fallback}>
      <Suspense fallback={<div className="loading">Opening the gates…</div>}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: topDown ? [0, 19, 0.01] : [11, 15, 14], fov: 40 }}
          fallback={fallback}
        >
          <color attach="background" args={["#566044"]} />
          <CameraRig
            topDown={topDown}
            motion={motion}
            cinematic={cinematic}
            state={state}
            reducedMotion={reducedMotion}
            controls={controls}
          />
          <ambientLight intensity={1.7} />
          <mesh
            position={[0, -0.42, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#566044" roughness={1} />
          </mesh>
          <directionalLight
            position={[5, 12, 3]}
            intensity={2.3}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <mesh position={[0, -0.23, 0]} receiveShadow>
            <boxGeometry args={[11.4, 0.32, 11.4]} />
            <meshStandardMaterial color="#424c38" roughness={0.95} />
          </mesh>
          <mesh
            position={[0, -0.055, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[9, 9]} />
            <meshStandardMaterial color="#697452" roughness={1} />
          </mesh>
          {BOARD.map((space) => {
            const owner = state.players.find(
              (p) => p.id === state.properties[space.id]?.ownerId,
            );
            return (
              <BoardTile
                key={space.id}
                space={space}
                ownerColor={owner ? TOKENS[owner.token].color : undefined}
                onSelect={() => onSelect(space.id)}
              />
            );
          })}
          <House x={-1.2} z={-0.7} scale={1.5} />
          <House x={0.2} z={-1.2} scale={2} />
          <House x={1.5} z={-0.4} />
          {[-3.3, 3.3].flatMap((x) =>
            [-2.8, 2.8].map((z) => (
              <group key={`${x}${z}`} position={[x, 0.1, z]}>
                <mesh position={[0, 0.25, 0]}>
                  <cylinderGeometry args={[0.06, 0.09, 0.5, 6]} />
                  <meshStandardMaterial color="#5c4937" />
                </mesh>
                <mesh position={[0, 0.75, 0]}>
                  <coneGeometry args={[0.4, 1.2, 6]} />
                  <meshStandardMaterial color="#344d36" />
                </mesh>
              </group>
            )),
          )}
          {state.players.map((p, i) =>
            !p.bankrupt || motion?.playerId === p.id ? (
              <PlayerToken
                key={p.id}
                player={p}
                index={i}
                movement={state.movement}
                motion={motion}
                reducedMotion={reducedMotion}
                spotlight={
                  cinematic?.stage === "introductions" && cinematic.index === i
                }
                introducing={cinematic?.stage === "introductions"}
              />
            ) : null,
          )}
          <OrbitControls
            ref={controls}
            makeDefault
            enablePan={false}
            minDistance={2}
            maxDistance={80}
            minPolarAngle={0.05}
            maxPolarAngle={Math.PI / 2.4}
            target={[0, 0, 0]}
            enableDamping
            dampingFactor={0.08}
          />
        </Canvas>
      </Suspense>
    </BoardBoundary>
  );
}
