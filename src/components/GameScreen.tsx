import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  BookOpen,
  Dices,
  Expand,
  History,
  Layers,
  Settings,
  Trophy,
  X,
} from "lucide-react";
import GameBoard from "../three/GameBoard";
import { BOARD, TOKENS } from "../engine/boardData";
import type { Action, GameState } from "../engine/types";
import "./game-screen.css";
import "./cinematics.css";
import OpeningSequence from "./OpeningSequence";
import { useReducedMotion } from "../presentation/useReducedMotion";
import {
  PLAYER_SECONDS,
  TOUR_SECONDS,
  DICE_SECONDS,
  type Cinematic,
  type Movement,
} from "../presentation/motion";

function Die({
  value,
  index,
  rolling,
}: {
  value: number | null;
  index: number;
  rolling: boolean;
}) {
  const pips: Record<number, number[]> = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };
  return (
    <div
      className={`game-die ${rolling ? "is-rolling" : ""}`}
      aria-label={`Die ${index + 1}: ${value ?? "not rolled"}`}
    >
      {value ? (
        pips[value].map((cell) => (
          <i
            key={cell}
            style={{
              gridArea: `${Math.ceil(cell / 3)} / ${((cell - 1) % 3) + 1}`,
            }}
          />
        ))
      ) : (
        <Dices size={26} />
      )}
    </div>
  );
}

