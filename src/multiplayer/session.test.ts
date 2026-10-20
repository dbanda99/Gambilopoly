import { afterEach, beforeEach, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { addEventListener() {}, isSecureContext: true },
  });
  class Events {
    handlers = new Map<string, ((...args: any[]) => void)[]>();
    on(name: string, fn: (...args: any[]) => void) {
      this.handlers.set(name, [...(this.handlers.get(name) ?? []), fn]);
      return this;
    }
    emit(name: string, ...args: any[]) {
      for (const fn of this.handlers.get(name) ?? []) fn(...args);
    }
  }
  class Connection extends Events {
    peer = "guest-peer";
    open = false;
    closed = false;
    messages: any[] = [];
    send(data: unknown) {
      this.messages.push(data);
    }
    close() {
      if (this.closed) return;
      this.closed = true;
      this.open = false;
      this.emit("close");
    }
    ready() {
      this.open = true;
      this.emit("open");
    }
  }
  const peers: Peer[] = [];
  class Peer extends Events {
    destroyed = false;
    conn = new Connection();
    constructor(..._args: any[]) {
      super();
      peers.push(this);
    }
    connect() {
      return this.conn;
    }
    destroy() {
      this.destroyed = true;
      this.conn.close();
    }
    reconnect() {}
  }
  return { Peer, Connection, peers };
});
vi.mock("peerjs", () => ({ default: fake.Peer }));
import { createRoom, joinRoom, leaveSession, useSession } from "./session";

beforeEach(() => {
  vi.useFakeTimers();
  fake.peers.length = 0;
  leaveSession();
});
afterEach(() => {
  leaveSession();
  vi.clearAllTimers();
  vi.useRealTimers();
});
const current = () => fake.peers.at(-1)!;

it("allows slow ICE on the host and starts the hello deadline after the channel opens", () => {
  createRoom("Host");
  current().emit("open");
  const conn = new fake.Connection();
  current().emit("connection", conn);
  vi.advanceTimersByTime(18000);
  expect(conn.closed).toBe(false);
  conn.ready();
  vi.advanceTimersByTime(9000);
  conn.emit("data", { type: "hello", name: "Guest" });
  expect(useSession.getState().lobby?.members).toHaveLength(2);
  expect(conn.messages.some((m) => m.type === "sync")).toBe(true);
});

it("gives signaling and ICE separate budgets and never heartbeats a channel before open", () => {
  joinRoom("ABCDEFGH", "Guest");
  vi.advanceTimersByTime(20000);
  current().emit("open");
  vi.advanceTimersByTime(22000);
  expect(useSession.getState().status).toBe("connecting");
  expect(current().conn.closed).toBe(false);
  current().conn.ready();
  expect(current().conn.messages).toContainEqual({
    type: "hello",
    name: "Guest",
  });
  const members = [
    {
      id: "host",
      name: "Host",
      token: "pumpkin",
      color: "#f0a35c",
      bot: false,
      ready: false,
      connected: true,
    },
    {
      id: "guest",
      name: "Guest",
      token: "ghost",
      color: "#9dccbd",
      bot: false,
      ready: false,
      connected: true,
    },
  ];
  current().conn.emit("data", {
    type: "sync",
    me: "guest",
    lobby: { code: "ABCDEFGH", hostId: "host", revision: 1, members },
    game: null,
  });
  expect(useSession.getState().status).toBe("lobby");
  expect(useSession.getState().connectionStep).toBe("Connected to host");
});

it("times out an unanswered admission separately and preserves host errors", () => {
  joinRoom("ABCDEFGH", "Guest");
  current().emit("open");
  current().conn.ready();
  vi.advanceTimersByTime(10001);
  expect(useSession.getState().message).toContain("lobby did not respond");
  expect(current().destroyed).toBe(true);
  joinRoom("ABCDEFGH", "Guest");
  current().emit("open");
  current().conn.ready();
  current().conn.emit("data", {
    type: "error",
    message: "Host admission failed",
  });
  vi.advanceTimersByTime(60000);
  expect(useSession.getState().message).toBe("Host admission failed");
});

it("distinguishes unavailable rooms, signaling failures and ICE failures", () => {
  for (const [type, text] of [
    ["peer-unavailable", "not registered"],
    ["network", "signaling service"],
    ["webrtc", "firewall"],
  ]) {
    joinRoom("ABCDEFGH", "Guest");
    current().emit("error", { type });
    expect(useSession.getState().message).toContain(text);
    expect(useSession.getState().connectionDetails).toContain(type);
    expect(current().destroyed).toBe(true);
  }
});

it("ignores late callbacks from a cancelled attempt", () => {
  joinRoom("ABCDEFGH", "Old");
  const old = current();
  joinRoom("BCDEFGHJ", "New");
  current().emit("open");
  old.emit("open");
  old.emit("error", { type: "peer-unavailable" });
  vi.advanceTimersByTime(26000);
  expect(useSession.getState().status).toBe("connecting");
  expect(useSession.getState().message).toBe("");
});
