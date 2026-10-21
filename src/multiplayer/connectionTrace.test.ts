import { expect, it } from "vitest";
import { observeConnection } from "./connectionTrace";
import type { RoomConnection } from "./transport";
it("reports handshake/candidate progress without exposing SDP, IPs or credentials and detaches on close", () => {
  const pc = Object.assign(new EventTarget(), {
    signalingState: "have-local-offer",
    iceConnectionState: "checking",
    remoteDescription: { sdp: "private-password and 192.0.2.1" },
  });
  let closed = () => {};
  const conn = {
    peerConnection: pc,
    on(_event: string, fn: () => void) {
      closed = fn;
    },
  } as unknown as RoomConnection;
  const summaries: string[] = [];
  observeConnection(conn, (summary) => summaries.push(summary));
  pc.dispatchEvent(
    Object.assign(new Event("icecandidate"), {
      candidate: { type: "relay", address: "192.0.2.1" },
    }),
  );
  pc.dispatchEvent(
    Object.assign(new Event("icecandidateerror"), {
      errorCode: 701,
      errorText: "private-password",
    }),
  );
  expect(summaries.at(-1)).toContain("relay 1");
  expect(summaries.at(-1)).toContain("701");
  expect(summaries.at(-1)).toContain("Remote description: received");
  expect(summaries.join(" ")).not.toContain("private-password");
  expect(summaries.join(" ")).not.toContain("192.0.2.1");
  closed();
  const length = summaries.length;
  pc.dispatchEvent(new Event("signalingstatechange"));
  expect(summaries).toHaveLength(length);
});
