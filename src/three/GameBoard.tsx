import {
  Suspense,
  Component,
  useRef,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { BOARD, TOKENS, BOARD_SIZE } from "../engine/boardData";
import type { GameState } from "../engine/types";
import BoardTile from "./BoardTile";
import PlayerToken from "./PlayerToken";
import CameraRig from "./CameraRig";
import BoardCenter from "./BoardCenter";
import DiceScene from "./DiceScene";
import PropertyBuildings from "./PropertyBuildings";
import type { RollPresentation } from "../presentation/diceRoll";
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
export default function GameBoard({
  state,
  onSelect,
  topDown,
  motion,
  cinematic,
  reducedMotion,
  rollEvent,
  diceActive,
}: {
  state: GameState;
  onSelect: (id: number) => void;
  topDown: boolean;
  motion: Movement | null;
  cinematic: Cinematic | null;
  reducedMotion: boolean;
  rollEvent: RollPresentation | null;
  diceActive: boolean;
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
          <color attach="background" args={["#292532"]} />
          <CameraRig
            topDown={topDown}
            motion={motion}
            cinematic={cinematic}
            state={state}
            reducedMotion={reducedMotion}
            controls={controls}
            diceActive={diceActive}
          />
          <ambientLight intensity={1.7} />
          <mesh
            position={[0, -0.42, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#292532" roughness={1} />
          </mesh>
          <directionalLight
            position={[5, 12, 3]}
            intensity={2.3}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <mesh position={[0, -0.23, 0]} receiveShadow>
            <boxGeometry args={[BOARD_SIZE + 0.08, 0.32, BOARD_SIZE + 0.08]} />
            <meshStandardMaterial color="#25232b" roughness={0.95} />
          </mesh>
          <BoardCenter />
          <DiceScene roll={rollEvent} reducedMotion={reducedMotion} />
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
          {BOARD.filter(
            (tile) =>
              tile.type === "property" &&
              state.properties[tile.id]?.buildings > 0,
          ).map((tile) => (
            <PropertyBuildings
              key={tile.id}
              id={tile.id}
              count={state.properties[tile.id].buildings}
            />
          ))}
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
