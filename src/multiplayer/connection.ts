export const CONNECTION_TIMEOUT = {
  signaling: 25000,
  channel: 45000,
  admission: 10000,
} as const;

export function connectionError(error: unknown, local = false): string {
  const type = (error as { type?: string } | null)?.type;
  if (local && type === "peer-unavailable")
    return "This room is not on this preview server. Open the same Vite address and port in both browsers, then copy a fresh code from the host.";
  if (
    local &&
    [
      "network",
      "server-error",
      "socket-error",
      "socket-closed",
      "disconnected",
    ].includes(type ?? "")
  )
    return "The local preview connection was lost. Keep npm run dev running, refresh both browsers, and create a new room.";
  switch (type) {
    case "peer-unavailable":
      return "This room is not registered online. Ask the host to check that their lobby says Room online, then copy its current code.";
    case "browser-incompatible":
      return "This browser cannot open a WebRTC connection. Open the HTTPS game link in a current Chrome, Edge, Safari or Firefox browser.";
    case "network":
    case "server-error":
    case "socket-error":
    case "socket-closed":
    case "disconnected":
      return "The room signaling service could not be reached. Check your internet connection and retry; a VPN or network filter may block it.";
    case "webrtc":
      return "The browsers could not open a peer connection. On the same Wi-Fi, check guest-network isolation, VPNs and firewall permissions. A restricted network may need a TURN relay.";
    case "unavailable-id":
      return "This room code is already in use. Go back and create a new room.";
    default:
      return "The connection could not be opened. Retry and check Connection details below.";
  }
}

export function timeoutMessage(
  stage: keyof typeof CONNECTION_TIMEOUT,
  local = false,
): string {
  if (local && stage !== "admission")
    return "The local preview room did not respond. Restart npm run dev and open its exact address and port in both browsers, then create a new room.";
  if (stage === "signaling")
    return "The room signaling service did not respond. Check your internet connection, VPN or network filter, then retry.";
  if (stage === "admission")
    return "Connected to the host, but the lobby did not respond. Ask the host to bring the game tab to the foreground, then retry.";
  return "The peer connection did not open in time. Keep the host's lobby open. On the same Wi-Fi, check guest-network isolation, VPNs and firewall permissions; a restricted network may need a TURN relay.";
}
