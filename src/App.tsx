import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Dices,
  Flag,
  Maximize2,
  Moon,
  RotateCcw,
  X,
} from "lucide-react";
import Lobby from "./components/Lobby";
import PropertyCard from "./components/PropertyCard";
import GameBoard from "./three/GameBoard";
import { BOARD, TOKENS } from "./engine/boardData";
import { useGame } from "./store";
export default function App() {
  const { state, dispatch, error, clearError } = useGame();
  const [rules, setRules] = useState(false),
    [selected, setSelected] = useState<number | null>(null),
    [topDown, setTopDown] = useState(false),
    [moving, setMoving] = useState(false),
    [leave, setLeave] = useState(false);
  useEffect(() => {
    if (!state?.movement) {
      setMoving(false);
      return;
    }
    setMoving(true);
    const t = setTimeout(
      () => setMoving(false),
      state.movement.steps * 200 + 180,
    );
    return () => clearTimeout(t);
  }, [state?.movement?.revision]);
  const player = state?.players[state.currentPlayerIndex];
  const action = (type: "roll" | "buy" | "pass" | "end" | "bail" | "resign") =>
    dispatch({ type, playerId: player!.id });
  return (
    <div className="app">
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
        <main className="game-layout">
          <div className="game-heading">
            <div>
              <span className="eyebrow">THE NIGHT IS YOURS</span>
              <h1>The neighborhood</h1>
            </div>
            <button
              className="secondary compact"
              onClick={() => setLeave(true)}
            >
              <RotateCcw size={14} /> New game
            </button>
          </div>
          <section className="board-panel">
            <div className="board-toolbar">
              <span>
                <span className="status-dot" /> LOCAL PASS & PLAY
              </span>
              <button
                onClick={() => setTopDown(!topDown)}
                className="board-view"
              >
                <Maximize2 size={14} />
                {topDown ? "Angled view" : "Top view"}
              </button>
            </div>
            <div className="board-canvas">
              <GameBoard
                state={state}
                onSelect={setSelected}
                topDown={topDown}
              />
              <div className="board-title">
                GAMBILOPOLY<span>WELCOME TO THE NEIGHBORHOOD</span>
              </div>
            </div>
            <div className="board-footer">
              <span>Drag to orbit · Pinch or scroll to zoom</span>
              <span>
                Tap a property to explore <ArrowRight size={13} />
              </span>
            </div>
          </section>
          <aside className="game-sidebar">
            <section className="turn-panel">
              <div className="turn-label">
                <span className="eyebrow">
                  {state.status === "finished"
                    ? "THE NIGHT HAS A WINNER"
                    : "YOUR TURN"}
                </span>
                <span>TURN {state.revision + 1}</span>
              </div>
              <div className="current-player">
                <span
                  className="avatar"
                  style={{ background: TOKENS[player!.token].color + "22" }}
                >
                  {TOKENS[player!.token].icon}
                </span>
                <div>
                  <h2>
                    {state.status === "finished"
                      ? state.players.find((p) => !p.bankrupt)?.name
                      : player!.name}
                  </h2>
                  <p>
                    {moving
                      ? "Taking a moonlit stroll…"
                      : player!.inJail
                        ? "Waiting in the Dungeon"
                        : BOARD[player!.position].name}
                  </p>
                </div>
              </div>
              <div className="dice-row">
                {(state.dice ?? [null, null]).map((n, i) => (
                  <div
                    key={i}
                    className={`die ${moving ? "rolling" : ""}`}
                    aria-label={`Die ${i + 1}: ${n ?? "not rolled"}`}
                  >
                    {n ? (
                      ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][n]
                    ) : (
                      <Dices size={26} />
                    )}
                  </div>
                ))}
                <span>
                  {state.dice
                    ? `${state.dice[0] + state.dice[1]} spaces`
                    : "Feeling lucky?"}
                </span>
              </div>
              {state.status === "finished" ? (
                <p className="winner">
                  A frightfully good fortune. Start a new game to play again.
                </p>
              ) : (
                <>
                  {state.phase === "roll" && (
                    <>
                      <button
                        className="primary"
                        disabled={moving}
                        onClick={() => action("roll")}
                      >
                        <Dices size={18} /> Roll the dice{" "}
                        <ArrowRight size={17} />
                      </button>
                      {player!.inJail && (
                        <button
                          className="resume"
                          onClick={() => action("bail")}
                        >
                          Pay $50 bail
                        </button>
                      )}
                    </>
                  )}
                  {state.phase === "purchase" && (
                    <div className="purchase-box">
                      <p>
                        <strong>{BOARD[player!.position].name}</strong>
                        <br />A new haunt for your collection?
                      </p>
                      <button
                        className="primary"
                        disabled={
                          moving ||
                          player!.money < BOARD[player!.position].price!
                        }
                        onClick={() => action("buy")}
                      >
                        Buy for ${BOARD[player!.position].price}{" "}
                        <ArrowRight size={16} />
                      </button>
                      <button
                        className="resume"
                        disabled={moving}
                        onClick={() => action("pass")}
                      >
                        Pass for now
                      </button>
                    </div>
                  )}
                  {state.phase === "end" && (
                    <button
                      className="primary"
                      disabled={moving}
                      onClick={() => action("end")}
                    >
                      {state.extraTurn ? "Doubles! Roll again" : "End turn"}{" "}
                      <ArrowRight size={17} />
                    </button>
                  )}
                </>
              )}
              <p className="turn-note">
                {state.phase === "purchase"
                  ? "Passing skips the auction in this alpha."
                  : "Pass Witching Hour to collect $200."}
              </p>
            </section>
            <section className="players-panel">
              <div className="section-label">
                THE GHOULS <span>{state.players.length} PLAYERS</span>
              </div>
              {state.players.map((p, i) => (
                <div
                  className={`player-row ${i === state.currentPlayerIndex ? "active" : ""} ${p.bankrupt ? "bankrupt" : ""}`}
                  key={p.id}
                >
                  <span
                    className="small-avatar"
                    style={{ background: TOKENS[p.token].color + "20" }}
                  >
                    {TOKENS[p.token].icon}
                  </span>
                  <div>
                    <strong>
                      {p.name}
                      {i === state.currentPlayerIndex && (
                        <span className="turn-dot" />
                      )}
                    </strong>
                    <small>
                      {p.bankrupt
                        ? "Bankrupt"
                        : `${p.propertyIds.length} properties${p.inJail ? " · In jail" : ""}`}
                    </small>
                  </div>
                  <span className="balance">${p.money.toLocaleString()}</span>
                </div>
              ))}
            </section>
            <section className="activity">
              <div className="section-label">
                WHISPERS OF THE NIGHT <ChevronDown size={14} />
              </div>
              <div className="activity-list" aria-live="polite">
                {state.log.slice(0, 6).map((line, i) => (
                  <p key={`${state.revision}-${i}`}>
                    <span />
                    {line}
                  </p>
                ))}
              </div>
            </section>
            {state.status === "playing" && (
              <button className="resign" onClick={() => setLeave(true)}>
                <Flag size={13} /> Match options
              </button>
            )}
          </aside>
        </main>
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
            {state?.status === "playing" && (
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
