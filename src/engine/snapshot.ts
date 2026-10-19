import { z } from "zod";
import { BOARD } from "./boardData";
import type { GameState } from "./types";
const integer = z.number().int().nonnegative();
const player = z.object({
  id: z.string(),
  name: z.string().min(1).max(24),
  token: z.enum([
    "pumpkin",
    "ghost",
    "vampire",
    "witch",
    "rattle",
    "sparks",
    "warps",
  ]),
  position: integer.max(39),
  money: integer,
  propertyIds: z.array(integer.max(39)),
  inJail: z.boolean(),
  jailTurns: integer.max(3),
  bankrupt: z.boolean(),
});
const snapshot = z.object({
  version: z.literal(1),
  state: z.object({
    id: z.string(),
    players: z.array(player).min(2).max(4),
    currentPlayerIndex: integer.max(3),
    phase: z.enum(["opening", "roll", "purchase", "end"]),
    opening: z
      .object({
        stage: z.enum(["tour", "introductions", "order", "ready"]),
        spotlightIndex: integer.max(3),
        round: integer.min(1),
        candidateIds: z.array(z.string()).min(1).max(4),
        rolls: z.record(
          z.string(),
          z.tuple([integer.min(1).max(6), integer.min(1).max(6)]),
        ),
        history: z
          .array(
            z.object({
              round: integer.min(1),
              playerId: z.string(),
              dice: z.tuple([integer.min(1).max(6), integer.min(1).max(6)]),
            }),
          )
          .max(40),
        winnerId: z.string().nullable(),
      })
      .nullable()
      .optional(),
    properties: z.record(
      z.string(),
      z.object({
        ownerId: z.string().nullable(),
        buildings: integer.max(5),
        mortgaged: z.boolean(),
      }),
    ),
    dice: z.tuple([integer.min(1).max(6), integer.min(1).max(6)]).nullable(),
    revision: integer,
    status: z.enum(["playing", "finished"]),
    doubles: integer.max(3),
    extraTurn: z.boolean(),
    log: z.array(z.string()).max(60),
    movement: z
      .object({
        playerId: z.string(),
        from: integer.max(39),
        steps: integer.max(12),
        revision: integer,
      })
      .nullable(),
  }),
});
export function parseSnapshot(value: unknown): GameState | null {
  const result = snapshot.safeParse(value);
  if (!result.success) return null;
  const s = result.data.state;
  const ids = new Set(s.players.map((p) => p.id));
  if (!s.players[s.currentPlayerIndex]) return null;
  if (s.phase === "opening") {
    const o = s.opening;
    if (!o || s.status !== "playing" || o.spotlightIndex >= s.players.length)
      return null;
    if (
      new Set(o.candidateIds).size !== o.candidateIds.length ||
      o.candidateIds.some((id) => !ids.has(id))
    )
      return null;
    if (
      Object.keys(o.rolls).some((id) => !o.candidateIds.includes(id)) ||
      o.history.some((r) => !ids.has(r.playerId))
    )
      return null;
    if (
      o.stage === "ready" &&
      (!o.winnerId || s.players[s.currentPlayerIndex].id !== o.winnerId)
    )
      return null;
    if (
      o.stage === "order" &&
      (!o.candidateIds.includes(s.players[s.currentPlayerIndex].id) ||
        o.rolls[s.players[s.currentPlayerIndex].id])
    )
      return null;
  } else if (s.opening) return null;
  if (
    ids.size !== s.players.length ||
    new Set(s.players.map((p) => p.token)).size !== s.players.length ||
    s.currentPlayerIndex >= s.players.length
  )
    return null;
  if (
    s.status === "playing" &&
    s.players[s.currentPlayerIndex].bankrupt &&
    s.phase !== "end"
  )
    return null;
  if (
    BOARD.some(
      (tile) =>
        tile.price &&
        (!s.properties[tile.id] ||
          (s.properties[tile.id].ownerId !== null &&
            !ids.has(s.properties[tile.id].ownerId!))),
    )
  )
    return null;
  for (const p of s.players) {
    if (
      new Set(p.propertyIds).size !== p.propertyIds.length ||
      p.propertyIds.some((id) => s.properties[id]?.ownerId !== p.id)
    )
      return null;
  }
  if (
    Object.entries(s.properties).some(
      ([id, p]) =>
        p.ownerId &&
        !s.players
          .find((player) => player.id === p.ownerId)
          ?.propertyIds.includes(Number(id)),
    )
  )
    return null;
  return s;
}
