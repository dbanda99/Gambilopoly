import { z } from "zod";
import { TOKENS } from "../engine/boardData";
import type { Token } from "../engine/types";
export const COLORS = [
  "#f0a35c",
  "#9dccbd",
  "#bb9de0",
  "#da91a2",
  "#e4cf76",
  "#91baf2",
  "#d77063",
  "#b4c478",
];
export const tokenSchema = z.enum([
  "pumpkin",
  "ghost",
  "vampire",
  "witch",
  "rattle",
  "sparks",
  "warps",
]);
export const memberSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(24),
  token: tokenSchema,
  color: z.enum(COLORS as [string, ...string[]]),
  bot: z.boolean(),
  ready: z.boolean(),
  connected: z.boolean(),
});
export const lobbySchema = z.object({
  code: z.string().max(8),
  hostId: z.string().max(80),
  members: z.array(memberSchema).min(1).max(4),
  revision: z.number().int().nonnegative(),
});
export type Member = z.infer<typeof memberSchema>;
export type RoomLobby = z.infer<typeof lobbySchema>;
export const profileSchema = memberSchema
  .pick({ name: true, token: true, color: true })
  .partial();
export function newMember(
  lobby: RoomLobby,
  id: string,
  name: string,
  bot = false,
): Member {
  if (lobby.members.length >= 4) throw Error("This lobby is full (4 players).");
  return {
    id,
    name: name.trim().slice(0, 24) || "Guest",
    token: (Object.keys(TOKENS) as Token[]).find(
      (t) => !lobby.members.some((m) => m.token === t),
    )!,
    color: COLORS.find((c) => !lobby.members.some((m) => m.color === c))!,
    bot,
    ready: bot,
    connected: true,
  };
}
export function editMember(
  lobby: RoomLobby,
  actor: string,
  id: string,
  profile: unknown,
): RoomLobby {
  const target = lobby.members.find((m) => m.id === id);
  if (!target || !(actor === id || (actor === lobby.hostId && target.bot)))
    throw Error("You can only customize your own player.");
  const patch = profileSchema.parse(profile),
    updated = { ...target, ...patch, ready: target.bot };
  if (
    lobby.members.some(
      (m) =>
        m.id !== id && (m.token === updated.token || m.color === updated.color),
    )
  )
    throw Error("That character or color is already taken.");
  return {
    ...lobby,
    revision: lobby.revision + 1,
    members: lobby.members.map((m) => (m.id === id ? updated : m)),
  };
}
export function removeMember(
  lobby: RoomLobby,
  actor: string,
  id: string,
): RoomLobby {
  if (actor !== lobby.hostId || id === lobby.hostId)
    throw Error("Only the host can remove other players.");
  return {
    ...lobby,
    revision: lobby.revision + 1,
    members: lobby.members.filter((m) => m.id !== id),
  };
}
export function canStart(lobby: RoomLobby) {
  return (
    lobby.members.length >= 2 &&
    lobby.members.every(
      (m) => m.connected && (m.id === lobby.hostId || m.ready),
    )
  );
}
export function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s/g, "");
}
