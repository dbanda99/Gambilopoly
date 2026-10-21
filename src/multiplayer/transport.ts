import Peer, { type PeerOptions } from "peerjs";
import { LocalPeer } from "./localPeer";

export interface RoomConnection {
  peerConnection?: RTCPeerConnection;
  peer: string;
  open: boolean;
  send(data: unknown): void;
  close(): void;
  on(event: "open" | "close", listener: () => void): unknown;
  on(event: "data" | "error", listener: (data: unknown) => void): unknown;
  on(
    event: "iceStateChanged",
    listener: (state: RTCIceConnectionState) => void,
  ): unknown;
}
export interface RoomPeer {
  destroyed: boolean;
  connect(
    target: string,
    options?: Parameters<Peer["connect"]>[1],
  ): RoomConnection;
  destroy(): void;
  reconnect(): void;
  on(event: "open" | "disconnected", listener: () => void): unknown;
  on(event: "error", listener: (error: unknown) => void): unknown;
  on(
    event: "connection",
    listener: (connection: RoomConnection) => void,
  ): unknown;
}
export const usesLocalRooms =
  import.meta.env.DEV &&
  !!import.meta.hot &&
  import.meta.env.VITE_ROOM_TRANSPORT !== "webrtc";

export function createRoomPeer(
  id: string | undefined,
  options: PeerOptions,
): RoomPeer {
  return usesLocalRooms
    ? new LocalPeer(id)
    : id
      ? new Peer(id, options)
      : new Peer(options);
}
