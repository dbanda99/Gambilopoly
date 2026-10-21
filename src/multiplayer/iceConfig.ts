import { z } from "zod";
const url = z.string().regex(/^(stun|stuns|turn|turns):\S+$/i);
const serversSchema = z
  .array(
    z.object({
      urls: z.union([url, z.array(url).min(1).max(12)]),
      username: z.string().optional(),
      credential: z.string().optional(),
    }),
  )
  .min(1)
  .max(12);

export function iceConfig(raw?: string): {
  iceServers: RTCIceServer[];
  hasRelay: boolean;
} {
  if (!raw?.trim())
    return {
      // PeerJS 1.5.5's bundled TURN hostnames no longer resolve. Do not present
      // them as an available fallback. A deployment must configure a real relay.
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      hasRelay: false,
    };
  try {
    if (raw.length > 30000) throw Error();
    const iceServers = serversSchema.parse(JSON.parse(raw));
    const hasRelay = iceServers.some((s) =>
      (Array.isArray(s.urls) ? s.urls : [s.urls]).some((u) =>
        /^turns?:/i.test(u),
      ),
    );
    return { iceServers, hasRelay };
  } catch {
    // Never put raw JSON or credential contents in a user-visible exception.
    throw Error(
      "Invalid relay configuration. Set VITE_ICE_SERVERS to a JSON array of RTCIceServer entries and rebuild the site.",
    );
  }
}
