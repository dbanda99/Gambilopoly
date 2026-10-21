import { z } from "zod";
const id = z.string().regex(/^[a-zA-Z0-9-]{1,100}$/);
const schema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("register"), sender: id }),
  z.object({ kind: z.literal("unregister"), sender: id }),
  z.object({
    kind: z.literal("connect"),
    sender: id,
    target: id,
    connectionId: id,
  }),
  z.object({
    kind: z.literal("data"),
    sender: id,
    connectionId: id,
    data: z.unknown(),
  }),
  z.object({ kind: z.literal("close"), sender: id, connectionId: id }),
]);
type Client = { send(event: string, data: unknown): void };
type Endpoint = { id: string; client: Client };
type Link = { a: Endpoint; b: Endpoint };
const channel = "gambilopoly:local-room";
export class LocalRoomRouter {
  private peers = new Map<string, Client>();
  private clients = new Map<Client, string>();
  private links = new Map<string, Link>();
  private send(endpoint: Endpoint, message: Record<string, unknown>) {
    endpoint.client.send(channel, { ...message, to: endpoint.id });
  }
  receive(client: Client, raw: unknown) {
    try {
      if (JSON.stringify(raw).length > 130000) return;
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return;
      const m = parsed.data,
        source = { id: m.sender, client };
      if (m.kind === "register") {
        if (
          (this.peers.has(m.sender) && this.peers.get(m.sender) !== client) ||
          (this.clients.has(client) && this.clients.get(client) !== m.sender)
        ) {
          this.send(source, { kind: "error", type: "unavailable-id" });
          return;
        }
        if (this.peers.size >= 128) return;
        this.peers.set(m.sender, client);
        this.clients.set(client, m.sender);
        this.send(source, { kind: "registered" });
        return;
      }
      if (this.peers.get(m.sender) !== client) return;
      if (m.kind === "unregister") {
        this.disconnect(client);
        return;
      }
      if (m.kind === "connect") {
        const target = this.peers.get(m.target);
        if (
          !target ||
          target === client ||
          !m.target.startsWith("gambilopoly-")
        ) {
          this.send(source, { kind: "error", type: "peer-unavailable" });
          return;
        }
        if (this.links.has(m.connectionId) || this.links.size >= 128) return;
        const destination = { id: m.target, client: target };
        this.links.set(m.connectionId, { a: source, b: destination });
        this.send(destination, {
          kind: "connection",
          connectionId: m.connectionId,
          peer: m.sender,
        });
        this.send(destination, { kind: "open", connectionId: m.connectionId });
        this.send(source, { kind: "open", connectionId: m.connectionId });
        return;
      }
      const link = this.links.get(m.connectionId);
      if (!link) return;
      const other =
        link.a.client === client
          ? link.b
          : link.b.client === client
            ? link.a
            : null;
      if (!other) return;
      if (m.kind === "close") this.links.delete(m.connectionId);
      this.send(other, {
        kind: m.kind,
        connectionId: m.connectionId,
        ...(m.kind === "data" ? { data: m.data } : {}),
      });
    } catch {
      /* A malformed preview message must not crash Vite. */
    }
  }
  disconnect(client: Client) {
    const id = this.clients.get(client);
    if (!id) return;
    this.clients.delete(client);
    this.peers.delete(id);
    for (const [connectionId, link] of this.links) {
      if (link.a.client !== client && link.b.client !== client) continue;
      this.links.delete(connectionId);
      this.send(link.a.client === client ? link.b : link.a, {
        kind: "close",
        connectionId,
      });
    }
  }
}
