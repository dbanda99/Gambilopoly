import type { RoomConnection } from "./transport";
export function observeConnection(
  conn: RoomConnection,
  publish: (summary: string) => void,
) {
  const pc = conn.peerConnection;
  if (!pc) return;
  const counts = { host: 0, srflx: 0, relay: 0 };
  const errors = new Set<number>();
  const update = () =>
    publish(
      [
        `SDP: ${pc.signalingState}`,
        `Remote description: ${pc.remoteDescription ? "received" : "not received"}`,
        `ICE: ${pc.iceConnectionState}`,
        `Candidates: direct ${counts.host}, public ${counts.srflx}, relay ${counts.relay}`,
        ...(errors.size ? [`ICE error codes: ${[...errors].join(", ")}`] : []),
      ].join(" · "),
    );
  const candidate = (event: RTCPeerConnectionIceEvent) => {
    const type = event.candidate?.type;
    if (type === "host" || type === "srflx" || type === "relay") counts[type]++;
    update();
  };
  const error = (event: RTCPeerConnectionIceErrorEvent) => {
    if (errors.size < 10) errors.add(event.errorCode);
    update();
  };
  pc.addEventListener("signalingstatechange", update);
  pc.addEventListener("iceconnectionstatechange", update);
  pc.addEventListener("icecandidate", candidate);
  pc.addEventListener("icecandidateerror", error);
  conn.on("close", () => {
    update();
    pc.removeEventListener("signalingstatechange", update);
    pc.removeEventListener("iceconnectionstatechange", update);
    pc.removeEventListener("icecandidate", candidate);
    pc.removeEventListener("icecandidateerror", error);
  });
  update();
}
