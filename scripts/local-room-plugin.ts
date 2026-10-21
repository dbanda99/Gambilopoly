import type { Plugin, WebSocketClient } from "vite";
import { LocalRoomRouter } from "./local-room-router";
export function localRooms(): Plugin {
  return {
    name: "gambilopoly-local-rooms",
    apply: "serve",
    configureServer(server) {
      const router = new LocalRoomRouter();
      const tracked = new WeakSet<WebSocketClient>();
      server.ws.on("gambilopoly:local-room", (message, client) => {
        if (!tracked.has(client)) {
          tracked.add(client);
          client.socket.once("close", () => router.disconnect(client));
        }
        router.receive(client, message);
      });
    },
  };
}
