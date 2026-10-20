import { useEffect, useState } from "react";
import { ArrowRight, Dices, SkipForward, Trophy } from "lucide-react";
import type { Action, GameState } from "../engine/types";
import { TOKENS } from "../engine/boardData";
import { DICE_SECONDS } from "../presentation/motion";

export default function OpeningSequence({
  state,
  onAction,
  reducedMotion,
  diceActive,
  canAct = true,
  controlsIntro = true,
}: {
  state: GameState;
  onAction: (type: Exclude<Action["type"], "build" | "sell-building">) => void;
  reducedMotion: boolean;
  diceActive: boolean;
  canAct?: boolean;
  controlsIntro?: boolean;
}) {
  const o = state.opening!;
  const [revealed, setRevealed] = useState(o.history.length);
  const rolling = diceActive || revealed !== o.history.length;
  useEffect(() => {
    if (!rolling) return;
    const timer = setTimeout(
      () => setRevealed(o.history.length),
      reducedMotion ? 100 : DICE_SECONDS * 1000,
    );
    return () => clearTimeout(timer);
  }, [o.history.length, rolling, reducedMotion]);
  const last = o.history.at(-1),
    current = state.players[state.currentPlayerIndex],
    spotlight = state.players[o.spotlightIndex];
  if (o.stage === "tour" || o.stage === "introductions")
    return (
      <section
        className="intro-caption"
        aria-label="Match introduction"
        aria-live="polite"
        key={`${o.stage}-${o.spotlightIndex}`}
      >
        <span className="eyebrow">
          {o.stage === "tour"
            ? "WELCOME TO THE NEIGHBORHOOD"
            : `MEET THE GHOULS · ${o.spotlightIndex + 1} / ${state.players.length}`}
        </span>
        <h1>
          {o.stage === "tour" ? (
            "The night is yours."
          ) : (
            <>
              {TOKENS[spotlight.token].icon} {spotlight.name}
            </>
          )}
        </h1>
        <p>
          {o.stage === "tour"
            ? "Forty spaces. A few friends. A fortune waiting to be made."
            : `${TOKENS[spotlight.token].label} · $1,500 · Ready to haunt the neighborhood`}
        </p>
        <button
          className="intro-skip"
          disabled={!controlsIntro}
          onClick={() => onAction("skip-intro")}
        >
          <SkipForward size={15} /> Skip camera tour
        </button>
      </section>
    );
  return (
    <section
      className="opening-order"
      aria-label="Starting order"
      aria-live="polite"
    >
      <span className="eyebrow">
        {o.round > 1 ? `TIE-BREAK · ROUND ${o.round}` : "LET FATE DECIDE"}
      </span>
      <h2>
        {o.stage === "ready" && !rolling ? (
          <>
            <Trophy size={24} /> {current.name} goes first!
          </>
        ) : rolling ? (
          "The dice are rolling…"
        ) : (
          "Who owns the first turn?"
        )}
      </h2>
      <p>
        {o.stage === "ready" && !rolling
          ? "The highest roll starts. Play continues clockwise."
          : o.round > 1
            ? "Highest rollers tied. Only the tied players roll again."
            : "Everyone rolls two dice. The highest total goes first."}
      </p>
      <div className="opening-results">
        {state.players.map((p) => {
          const result = [...o.history]
            .reverse()
            .find((r) => r.playerId === p.id);
          const pending = rolling && last?.playerId === p.id;
          return (
            <div
              className={`opening-result ${p.id === current.id ? "is-next" : ""}`}
              key={p.id}
            >
              <span>{TOKENS[p.token].icon}</span>
              <strong>{p.name}</strong>
              <span
                className={pending ? "opening-dice is-rolling" : "opening-dice"}
              >
                {pending
                  ? "· ·"
                  : result
                    ? `${result.dice[0]} + ${result.dice[1]}`
                    : "—"}
              </span>
              <b>
                {pending ? "?" : result ? result.dice[0] + result.dice[1] : "—"}
              </b>
            </div>
          );
        })}
      </div>
      <button
        className="game-action"
        disabled={rolling || (o.stage === "ready" ? !controlsIntro : !canAct)}
        onClick={() => onAction(o.stage === "ready" ? "begin" : "opening-roll")}
      >
        <Dices size={18} />
        {rolling
          ? "Rolling…"
          : o.stage === "ready"
            ? "Start playing"
            : `${current.name}: roll for first`}
        <ArrowRight size={18} />
      </button>
    </section>
  );
}
