import { expect, it } from "vitest";
import { LocalRoomRouter } from "../../scripts/local-room-router";
function client() {
  const messages: any[] = [];
  return {
    messages,
    send(_channel: string, value: unknown) {
      messages.push(value);
    },
  };
}
function setup() {
  const router = new LocalRoomRouter(),
    host = client(),
    guest = client(),
    stranger = client();
  router.receive(host, { kind: "register", sender: "gambilopoly-ABCDEFGH" });
  router.receive(guest, { kind: "register", sender: "guest-1" });
  router.receive(stranger, { kind: "register", sender: "guest-2" });
  const connect = () =>
    router.receive(guest, {
      kind: "connect",
      sender: "guest-1",
      target: "gambilopoly-ABCDEFGH",
      connectionId: "link-1",
    });
  return { router, host, guest, stranger, connect };
}
it("forwards ordered connections and data only to the other endpoint", () => {
  const { router, host, guest, stranger, connect } = setup();
  connect();
  expect(host.messages.slice(-2).map((m) => m.kind)).toEqual([
    "connection",
    "open",
  ]);
  router.receive(guest, {
    kind: "data",
    sender: "guest-1",
    connectionId: "link-1",
    data: { type: "hello", name: "Friend" },
  });
  expect(host.messages.at(-1).data).toEqual({ type: "hello", name: "Friend" });
  expect(stranger.messages).toHaveLength(1);
});
it("rejects identity spoofing, link injection and duplicate host registrations", () => {
  const { router, host, stranger, connect } = setup();
  connect();
  const before = host.messages.length;
  router.receive(stranger, {
    kind: "data",
    sender: "guest-1",
    connectionId: "link-1",
    data: "spoof",
  });
  router.receive(stranger, {
    kind: "data",
    sender: "guest-2",
    connectionId: "link-1",
    data: "inject",
  });
  router.receive(stranger, {
    kind: "register",
    sender: "gambilopoly-ABCDEFGH",
  });
  expect(host.messages).toHaveLength(before);
  expect(stranger.messages.at(-1).type).toBe("unavailable-id");
});
it("releases room codes on host disconnect and notifies guests", () => {
  const { router, host, guest, stranger, connect } = setup();
  connect();
  router.disconnect(host);
  expect(guest.messages.at(-1).kind).toBe("close");
  connect();
  expect(guest.messages.at(-1).type).toBe("peer-unavailable");
  router.disconnect(stranger);
  router.receive(stranger, {
    kind: "register",
    sender: "gambilopoly-ABCDEFGH",
  });
  expect(stranger.messages.at(-1).kind).toBe("registered");
});
it("ignores malformed and oversized messages without breaking a room", () => {
  const { router, guest, host, connect } = setup();
  connect();
  const before = host.messages.length;
  for (const raw of [
    null,
    { kind: "other" },
    {
      kind: "data",
      sender: "guest-1",
      connectionId: "link-1",
      data: "x".repeat(130000),
    },
  ])
    router.receive(guest, raw);
  expect(host.messages).toHaveLength(before);
  router.receive(guest, {
    kind: "close",
    sender: "guest-1",
    connectionId: "link-1",
  });
  expect(host.messages.at(-1).kind).toBe("close");
});
