import type { PeerOptions } from "peerjs";
import {
  createRoomPeer,
  usesLocalRooms,
  type RoomPeer,
  type RoomConnection,
} from "./transport";
import { create } from "zustand";
import {
  lobbySchema,
  canStart,
  editMember,
  newMember,
  normalizeCode,
  removeMember,
  type RoomLobby,
} from "./lobby";
import { requestSchema } from "./protocol";
import { authorizeAction } from "./authority";
import {
  chatHistorySchema,
  chatText,
  makeChat,
  type ChatMessage,
} from "./chat";
import { createGame } from "../engine/gameState";
import { applyAction } from "../engine/reducer";
import { parseSnapshot } from "../engine/snapshot";
import type { Action, GameState } from "../engine/types";
import { useGame, setActionController } from "../store";
import { DICE_SECONDS, movementDuration } from "../presentation/motion";
import {
  CONNECTION_TIMEOUT,
  connectionError,
  timeoutMessage,
} from "./connection";
import { randomId } from "../utils/id";
import { iceConfig } from "./iceConfig";
import { observeConnection } from "./connectionTrace";
type Mode = "single" | "host" | "guest" | null;
interface Session {
  mode: Mode;
  me: string;
  status: "idle" | "connecting" | "lobby" | "playing" | "paused" | "error";
  lobby: RoomLobby | null;
  message: string;
  pending: boolean;
  chat: ChatMessage[];
  chatPending: boolean;
  connectionStep: string;
  connectionDetails: string;
  signalingReady: boolean;
  networkDetails: string;
}
const initial: Session = {
  mode: null,
  me: "",
  status: "idle",
  lobby: null,
  message: "",
  pending: false,
  chat: [],
  chatPending: false,
  connectionStep: "",
  connectionDetails: "",
  signalingReady: false,
  networkDetails: "",
};
export const useSession = create<Session>(() => ({ ...initial }));
let peer: RoomPeer | null = null,
  upstream: RoomConnection | null = null,
  game: GameState | null = null;
let generation = 0,
  busyUntil = 0;
const connections = new Map<string, RoomConnection>(),
  banned = new Set<string>();
const report = (e: unknown) =>
  useSession.setState({
    message: e instanceof Error ? e.message : String(e),
    pending: false,
    chatPending: false,
  });
