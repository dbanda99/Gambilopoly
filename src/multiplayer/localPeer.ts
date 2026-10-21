import { randomId } from "../utils/id";
import type { RoomConnection, RoomPeer } from "./transport";

const channel = "gambilopoly:local-room";
class Events {
  private listeners = new Map<string, ((...args: any[]) => void)[]>();
  on(event: string, listener: (...args: any[]) => void) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }
  emit(event: string, ...args: unknown[]) {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}
class LocalConnection extends Events implements RoomConnection {
  open = false;
  closed = false;
  constructor(
    readonly owner: LocalPeer,
    readonly peer: string,
    readonly id: string,
  ) {
    super();
  }
  send(data: unknown) {
    if (this.open)
      this.owner.send({ kind: "data", connectionId: this.id, data });
  }
  close() {
    if (this.closed) return;
    this.owner.send({ kind: "close", connectionId: this.id });
    this.end();
  }
  end() {
    if (this.closed) return;
    this.closed = true;
    this.open = false;
    this.owner.connections.delete(this.id);
    this.emit("close");
  }
}

// Development-only adapter. The host still validates every action and owns the
// engine; Vite only forwards messages between clients of this preview server.
export class LocalPeer extends Events implements RoomPeer {
  readonly id: string;
  destroyed = false;
  readonly connections = new Map<string, LocalConnection>();
  private hot = import.meta.hot!;
  constructor(id?: string) {
    super();
    this.id = id ?? `guest-${randomId()}`;
    this.hot.on(channel, this.receive);
    this.hot.on("vite:ws:disconnect", this.disconnected);
    this.send({ kind: "register" });
  }
  send(message: Record<string, unknown>) {
    if (!this.destroyed)
      this.hot.send(channel, { ...message, sender: this.id });
  }
  private receive = (message: {
    to: string;
    kind: string;
    connectionId?: string;
    peer?: string;
    data?: unknown;
    type?: string;
  }) => {
    if (message.to !== this.id || this.destroyed) return;
    if (message.kind === "registered") {
      this.emit("open");
      return;
    }
    if (message.kind === "error") {
      this.emit("error", { type: message.type });
      return;
    }
    if (message.kind === "connection") {
      const conn = new LocalConnection(
        this,
        message.peer!,
        message.connectionId!,
      );
      this.connections.set(conn.id, conn);
      this.emit("connection", conn);
      return;
    }
    const conn = this.connections.get(message.connectionId!);
    if (!conn) return;
    if (message.kind === "open") {
      conn.open = true;
      conn.emit("open");
    }
    if (message.kind === "data") conn.emit("data", message.data);
    if (message.kind === "close") conn.end();
  };
  private disconnected = () => {
    if (this.destroyed) return;
    this.emit("error", { type: "network" });
    for (const conn of [...this.connections.values()]) conn.end();
  };
  connect(target: string) {
    const conn = new LocalConnection(this, target, randomId());
    this.connections.set(conn.id, conn);
    this.send({ kind: "connect", target, connectionId: conn.id });
    return conn;
  }
  reconnect() {
    this.send({ kind: "register" });
  }
  destroy() {
    if (this.destroyed) return;
    this.send({ kind: "unregister" });
    this.destroyed = true;
    this.hot.off(channel, this.receive);
    this.hot.off("vite:ws:disconnect", this.disconnected);
    for (const conn of [...this.connections.values()]) conn.end();
  }
}
