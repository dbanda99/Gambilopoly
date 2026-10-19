import { useState } from "react";
import { ArrowRight, Moon, Users, Check } from "lucide-react";
import { TOKENS } from "../engine/boardData";
import { createGame } from "../engine/gameState";
import { readSave, useGame } from "../store";
import type { Token } from "../engine/types";
export default function Lobby() {
  const [count, setCount] = useState(2);
  const [names, setNames] = useState([
    "Player 1",
    "Player 2",
    "Player 3",
    "Player 4",
  ]);
  const [tokens, setTokens] = useState<Token[]>([
    "pumpkin",
    "ghost",
    "vampire",
    "witch",
  ]);
  const [error, setError] = useState("");
  const start = useGame((s) => s.start);
  const saved = readSave();
  function select(index: number, token: Token) {
    const next = [...tokens],
      other = next.indexOf(token);
    if (other >= 0) [next[index], next[other]] = [next[other], next[index]];
    else next[index] = token;
    setTokens(next);
  }
  return (
    <div className="lobby-layout">
      <section className="welcome">
        <span className="eyebrow">
          <span className="status-dot" /> THE NEIGHBORHOOD IS WAITING
        </span>
        <h1>
          A little spooky.
          <br />A lot at stake.
        </h1>
        <p>
          Gather your favorite ghouls. Claim haunted homes.
          <br />
          Build a fortune before the night is over.
        </p>
        <div className="hero-scene">
          <span className="hero-moon">☾</span>
          <div className="manor">
            <div className="tower tower-one" />
            <div className="tower tower-two" />
            <div className="house-body">
              <i />
              <i />
              <i />
              <i />
              <div className="door" />
            </div>
          </div>
          <span className="hero-pumpkin">🎃</span>
          <span className="hero-ghost">👻</span>
          <span className="scene-caption">
            YOUR NEXT GAME NIGHT, WITH A TWIST.
          </span>
        </div>
        <div className="feature-row">
          <span>
            <Users size={16} /> 2–4 players
          </span>
          <span>
            <Moon size={16} /> Halloween edition
          </span>
        </div>
      </section>
      <section className="setup-panel">
        <div className="panel-heading">
          <span className="eyebrow">LET’S MAKE SOME MISCHIEF</span>
          <h2>Gather your ghouls</h2>
          <p>One screen. A few friends. A whole haunted town.</p>
        </div>
        <div className="field-label">
          PLAYERS <span>Local pass & play</span>
        </div>
        <div className="segmented">
          {[2, 3, 4].map((n) => (
            <button
              className={count === n ? "selected" : ""}
              key={n}
              onClick={() => setCount(n)}
            >
              {n} players
            </button>
          ))}
        </div>
        <div className="player-fields">
          {names.slice(0, count).map((name, i) => (
            <div className="player-field" key={i}>
              <span className="player-number">0{i + 1}</span>
              <div className="player-input">
                <label htmlFor={`name-${i}`}>PLAYER {i + 1}</label>
                <input
                  id={`name-${i}`}
                  maxLength={24}
                  value={name}
                  onChange={(e) =>
                    setNames(
                      names.map((n, j) => (i === j ? e.target.value : n)),
                    )
                  }
                />
                <div className="token-choices">
                  {(Object.keys(TOKENS) as Token[]).map((t) => (
                    <button
                      key={t}
                      title={TOKENS[t].label}
                      aria-label={`Player ${i + 1}: ${TOKENS[t].label}`}
                      aria-pressed={tokens[i] === t}
                      onClick={() => select(i, t)}
                      className={tokens[i] === t ? "chosen" : ""}
                    >
                      {TOKENS[t].icon}
                      <span className="token-choice-label">
                        {TOKENS[t].label}
                      </span>
                      {tokens[i] === t && <Check size={10} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
        <button
          className="primary start-button"
          onClick={() => {
            try {
              start(
                createGame(
                  names
                    .slice(0, count)
                    .map((name, i) => ({ name, token: tokens[i] })),
                ),
              );
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          Enter the neighborhood <ArrowRight size={18} />
        </button>
        {saved && (
          <button className="resume" onClick={() => start(saved)}>
            Resume saved local game →
          </button>
        )}
        <p className="setup-note">
          Everyone starts with $1,500. Fortune favors the frightful.
        </p>
      </section>
    </div>
  );
}