export default function GameScreen({
  state,
  moving,
  motion,
  topDown,
  onView,
  onSelect,
  onOptions,
  onRules,
  onAction,
}: {
  state: GameState;
  moving: boolean;
  motion: Movement | null;
  topDown: boolean;
  onView: () => void;
  onSelect: (id: number) => void;
  onOptions: () => void;
  onRules: () => void;
  onAction: (type: Action["type"]) => void;
}) {
  const [history, setHistory] = useState(false),
    [inspected, setInspected] = useState<string | null>(null),
    [fullscreenError, setFullscreenError] = useState("");
  const current = state.players[state.currentPlayerIndex],
    tile = BOARD[current.position],
    winner = state.players.find((p) => !p.bankrupt);
  const inspectedPlayer = state.players.find((p) => p.id === inspected);
  const purchase =
    state.status === "playing" && state.phase === "purchase" && !moving;
  const reducedMotion = useReducedMotion();
  const opening = state.phase === "opening" && !!state.opening;
  const activeIndex =
    opening && state.opening?.stage === "introductions"
      ? state.opening.spotlightIndex
      : state.currentPlayerIndex;
  const cinematic = useMemo<Cinematic | null>(
    () =>
      state.opening?.stage === "tour" ||
      state.opening?.stage === "introductions"
        ? {
            stage: state.opening.stage,
            index: state.opening.spotlightIndex,
            startedAt: performance.now(),
          }
        : null,
    [state.id, state.opening?.stage, state.opening?.spotlightIndex],
  );
  useEffect(() => {
    if (!cinematic) return;
    const duration = reducedMotion
      ? 350
      : (cinematic.stage === "tour" ? TOUR_SECONDS : PLAYER_SECONDS) * 1000;
    const timer = setTimeout(() => onAction("advance-intro"), duration);
    return () => clearTimeout(timer);
  }, [cinematic, onAction, reducedMotion]);
  const [diceRolling, setDiceRolling] = useState(false);
  useEffect(() => {
    if (!motion) return;
    setDiceRolling(true);
    const timer = setTimeout(() => setDiceRolling(false), DICE_SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [motion]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHistory(false);
        setInspected(null);
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, []);
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else
        setFullscreenError(
          "Use your browser’s fullscreen control on this device.",
        );
    } catch {
      setFullscreenError(
        "Fullscreen is unavailable. The game still fills your browser.",
      );
    }
  }
  return (
    <main
      className={`game-screen ${opening ? "is-opening" : ""}`}
      aria-label="Gambilopoly game"
    >
      <div className="game-world">
        <GameBoard
          state={state}
          topDown={topDown}
          onSelect={onSelect}
          motion={motion}
          cinematic={cinematic}
          reducedMotion={reducedMotion}
        />
      </div>
      <div className="game-vignette" />
      <div className="game-tools" aria-label="Game controls">
        <button
          className="game-icon"
          aria-label="Match options"
          title="Match options"
          onClick={onOptions}
        >
          <Settings />
        </button>
        <button
          className="game-icon"
          aria-label="How to play"
          title="How to play"
          onClick={onRules}
        >
          <BookOpen />
        </button>
        <button
          className="game-icon"
          aria-label={topDown ? "Angled view" : "Top view"}
          title={topDown ? "Angled view" : "Top view"}
          onClick={onView}
          disabled={!!cinematic || moving}
        >
          <Layers />
        </button>
        <button
          className={`game-icon ${history ? "is-selected" : ""}`}
          aria-label="Match history"
          aria-expanded={history}
          title="Match history"
          onClick={() => {
            setHistory(!history);
            setInspected(null);
          }}
        >
          <History />
        </button>
        <button
          className="game-icon fullscreen-control"
          aria-label="Toggle fullscreen"
          title="Toggle fullscreen"
          onClick={fullscreen}
        >
          <Expand />
        </button>
      </div>
      <div className="game-wordmark" aria-hidden="true">
        gambilopoly<span>.</span>
        <small>LOCAL PASS & PLAY</small>
      </div>
      <aside className="game-roster" aria-label="Players">
        {state.players.map((player, index) => (
          <button
            key={player.id}
            className={`player-badge ${index === activeIndex && state.status === "playing" ? "is-current" : ""} ${player.bankrupt ? "is-bankrupt" : ""}`}
            style={
              { "--player-color": TOKENS[player.token].color } as CSSProperties
            }
            onClick={() => {
              setInspected(inspected === player.id ? null : player.id);
              setHistory(false);
            }}
            aria-label={`${player.name}, $${player.money}, ${player.propertyIds.length} properties${index === state.currentPlayerIndex ? ", current player" : ""}`}
            aria-expanded={inspected === player.id}
          >
            <span className="badge-token">{TOKENS[player.token].icon}</span>
            <span className="badge-name">{player.name}</span>
            <span className="badge-money">
              ${player.money.toLocaleString()}
            </span>
            <span className="badge-meta">
              {player.bankrupt
                ? "BANKRUPT"
                : player.inJail
                  ? "IN THE DUNGEON"
                  : `${player.propertyIds.length} PROPERTIES`}
            </span>
            {index === state.currentPlayerIndex &&
              state.status === "playing" && (
                <span className="badge-turn">
                  {opening
                    ? state.opening?.stage === "ready"
                      ? "GOES FIRST"
                      : state.opening?.stage === "order"
                        ? "ROLL FOR FIRST"
                        : "MEET THE GHOULS"
                    : "YOUR TURN"}
                </span>
              )}
          </button>
        ))}
      </aside>
      {history && (
        <section
          className="game-popover history-popover"
          aria-label="Match history"
        >
          <div className="popover-heading">
            <h2>Whispers of the night</h2>
            <button
              className="game-icon"
              aria-label="Close history"
              onClick={() => setHistory(false)}
            >
              <X />
            </button>
          </div>
          <ol>
            {state.log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </section>
      )}
      {inspectedPlayer && (
        <section
          className="game-popover holdings-popover"
          aria-label={`${inspectedPlayer.name}'s properties`}
        >
          <div className="popover-heading">
            <h2>{inspectedPlayer.name}'s haunts</h2>
            <button
              className="game-icon"
              aria-label="Close player properties"
              onClick={() => setInspected(null)}
            >
              <X />
            </button>
          </div>
          <p className="holdings-balance">
            ${inspectedPlayer.money.toLocaleString()}{" "}
            <span>available cash</span>
          </p>
          {inspectedPlayer.propertyIds.length ? (
            <ul>
              {inspectedPlayer.propertyIds.map((id) => (
                <li key={id}>
                  <button
                    style={{ borderLeftColor: BOARD[id].color ?? "#b9b58e" }}
                    onClick={() => onSelect(id)}
                  >
                    {BOARD[id].name}
                    <ArrowRight size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No properties yet. A whole neighborhood awaits.</p>
          )}
        </section>
      )}
      {purchase && (
        <section
          className="purchase-overlay"
          aria-label="Property purchase"
          style={
            { "--property-color": tile.color ?? "#b9b58e" } as CSSProperties
          }
        >
          <div className="sale-ribbon">FOR SALE</div>
          <div className="purchase-deed">
            <span className="deed-type">TITLE DEED · {tile.type}</span>
            <h2>{tile.name}</h2>
            <div className="deed-price">
              ${tile.price}
              <small>Purchase price</small>
            </div>
            <dl>
              <div>
                <dt>Base rent</dt>
                <dd>
                  {tile.type === "utility"
                    ? `${tile.rent?.[0]} × dice`
                    : `$${tile.rent?.[0]}`}
                </dd>
              </div>
              {tile.group && (
                <div>
                  <dt>With the complete set</dt>
                  <dd>${(tile.rent?.[0] ?? 0) * 2}</dd>
                </div>
              )}
              <div>
                <dt>Your cash after purchase</dt>
                <dd>${current.money - tile.price!}</dd>
              </div>
            </dl>
          </div>
          <div className="purchase-actions">
            <button
              className="game-action"
              disabled={current.money < tile.price!}
              onClick={() => onAction("buy")}
            >
              Buy for ${tile.price}
              <ArrowRight size={19} />
            </button>
            <button
              className="game-action game-action-secondary"
              onClick={() => onAction("pass")}
            >
              Pass for now
            </button>
          </div>
          {current.money < tile.price! && (
            <p className="purchase-warning">
              You need ${tile.price! - current.money} more to buy this property.
            </p>
          )}
        </section>
      )}
      {opening ? (
        <OpeningSequence
          state={state}
          onAction={onAction}
          reducedMotion={reducedMotion}
        />
      ) : (
        <section
          className={`game-turn-dock ${purchase ? "is-purchasing" : ""}`}
          aria-label="Turn controls"
          aria-live="polite"
        >
          {state.status === "finished" ? (
            <>
              <div className="dock-caption">
                <Trophy size={18} />
                <strong>{winner?.name} owns the night!</strong>
              </div>
              <button className="game-action" onClick={onOptions}>
                Play again
                <ArrowRight size={19} />
              </button>
            </>
          ) : (
            <>
              <div className="dock-caption">
                <span className="dock-token">{TOKENS[current.token].icon}</span>
                <div>
                  <strong>
                    {current.name}
                    {purchase
                      ? " is considering a purchase"
                      : moving
                        ? " is on the move"
                        : current.inJail
                          ? " is in the Dungeon"
                          : "’s turn"}
                  </strong>
                  <span>
                    {moving
                      ? "Following the moonlit path…"
                      : purchase
                        ? tile.name
                        : tile.name}
                  </span>
                </div>
              </div>
              {!purchase && (
                <div className="dock-play">
                  <div className="game-dice" aria-label="Dice">
                    <Die
                      value={state.dice?.[0] ?? null}
                      index={0}
                      rolling={diceRolling}
                    />
                    <Die
                      value={state.dice?.[1] ?? null}
                      index={1}
                      rolling={diceRolling}
                    />
                  </div>
                  <div className="dock-actions">
                    {moving ? (
                      <div className="movement-label">
                        {state.dice ? state.dice[0] + state.dice[1] : ""} spaces
                        <span>
                          {diceRolling ? "Rolling…" : "Following your token…"}
                        </span>
                      </div>
                    ) : state.phase === "roll" ? (
                      <>
                        <button
                          className="game-action"
                          onClick={() => onAction("roll")}
                        >
                          <Dices size={19} />
                          Roll the dice
                          <ArrowRight size={19} />
                        </button>
                        {current.inJail && (
                          <button
                            className="bail-action"
                            onClick={() => onAction("bail")}
                          >
                            Pay $50 bail
                          </button>
                        )}
                      </>
                    ) : state.phase === "end" ? (
                      <button
                        className="game-action"
                        onClick={() => onAction("end")}
                      >
                        {state.extraTurn ? "Doubles! Roll again" : "End turn"}
                        <ArrowRight size={19} />
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
      {!opening && !purchase && !moving && (
        <div className="game-event" role="status">
          {state.log[0]}
        </div>
      )}
      <div className="game-camera-hint">
        Drag to orbit · Scroll or pinch to zoom · Tap a space to inspect
      </div>
      {fullscreenError && (
        <div className="fullscreen-message" role="status">
          {fullscreenError}
          <button
            aria-label="Dismiss fullscreen message"
            onClick={() => setFullscreenError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