export function leaveSession() {
  generation++;
  const old = peer;
  peer = null;
  upstream = null;
  connections.clear();
  banned.clear();
  game = null;
  busyUntil = 0;
  old?.destroy();
  setActionController(null);
  useGame.setState({ state: null, rollEvent: null, feedback: null, error: "" });
  useSession.setState({ ...initial });
}
function peerOptions(): PeerOptions {
  const host = import.meta.env.VITE_PEER_HOST;
  return {
    debug: 0,
    ...(host
      ? {
          host,
          port: Number(import.meta.env.VITE_PEER_PORT || 9000),
          path: import.meta.env.VITE_PEER_PATH || "/",
          secure: import.meta.env.VITE_PEER_SECURE === "true",
        }
      : {}),
    config: {
      iceServers: iceConfig(import.meta.env.VITE_ICE_SERVERS).iceServers,
    },
  };
}
function connectionDetails(stage: string, error?: unknown) {
  const type = (error as { type?: string } | null)?.type;
  useSession.setState({
    connectionStep: stage,
    connectionDetails: [
      `Stage: ${stage}`,
      `Transport: ${usesLocalRooms ? "local preview WebSocket (same Vite server)" : "WebRTC"}`,
      ...(!usesLocalRooms
        ? [
            `Signaling: ${import.meta.env.VITE_PEER_HOST ? "custom server" : "PeerJS cloud"}`,
            `Relay: ${relayConfigured() ? "configured (connectivity not yet verified)" : "not configured; direct connections only"}`,
          ]
        : []),
      `Secure context: ${window.isSecureContext ? "yes" : "no (use the HTTPS game link)"}`,
      ...(type ? [`Error: ${type}`] : []),
    ].join(" · "),
  });
}
function relayConfigured() {
  try {
    return iceConfig(import.meta.env.VITE_ICE_SERVERS).hasRelay;
  } catch {
    return false;
  }
}
function roomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    (n) => chars[n % chars.length],
  ).join("");
}
function send(conn: RoomConnection, data: unknown) {
  try {
    if (conn.open) conn.send(data);
  } catch {
    conn.close();
  }
}
function sync(rolled?: Action["type"]) {
  const s = useSession.getState();
  if (game) {
    useGame.getState().receive(game, rolled);
    useSession.setState({
      status: s.lobby?.members.every((m) => m.connected) ? "playing" : "paused",
      message: s.lobby?.members.every((m) => m.connected)
        ? ""
        : "A player disconnected. The match is paused.",
    });
  }
  for (const [id, conn] of connections)
    send(conn, {
      type: "sync",
      lobby: s.lobby,
      game,
      rolled,
      me: id,
      ...(!game ? { chat: s.chat } : {}),
    });
}
function publishChat(message: ChatMessage) {
  const chat = [...useSession.getState().chat, message].slice(-60);
  useSession.setState({ chat, chatPending: false });
  for (const conn of connections.values()) send(conn, { type: "chat", chat });
}
function lobbyActivity(text: string) {
  publishChat({
    id: randomId(),
    senderId: null,
    name: "Lobby",
    color: "#d6b5e2",
    text,
    kind: "system",
    createdAt: Date.now(),
  });
}
export function sendChat(text: string): boolean {
  try {
    const s = useSession.getState();
    if (s.status !== "lobby" || !s.lobby || s.mode === "single")
      throw Error("Chat is available in multiplayer lobbies.");
    const normalized = chatText.parse(text);
    if (s.mode === "guest") {
      if (s.chatPending) return false;
      useSession.setState({ chatPending: true });
      send(upstream!, {
        type: "chat",
        requestId: randomId(),
        text: normalized,
      });
      const version = generation;
      setTimeout(() => {
        if (version === generation && useSession.getState().chatPending)
          report(
            Error("Your message was not confirmed. Check your connection."),
          );
      }, 8000);
    } else publishChat(makeChat(s.lobby, s.me, normalized, s.chat));
    return true;
  } catch (e) {
    report(e);
    return false;
  }
}
function prepare(mode: "single" | "host", name: string) {
  leaveSession();
  const me = "player-0",
    lobby: RoomLobby = {
      code: mode === "host" ? roomCode() : "",
      hostId: me,
      members: [],
      revision: 0,
    };
  lobby.members.push(newMember(lobby, me, name));
  useSession.setState({
    mode,
    me,
    lobby,
    status: mode === "single" ? "lobby" : "connecting",
  });
  setActionController(requestAction);
  return lobby;
}
export function createSingle(name: string) {
  const lobby = prepare("single", name);
  for (let i = 1; i <= 3; i++)
    lobby.members.push(newMember(lobby, `bot-${i}`, `Bot ${i}`, true));
  useSession.setState({ lobby: { ...lobby } });
}
export function createRoom(name: string) {
  const lobby = prepare("host", name),
    version = generation;
  try {
    connectionDetails("Registering room…");
    peer = createRoomPeer(`gambilopoly-${lobby.code}`, peerOptions());
    const roomPeer = peer;
    const timer = setTimeout(() => {
      if (
        generation === version &&
        useSession.getState().status === "connecting"
      ) {
        report(Error(timeoutMessage("signaling", usesLocalRooms)));
        useSession.setState({ status: "error" });
        roomPeer.destroy();
      }
    }, CONNECTION_TIMEOUT.signaling);
    peer.on("open", () => {
      clearTimeout(timer);
      if (generation === version && useSession.getState().status !== "error") {
        connectionDetails("Room online");
        useSession.setState({
          status: game ? useSession.getState().status : "lobby",
          signalingReady: true,
          message: "",
        });
      }
    });
    peer.on("connection", (conn) => acceptConnection(conn, version));
    peer.on("error", (error) => {
      if (generation === version) {
        connectionDetails("Room connection error", error);
        report(Error(connectionError(error, usesLocalRooms)));
        if (useSession.getState().status === "connecting") {
          clearTimeout(timer);
          useSession.setState({ status: "error" });
          roomPeer.destroy();
        }
      }
    });
    peer.on("disconnected", () => {
      if (generation === version && !roomPeer.destroyed) {
        connectionDetails("Reconnecting room signaling…");
        useSession.setState({
          signalingReady: false,
          message:
            "Room signaling disconnected. Reconnecting; new players must wait until Room online appears.",
        });
        roomPeer.reconnect();
      }
    });
  } catch (e) {
    report(e);
    useSession.setState({ status: "error" });
  }
}
function acceptConnection(conn: RoomConnection, version: number) {
  observeConnection(conn, (networkDetails) => {
    if (version === generation) useSession.setState({ networkDetails });
  });
  let memberId: string | null = null;
  let lastSeen = Date.now(),
    closed = false;
  const requests = new Set<string>();
  let lastProfile = 0;
  const reject = (message: string) => {
    send(conn, { type: "rejected", message });
    setTimeout(() => conn.close(), 250);
  };
  let helloTimer = setTimeout(() => {
    if (!memberId) conn.close();
  }, CONNECTION_TIMEOUT.channel);
  // The PeerJS 'connection' event precedes the usable data channel. Give ICE
  // its own budget, then start the admission deadline only after 'open'.
  conn.on("open", () => {
    clearTimeout(helloTimer);
    lastSeen = Date.now();
    helloTimer = setTimeout(() => {
      if (!memberId) conn.close();
    }, CONNECTION_TIMEOUT.admission);
  });
  const heartbeat = setInterval(() => {
    if (generation !== version || closed) {
      clearInterval(heartbeat);
      return;
    }
    if (memberId && Date.now() - lastSeen > 15000) {
      disconnected();
      conn.close();
    } else if (memberId) send(conn, { type: "ping" });
  }, 3000);
  conn.on("data", (raw) => {
    if (generation !== version || closed) return;
    try {
      if (JSON.stringify(raw).length > 4096)
        throw Error("Message is too large.");
      lastSeen = Date.now();
      if (memberId && (raw as { type?: string })?.type === "pong") return;
      const request = requestSchema.parse(raw),
        s = useSession.getState(),
        lobby = s.lobby!;
      if (request.type === "hello") {
        if (memberId) throw Error("Already joined.");
        if (lobby.members.length >= 4) {
          reject("This lobby is full (4 players).");
          return;
        }
        if (game || banned.has(conn.peer)) {
          reject(
            game
              ? "This match has already started."
              : "You were removed from this lobby.",
          );
          return;
        }
        const id = randomId(),
          member = newMember(lobby, id, request.name);
        memberId = id;
        clearTimeout(helloTimer);
        connections.set(id, conn);
        useSession.setState({
          lobby: {
            ...lobby,
            revision: lobby.revision + 1,
            members: [...lobby.members, member],
          },
        });
        sync();
        lobbyActivity(`${member.name} joined the lobby.`);
        return;
      }
      if (!memberId) throw Error("Join the lobby first.");
      if (request.type === "chat") {
        if (game)
          throw Error("Lobby chat is closed while the match is playing.");
        if (requests.has(request.requestId)) return;
        requests.add(request.requestId);
        if (requests.size > 128)
          requests.delete(requests.values().next().value!);
        publishChat(
          makeChat(lobby, memberId, request.text, useSession.getState().chat),
        );
        return;
      }
      if (request.type === "action") {
        if (requests.has(request.requestId)) return;
        requests.add(request.requestId);
        if (requests.size > 128)
          requests.delete(requests.values().next().value!);
        commit(request.action, memberId, request.revision);
        return;
      }
      if (game) throw Error("The match has already started.");
      if (Date.now() - lastProfile < 100)
        throw Error("Please wait a moment before changing your player again.");
      lastProfile = Date.now();
      if (request.type === "profile")
        useSession.setState({
          lobby: editMember(lobby, memberId, memberId, request.profile),
        });
      else
        useSession.setState({
          lobby: {
            ...lobby,
            revision: lobby.revision + 1,
            members: lobby.members.map((m) =>
              m.id === memberId ? { ...m, ready: request.ready } : m,
            ),
          },
        });
      sync();
      if (request.type === "ready")
        lobbyActivity(
          `${lobby.members.find((m) => m.id === memberId)?.name} is ${request.ready ? "ready to play" : "choosing their character"}.`,
        );
    } catch (e) {
      send(conn, {
        type: "error",
        message: e instanceof Error ? e.message : "The request was rejected.",
      });
    }
  });
  const disconnected = () => {
    closed = true;
    clearInterval(heartbeat);
    clearTimeout(helloTimer);
    if (
      generation !== version ||
      !memberId ||
      connections.get(memberId) !== conn
    )
      return;
    connections.delete(memberId);
    const lobby = useSession.getState().lobby!;
    useSession.setState({
      lobby: {
        ...lobby,
        revision: lobby.revision + 1,
        members: game
          ? lobby.members.map((m) =>
              m.id === memberId ? { ...m, connected: false } : m,
            )
          : lobby.members.filter((m) => m.id !== memberId),
      },
      message: game ? "A player disconnected. The match is paused." : "",
    });
    sync();
    if (!game)
      lobbyActivity(
        `${lobby.members.find((m) => m.id === memberId)?.name ?? "A player"} left the lobby.`,
      );
  };
  conn.on("close", disconnected);
  conn.on("error", disconnected);
}
export function joinRoom(value: string, name: string) {
  leaveSession();
  const code = normalizeCode(value);
  if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) {
    useSession.setState({
      mode: "guest",
      status: "error",
      message: "Enter the 8-character room code.",
    });
    return;
  }
  const version = generation;
  useSession.setState({ mode: "guest", status: "connecting" });
  setActionController(requestAction);
  try {
    connectionDetails("Contacting room service…");
    peer = createRoomPeer(undefined, peerOptions());
    const guestPeer = peer;
    let timer: ReturnType<typeof setTimeout>;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let stage: keyof typeof CONNECTION_TIMEOUT = "signaling";
    let failed = false;
    const fail = (message: string, error?: unknown) => {
      clearTimeout(timer);
      clearInterval(heartbeat);
      if (
        failed ||
        version !== generation ||
        useSession.getState().status === "error"
      )
        return;
      failed = true;
      connectionDetails(useSession.getState().connectionStep, error);
      useSession.setState({
        status: game ? "paused" : "error",
        message,
        pending: false,
        chatPending: false,
        signalingReady: false,
      });
      guestPeer.destroy();
    };
    const deadline = (next: typeof stage) => {
      clearTimeout(timer);
      stage = next;
      timer = setTimeout(
        () => fail(timeoutMessage(stage, usesLocalRooms)),
        CONNECTION_TIMEOUT[stage],
      );
    };
    deadline("signaling");
    peer.on("open", () => {
      if (
        version !== generation ||
        useSession.getState().status !== "connecting"
      )
        return;
      connectionDetails(
        usesLocalRooms
          ? "Opening local room connection…"
          : "Opening peer connection…",
      );
      useSession.setState({ signalingReady: true });
      deadline("channel");
      const conn = guestPeer.connect(`gambilopoly-${code}`, {
        reliable: true,
        serialization: "json",
      });
      upstream = conn;
      observeConnection(conn, (networkDetails) => {
        if (version === generation) useSession.setState({ networkDetails });
      });
      let lastHost = Date.now();
      conn.on("iceStateChanged", (state) => {
        if (
          version !== generation ||
          useSession.getState().status !== "connecting"
        )
          return;
        connectionDetails(`Opening peer connection · ICE ${state}`);
        if (state === "failed")
          fail(connectionError({ type: "webrtc" }), { type: "webrtc" });
      });
      conn.on("open", () => {
        if (
          version !== generation ||
          useSession.getState().status !== "connecting"
        ) {
          conn.close();
          return;
        }
        lastHost = Date.now();
        connectionDetails("Joining the host's lobby…");
        deadline("admission");
        // Heartbeats measure an established channel, never ICE negotiation.
        heartbeat = setInterval(() => {
          if (generation !== version) {
            clearInterval(heartbeat);
            return;
          }
          if (Date.now() - lastHost > 15000)
            fail(
              "Connection to the host was lost. Ask the host to keep the game tab open.",
            );
        }, 3000);
        send(conn, {
          type: "hello",
          name: name.trim().slice(0, 24) || "Guest",
        });
      });
      conn.on("data", (raw) => {
        if (version !== generation || useSession.getState().status === "error")
          return;
        try {
          if (
            !raw ||
            typeof raw !== "object" ||
            JSON.stringify(raw).length > 120000
          )
            throw Error("Invalid host message.");
          const message = raw as Record<string, unknown>;
          lastHost = Date.now();
          if (message.type === "ping") {
            send(conn, { type: "pong" });
            return;
          }
          if (message.type === "chat") {
            const chat = chatHistorySchema.parse(message.chat);
            useSession.setState({ chat, chatPending: false });
            return;
          }
          if (["rejected", "kicked", "error"].includes(String(message.type))) {
            const text = String(message.message).slice(0, 250);
            if (
              message.type !== "error" ||
              useSession.getState().status === "connecting"
            )
              fail(text);
            else report(Error(text));
            return;
          }
          if (message.type !== "sync") return;
          const lobby = lobbySchema.parse(message.lobby);
          if (
            lobby.code !== code ||
            typeof message.me !== "string" ||
            !lobby.members.some((m) => m.id === message.me)
          )
            throw Error("Invalid room assignment.");
          const next = message.game
            ? parseSnapshot({ version: 1, state: message.game })
            : null;
          if (message.game && !next) throw Error("Invalid game state.");
          if (next && game?.id === next.id && next.revision < game.revision)
            return;
          clearTimeout(timer);
          connectionDetails("Connected to host");
          game = next;
          useSession.setState({
            me: message.me,
            lobby,
            status: next
              ? lobby.members.every((m) => m.connected)
                ? "playing"
                : "paused"
              : "lobby",
            message: "",
            pending: false,
            ...(message.chat
              ? { chat: chatHistorySchema.parse(message.chat) }
              : {}),
          });
          if (next) {
            const rolled =
              message.rolled === "roll" || message.rolled === "opening-roll"
                ? message.rolled
                : undefined;
            useGame.getState().receive(next, rolled);
          }
        } catch (e) {
          report(e);
        }
      });
      conn.on("close", () =>
        fail(
          stage === "channel"
            ? timeoutMessage("channel", usesLocalRooms)
            : "Connection to the host was lost. The host must keep the game open.",
        ),
      );
      conn.on("error", (error) =>
        fail(connectionError(error, usesLocalRooms), error),
      );
    });
    peer.on("error", (error) =>
      fail(connectionError(error, usesLocalRooms), error),
    );
  } catch (e) {
    report(e);
    useSession.setState({ status: "error" });
  }
}
export function updateProfile(id: string, profile: unknown) {
  try {
    const s = useSession.getState();
    if (game) throw Error("The match has already started.");
    if (s.mode === "guest") {
      send(upstream!, { type: "profile", profile });
      return;
    }
    useSession.setState({
      lobby: editMember(s.lobby!, s.me, id, profile),
      message: "",
    });
    sync();
  } catch (e) {
    report(e);
  }
}
export function toggleReady() {
  const s = useSession.getState(),
    member = s.lobby?.members.find((m) => m.id === s.me);
  if (s.mode === "guest" && member)
    send(upstream!, { type: "ready", ready: !member.ready });
}
export function kickPlayer(id: string) {
  try {
    const s = useSession.getState();
    if (game) throw Error("Players can only be removed in the lobby.");
    const lobby = removeMember(s.lobby!, s.me, id),
      conn = connections.get(id);
    if (conn) {
      banned.add(conn.peer);
      send(conn, {
        type: "kicked",
        message: "The host removed you from the lobby.",
      });
      connections.delete(id);
      setTimeout(() => conn.close(), 250);
    }
    useSession.setState({ lobby });
    sync();
    if (conn)
      lobbyActivity(
        `${s.lobby?.members.find((m) => m.id === id)?.name ?? "A player"} was removed by the host.`,
      );
  } catch (e) {
    report(e);
  }
}
export function addBot() {
  try {
    const s = useSession.getState();
    if (s.mode !== "single" || game) return;
    const lobby = s.lobby!,
      bot = newMember(
        lobby,
        `bot-${randomId()}`,
        `Bot ${lobby.members.length}`,
        true,
      );
    useSession.setState({
      lobby: {
        ...lobby,
        revision: lobby.revision + 1,
        members: [...lobby.members, bot],
      },
    });
  } catch (e) {
    report(e);
  }
}
export function startMatch() {
  try {
    const s = useSession.getState();
    if (
      s.mode === "guest" ||
      !s.lobby ||
      !canStart(s.lobby) ||
      s.status !== "lobby"
    )
      throw Error(
        "Wait for at least two players and for everyone to be ready.",
      );
    game = createGame(s.lobby.members);
    game.mode = s.mode === "single" ? "single" : "online";
    busyUntil = 0;
    sync();
  } catch (e) {
    report(e);
  }
}
function commit(
  input: Action,
  actor: string,
  revision: number,
  system = false,
) {
  if (!game || game.status !== "playing")
    throw Error("The match is not active.");
  const s = useSession.getState(),
    action = authorizeAction(
      game,
      input,
      actor,
      s.lobby!.hostId,
      revision,
      system,
    );
  if (s.status === "paused")
    throw Error("The match is paused because a player disconnected.");
  if (performance.now() < busyUntil)
    throw Error("Wait for the dice and movement to finish.");
  game = applyAction(game, action);
  if (action.type === "roll" || action.type === "opening-roll")
    busyUntil =
      performance.now() +
      1000 *
        (game.movement?.revision === game.revision
          ? movementDuration(game.movement.steps)
          : DICE_SECONDS);
  sync(action.type);
}
function requestAction(action: Action) {
  try {
    const s = useSession.getState();
    if (s.mode === "guest") {
      if (s.pending || s.status !== "playing" || action.playerId !== s.me)
        throw Error("Wait for your turn and connection.");
      useSession.setState({ pending: true });
      send(upstream!, {
        type: "action",
        requestId: randomId(),
        revision: useGame.getState().state!.revision,
        action,
      });
      const version = generation;
      setTimeout(() => {
        if (generation === version && useSession.getState().pending)
          report(
            Error(
              "The host has not confirmed the action. Check your connection.",
            ),
          );
      }, 8000);
    } else commit(action, s.me, useGame.getState().state!.revision);
  } catch (e) {
    report(e);
  }
}
export function systemAction(action: Action) {
  const s = useSession.getState();
  if (s.mode === "guest") return;
  try {
    commit(
      action,
      ["advance-intro", "skip-intro", "begin"].includes(action.type)
        ? s.me
        : action.playerId,
      game!.revision,
      true,
    );
  } catch (e) {
    report(e);
  }
}
export function animationWait() {
  return Math.max(0, busyUntil - performance.now());
}
window.addEventListener("pagehide", () => {
  if (useSession.getState().mode) leaveSession();
});
export function resumeSingle(saved: GameState) {
  if (saved.mode !== "single") return;
  prepare("single", saved.players.find((p) => !p.bot)?.name ?? "Player 1");
  const me = saved.players.find((p) => !p.bot)!.id;
  useSession.setState({
    me,
    lobby: {
      code: "",
      hostId: me,
      revision: 0,
      members: saved.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        token: p.token,
        color: p.color ?? ["#f0a35c", "#9dccbd", "#bb9de0", "#da91a2"][i],
        bot: !!p.bot,
        ready: true,
        connected: true,
      })),
    },
  });
  game = saved;
  sync();
}
