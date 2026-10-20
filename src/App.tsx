import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Moon, X } from "lucide-react";
import ModeLobby from "./components/ModeLobby";
import PropertyCard from "./components/PropertyCard";
import GameScreen from "./components/GameScreen";
import TitleScreen from "./components/TitleScreen";
import { useGame } from "./store";
import type { Action } from "./engine/types";
import { movementDuration, type Movement } from "./presentation/motion";
import { DICE_SECONDS, type RollPresentation } from "./presentation/diceRoll";
import { useSession, leaveSession } from "./multiplayer/session";
import { useAutomation } from "./multiplayer/useAutomation";
export default function App() {
  const { state, dispatch, error, clearError, rollEvent } = useGame();
  const session = useSession();
  const [frontScreen, setFrontScreen] = useState<"title" | "setup">("title");
  const [introSeen, setIntroSeen] = useState(false);
  const [rules, setRules] = useState(false),
    [selected, setSelected] = useState<number | null>(null),
    [topDown, setTopDown] = useState(false),
    [leave, setLeave] = useState(false);
  const motion = useMemo<Movement | null>(
    () =>
      state?.movement &&
      rollEvent?.purpose === "turn" &&
      state.movement.revision === rollEvent.revision
        ? { ...state.movement, startedAt: rollEvent.startedAt }
        : null,
    [state?.id, state?.movement?.revision, rollEvent],
  );
  const [completedRoll, setCompletedRoll] = useState<RollPresentation | null>(
    null,
  );
  const diceActive = !!rollEvent && completedRoll !== rollEvent;
  useEffect(() => {
    if (!rollEvent) return;
    const timer = setTimeout(
      () => setCompletedRoll(rollEvent),
      Math.max(
        0,
        DICE_SECONDS * 1000 - (performance.now() - rollEvent.startedAt),
      ),
    );
    return () => clearTimeout(timer);
  }, [rollEvent]);
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
  const canAct =
    !session.mode ||
    (session.status === "playing" &&
      !session.pending &&
      player?.id === session.me &&
      !player.bot);
  const controlsIntro = session.mode !== "guest";
  useAutomation(state, moving || diceActive);
  const action = useCallback(
    (type: Exclude<Action["type"], "build" | "sell-building">) =>
      dispatch({ type, playerId: player!.id }),
    [dispatch, player?.id],
  );
  return (
    <div
      className={`app ${state ? "is-playing" : frontScreen === "title" ? "is-title" : "is-setup"}`}
    >
      <header className="header">
        <a
          href="./"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            if (state) setLeave(true);
            else {
              setIntroSeen(true);
              setFrontScreen("title");
            }
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
        frontScreen === "title" ? (
          <TitleScreen
            returnToMenu={introSeen}
            onPlay={() => {
              setIntroSeen(true);
              setFrontScreen("setup");
            }}
            onInstructions={() => setRules(true)}
          />
        ) : (
          <ModeLobby
            onBack={() => {
              setIntroSeen(true);
              setFrontScreen("title");
            }}
          />
        )
      ) : (
        <GameScreen
          state={state}
          canAct={canAct}
          controlsIntro={controlsIntro}
          modeLabel={
            session.mode === "single"
              ? "SINGLE PLAYER"
              : session.mode
                ? "PRIVATE MULTIPLAYER"
                : "LOCAL PASS & PLAY"
          }
          moving={moving || diceActive}
          diceActive={diceActive}
          rollEvent={rollEvent}
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
      {selected !== null && state && state.phase !== "card" && (
        <PropertyCard
          id={selected}
          state={state}
          onClose={() => setSelected(null)}
          interactionDisabled={moving || diceActive || !canAct}
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
      {state && session.mode && (
        <div
          className={`session-indicator ${session.status === "paused" ? "is-paused" : ""}`}
          role="status"
        >
          {session.message ||
            (session.status === "paused"
              ? "Connection lost · Match paused"
              : `${session.mode === "single" ? "Single Player" : `Room ${session.lobby?.code}`} · ${canAct ? "Your turn" : `Waiting for ${player?.name}`}`)}
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
              <li>
                Play against bots or invite friends to a hosted room. The last
                solvent player wins.
              </li>
            </ol>
            <div className="alpha-note">
              <strong>First playable · local alpha</strong>
              <p>
                Purchase passes skip auctions. Cards currently apply simple cash
                effects. Mortgages, trades and debt negotiation arrive in later
                phases.
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
              {session.mode === "host"
                ? "You are hosting. Leaving disconnects your guests and ends the hosted session."
                : session.mode === "guest"
                  ? "Leaving disconnects you from this match."
                  : "Your match saves after every action. Starting another match replaces that save."}
            </p>
            <button
              className="primary"
              onClick={() => {
                if (session.mode) leaveSession();
                else useGame.setState({ state: null });
                setFrontScreen("setup");
                setSelected(null);
                setLeave(false);
              }}
            >
              {session.mode === "guest"
                ? "Leave match"
                : session.mode === "host"
                  ? "End hosted match"
                  : "Set up a new game"}{" "}
              <ArrowRight size={16} />
            </button>
            {state?.status === "playing" &&
              state.phase !== "opening" &&
              canAct &&
              !moving &&
              !diceActive && (
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
