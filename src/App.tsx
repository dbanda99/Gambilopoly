import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Moon, X } from "lucide-react";
import Lobby from "./components/Lobby";
import PropertyCard from "./components/PropertyCard";
import GameScreen from "./components/GameScreen";
import { useGame } from "./store";
import type { Action } from "./engine/types";
import { movementDuration, type Movement } from "./presentation/motion";
export default function App() {
  const { state, dispatch, error, clearError } = useGame();
  const [rules, setRules] = useState(false),
    [selected, setSelected] = useState<number | null>(null),
    [topDown, setTopDown] = useState(false),
    [leave, setLeave] = useState(false);
  const motion = useMemo<Movement | null>(
    () =>
      state?.movement
        ? { ...state.movement, startedAt: performance.now() }
        : null,
    [state?.id, state?.movement?.revision],
  );
  const [completedMotion, setCompletedMotion] = useState<Movement | null>(null);
  const moving = !!motion && completedMotion !== motion;
  useEffect(() => {
    if (!motion) return;
    const timer = setTimeout(
      () => setCompletedMotion(motion),
      Math.max(
        0,
        movementDuration(motion.steps) * 1000 -
          (performance.now() - motion.startedAt),
      ),
    );
    return () => clearTimeout(timer);
  }, [motion]);
  useEffect(() => {
    document.body.classList.toggle("in-game", !!state);
    return () => document.body.classList.remove("in-game");
  }, [!!state]);
  const player = state?.players[state.currentPlayerIndex];
  const action = useCallback(
    (type: Action["type"]) => dispatch({ type, playerId: player!.id }),
    [dispatch, player?.id],
  );
  return (
    <div className={`app ${state ? "is-playing" : ""}`}>
      <header className="header">
        <a
          href="./"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            if (state) setLeave(true);
          }}
        >
          <span className="brand-icon">🎃</span>
          <span>
            gambilopoly<span className="brand-period">.</span>
            <small>OWN THE NIGHT</small>
          </span>
        </a>
        <nav>
          <span className="edition">
            <Moon size={14} /> HALLOWEEN EDITION
          </span>
          <button className="text-button" onClick={() => setRules(true)}>
            <BookOpen size={16} /> How to play
          </button>
          <span className="build-tag">LOCAL ALPHA</span>
        </nav>
      </header>
      {!state ? (
        <Lobby />
      ) : (
        <GameScreen
          state={state}
          moving={moving}
          motion={motion}
          topDown={topDown}
          onView={() => setTopDown(!topDown)}
          onSelect={setSelected}
          onOptions={() => setLeave(true)}
          onRules={() => setRules(true)}
          onAction={action}
        />
      )}
      <footer className="footer">
        <span>A LITTLE SPOOKY. A LITTLE STRATEGIC.</span>
        <span>
          Made for your favorite ghouls. <span className="footer-star">✦</span>
        </span>
      </footer>
      {selected !== null && state && (
        <PropertyCard
          id={selected}
          state={state}
          onClose={() => setSelected(null)}
        />
      )}
      {error && (
        <div className="error-toast" role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={clearError}>
            <X size={16} />
          </button>
        </div>
      )}
      {rules && (
        <div className="modal-shade" onClick={() => setRules(false)}>
          <section
            className="rules-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rules-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              aria-label="Close rules"
              onClick={() => setRules(false)}
            >
              <X />
            </button>
            <span className="eyebrow">A GUIDE FOR THE RECENTLY HAUNTED</span>
            <h2 id="rules-title">Own the night.</h2>
            <ol>
              <li>
                Pick 2–4 players and unique tokens. Each starts with $1,500.
              </li>
              <li>Roll two dice, then follow your token around 40 spaces.</li>
              <li>
                Buy unowned properties. Visitors pay rent automatically.
                Complete color sets earn double base rent.
              </li>
              <li>
                Collect $200 passing Witching Hour. Watch for taxes and cards.
              </li>
              <li>
                Doubles grant another roll. Three doubles send you to the
                Dungeon. Roll doubles or pay $50 to leave.
              </li>
              <li>Take turns on this device. The last solvent player wins.</li>
            </ol>
            <div className="alpha-note">
              <strong>First playable · local alpha</strong>
              <p>
                Purchase passes skip auctions. Cards currently apply simple cash
                effects. Buildings, mortgages, trades, debt negotiation and
                online room codes arrive in later phases.
              </p>
            </div>
            <button className="primary" onClick={() => setRules(false)}>
              Let’s play <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
      {leave && (
        <div className="modal-shade">
          <section
            className="rules-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="options-title"
          >
            <button
              className="close"
              aria-label="Close options"
              onClick={() => setLeave(false)}
            >
              <X />
            </button>
            <h2 id="options-title">Match options</h2>
            <p>
              Your local match saves after every action. Starting another match
              replaces that save when you enter the neighborhood.
            </p>
            <button
              className="primary"
              onClick={() => {
                useGame.setState({ state: null });
                setLeave(false);
              }}
            >
              Set up a new game <ArrowRight size={16} />
            </button>
            {state?.status === "playing" && state.phase !== "opening" && (
              <button
                className="resume"
                onClick={() => {
                  action("resign");
                  setLeave(false);
                }}
              >
                Current player: concede match
              </button>
            )}
            <button className="resume" onClick={() => setLeave(false)}>
              Keep playing
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
