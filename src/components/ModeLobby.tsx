import { Suspense, useState, type CSSProperties } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Users,
  KeyRound,
  Copy,
  X,
  Plus,
  Check,
} from "lucide-react";
import { TOKENS } from "../engine/boardData";
import type { Token } from "../engine/types";
import PlayerModel from "../three/PlayerModel";
import { readSave, useGame } from "../store";
import { COLORS, canStart, type Member } from "../multiplayer/lobby";
import {
  createSingle,
  createRoom,
  joinRoom,
  leaveSession,
  useSession,
  updateProfile,
  toggleReady,
  kickPlayer,
  addBot,
  startMatch,
  resumeSingle,
} from "../multiplayer/session";
import "./mode-lobby.css";
function CharacterPreview({ member }: { member: Member }) {
  return (
    <div
      className="seat-preview"
      style={{ "--seat-color": member.color } as CSSProperties}
    >
      <Canvas
        frameloop="demand"
        dpr={1}
        camera={{ position: [0, 0.6, 1.8], fov: 34 }}
        fallback={<span>{TOKENS[member.token].icon}</span>}
      >
        <ambientLight intensity={2} />
        <directionalLight position={[2, 4, 3]} intensity={2.5} />
        <Suspense fallback={null}>
          <group position={[0, -0.28, 0]} rotation={[0, -0.25, 0]}>
            <PlayerModel
              token={member.token}
              fallback={
                <mesh>
                  <sphereGeometry args={[0.18, 12, 12]} />
                  <meshStandardMaterial color={member.color} />
                </mesh>
              }
            />
          </group>
        </Suspense>
      </Canvas>
      <span className="seat-character-name">{TOKENS[member.token].label}</span>
    </div>
  );
}
export default function ModeLobby({ onBack }: { onBack: () => void }) {
  const session = useSession(),
    [choice, setChoice] = useState<"select" | "join">(() =>
      new URLSearchParams(location.search).has("room") ? "join" : "select",
    );
  const [name, setName] = useState("Player 1"),
    [code, setCode] = useState(
      () => new URLSearchParams(location.search).get("room") ?? "",
    ),
    [copied, setCopied] = useState("");
  const lobby = session.lobby,
    isHost = session.mode === "host" || session.mode === "single";
  const inLobby = !!lobby && session.status !== "error";
  const saved = readSave();
  function back() {
    if (session.mode || choice === "join") {
      leaveSession();
      setChoice("select");
      const url = new URL(location.href);
      url.searchParams.delete("room");
      history.replaceState(null, "", url);
    } else onBack();
  }
  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${label} copied`);
    } catch {
      setCopied("Copy is unavailable. Select and copy the code above.");
    }
    setTimeout(() => setCopied(""), 3000);
  }
  return (
    <main className="mode-world">
      <header className="mode-heading">
        <button
          className="mode-back"
          aria-label={inLobby ? "Leave lobby" : "Back"}
          onClick={back}
        >
          <ArrowLeft />
        </button>
        <div>
          <span className="eyebrow">GAMBILOPOLY · GAME NIGHT</span>
          <h1>
            {inLobby
              ? "The lobby"
              : choice === "join"
                ? "Join a game"
                : "Select mode"}
          </h1>
        </div>
        <span className="mode-capacity">
          {inLobby ? `${lobby.members.length} / 4 PLAYERS` : "UP TO 4 PLAYERS"}
        </span>
      </header>
      {session.message && (
        <div className="room-message" role="alert">
          {session.message}
        </div>
      )}
      {!inLobby && (
        <>
          <div className="mode-profile">
            <label htmlFor="mode-player-name">Your name</label>
            <input
              id="mode-player-name"
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
            />
          </div>
          {choice === "select" ? (
            <div className="mode-grid">
              <button
                className="mode-card"
                disabled={!name.trim() || session.status === "connecting"}
                onClick={() => createSingle(name)}
              >
                <span className="mode-symbol">
                  <Bot size={58} />
                </span>
                <span className="eyebrow">YOUR OWN HAUNTED GAME NIGHT</span>
                <h2>Single Player</h2>
                <p>
                  Take on up to three bots. Choose your character and make the
                  night yours.
                </p>
                <span className="mode-card-action">
                  Play against bots <ArrowRight size={19} />
                </span>
              </button>
              <button
                className="mode-card"
                disabled={!name.trim() || session.status === "connecting"}
                onClick={() => createRoom(name)}
              >
                <span className="mode-symbol">
                  <Users size={58} />
                </span>
                <span className="eyebrow">BRING YOUR FAVORITE GHOULS</span>
                <h2>Multiplayer</h2>
                <p>
                  Host a private match. Share your room code or invite link with
                  friends.
                </p>
                <span className="mode-card-action">
                  Create a room <ArrowRight size={19} />
                </span>
              </button>
              <button
                className="mode-card"
                disabled={session.status === "connecting"}
                onClick={() => setChoice("join")}
              >
                <span className="mode-symbol">
                  <KeyRound size={58} />
                </span>
                <span className="eyebrow">THERE’S A SEAT FOR YOU</span>
                <h2>Join a Game</h2>
                <p>
                  Have an invitation? Enter the host’s code and meet everyone in
                  the lobby.
                </p>
                <span className="mode-card-action">
                  Enter a code <ArrowRight size={19} />
                </span>
              </button>
            </div>
          ) : (
            <form
              className="join-room-panel"
              onSubmit={(e) => {
                e.preventDefault();
                joinRoom(code, name);
              }}
            >
              <label htmlFor="room-code">Room code</label>
              <input
                id="room-code"
                className="room-code-input"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.toUpperCase().replace(/\s/g, ""))
                }
                maxLength={8}
                placeholder="ABCDEFGH"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
              />
              <p>Ask your host for their 8-character code.</p>
              <button
                className="primary"
                disabled={
                  !name.trim() ||
                  code.length !== 8 ||
                  session.status === "connecting"
                }
              >
                {session.status === "connecting" ? "Connecting…" : "Join lobby"}{" "}
                <ArrowRight size={18} />
              </button>
            </form>
          )}
          {choice === "select" && saved && saved.mode !== "online" && (
            <button
              className="mode-resume"
              onClick={() => {
                if (saved.mode === "single") resumeSingle(saved);
                else useGame.getState().start(saved);
              }}
            >
              Resume saved {saved.mode === "single" ? "single-player" : "local"}{" "}
              game →
            </button>
          )}
        </>
      )}
      {inLobby && (
        <>
          <section className="room-invite" aria-label="Room invitation">
            {session.mode === "single" ? (
              <>
                <Bot />
                <div>
                  <strong>You versus the neighborhood</strong>
                  <p>
                    Add 1–3 bots. You can customize their characters and colors
                    too.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="eyebrow">
                    {session.status === "connecting"
                      ? "CREATING ROOM…"
                      : "ROOM CODE"}
                  </span>
                  <strong className="share-code">
                    {session.status === "connecting" ? "…" : lobby.code}
                  </strong>
                </div>
                <p>
                  {isHost
                    ? "Share an invitation. Keep this tab open while you host."
                    : "Choose your character and color, then mark yourself ready."}
                </p>
                <button
                  className="secondary"
                  disabled={session.status === "connecting"}
                  onClick={() => copy(lobby.code, "Code")}
                >
                  <Copy size={15} /> Copy code
                </button>
                <button
                  className="secondary"
                  disabled={session.status === "connecting"}
                  onClick={() => {
                    const url = new URL(location.href);
                    url.search = "";
                    url.searchParams.set("room", lobby.code);
                    copy(url.href, "Invite link");
                  }}
                >
                  <Copy size={15} /> Copy invite link
                </button>
              </>
            )}
            {copied && <span role="status">{copied}</span>}
          </section>
          <section className="seats-grid" aria-label="Players in lobby">
            {lobby.members.map((member) => {
              const editable =
                member.id === session.me || (isHost && member.bot);
              return (
                <article
                  className={`lobby-seat ${editable ? "is-editable" : ""}`}
                  key={member.id}
                  style={{ "--seat-color": member.color } as CSSProperties}
                >
                  <div className="seat-ribbon">
                    <span>
                      {member.bot ? (
                        <Bot size={16} />
                      ) : member.id === lobby.hostId ? (
                        "♛"
                      ) : (
                        "●"
                      )}
                    </span>
                    {editable ? (
                      <input
                        aria-label={`${member.bot ? member.name : "Your"} name`}
                        key={member.name}
                        defaultValue={member.name}
                        maxLength={24}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value && value !== member.name)
                            updateProfile(member.id, { name: value });
                          else e.target.value = member.name;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                      />
                    ) : (
                      <strong>{member.name}</strong>
                    )}
                  </div>
                  <span className="seat-role">
                    {member.id === session.me ? "YOU · " : ""}
                    {member.bot
                      ? "BOT · STANDARD"
                      : member.id === lobby.hostId
                        ? "HOST"
                        : member.ready
                          ? "READY"
                          : "CHOOSING CHARACTER"}
                  </span>
                  {isHost && member.id !== session.me && (
                    <button
                      className="seat-kick"
                      aria-label={`Remove ${member.name}`}
                      disabled={
                        session.mode === "single" && lobby.members.length <= 2
                      }
                      onClick={() => kickPlayer(member.id)}
                    >
                      <X size={18} />
                    </button>
                  )}
                  <CharacterPreview member={member} />
                  <label className="character-choice">
                    Character
                    <select
                      aria-label={`Character for ${member.name}`}
                      disabled={!editable}
                      value={member.token}
                      onChange={(e) =>
                        updateProfile(member.id, {
                          token: e.target.value as Token,
                        })
                      }
                    >
                      {Object.entries(TOKENS).map(([token, data]) => (
                        <option
                          key={token}
                          value={token}
                          disabled={lobby.members.some(
                            (m) => m.id !== member.id && m.token === token,
                          )}
                        >
                          {data.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div
                    className="seat-colors"
                    aria-label={`Color for ${member.name}`}
                  >
                    {COLORS.map((color, i) => (
                      <button
                        key={color}
                        aria-label={`${member.name}: color ${i + 1}`}
                        aria-pressed={member.color === color}
                        disabled={
                          !editable ||
                          lobby.members.some(
                            (m) => m.id !== member.id && m.color === color,
                          )
                        }
                        onClick={() => updateProfile(member.id, { color })}
                        style={{ background: color }}
                      >
                        {member.color === color && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                  <p className="seat-status">
                    {member.bot
                      ? "Ready to play"
                      : member.id === lobby.hostId
                        ? "Hosting the match"
                        : member.ready
                          ? "✓ Ready to play"
                          : "Choosing their look…"}
                  </p>
                </article>
              );
            })}
            {Array.from({ length: 4 - lobby.members.length }, (_, i) => (
              <article className="empty-seat" key={i}>
                <Users size={34} />
                <strong>
                  {session.mode === "single"
                    ? "Add an opponent"
                    : "Waiting for a friend"}
                </strong>
                {session.mode === "single" ? (
                  <button className="secondary" onClick={addBot}>
                    <Plus size={16} /> Add bot
                  </button>
                ) : (
                  <p>Share the code to fill this seat.</p>
                )}
              </article>
            ))}
          </section>
          <footer className="lobby-launch">
            <div>
              <strong>
                {isHost ? "Your game, your gathering." : "Ready for the night?"}
              </strong>
              <p>
                {isHost
                  ? canStart(lobby)
                    ? "Everyone is ready. Let the haunting begin."
                    : "At least two players are needed. Wait for your friends to mark Ready."
                  : "Your host starts the match when everyone is ready."}
              </p>
            </div>
            {isHost ? (
              <button
                className="primary"
                disabled={session.status !== "lobby" || !canStart(lobby)}
                onClick={startMatch}
              >
                Start game <ArrowRight size={20} />
              </button>
            ) : (
              <button className="primary" onClick={toggleReady}>
                {lobby.members.find((m) => m.id === session.me)?.ready
                  ? "Not ready"
                  : "Ready to play"}{" "}
                <Check size={19} />
              </button>
            )}
          </footer>
        </>
      )}
    </main>
  );
}
