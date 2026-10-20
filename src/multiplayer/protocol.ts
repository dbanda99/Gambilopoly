import { z } from "zod";
import { profileSchema } from "./lobby";
const simple = z.enum([
  "roll",
  "buy",
  "pass",
  "end",
  "bail",
  "resign",
  "advance-intro",
  "skip-intro",
  "opening-roll",
  "begin",
  "ack-card",
]);
export const actionSchema = z.union([
  z.object({ type: simple, playerId: z.string().max(80) }),
  z.object({
    type: z.enum(["build", "sell-building"]),
    playerId: z.string().max(80),
    spaceId: z.number().int().min(0).max(39),
  }),
]);
export const requestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hello"),
    name: z.string().trim().min(1).max(24),
  }),
  z.object({ type: z.literal("profile"), profile: profileSchema }),
  z.object({ type: z.literal("ready"), ready: z.boolean() }),
  z.object({
    type: z.literal("action"),
    requestId: z.string().min(1).max(80),
    revision: z.number().int().nonnegative(),
    action: actionSchema,
  }),
]);
export type ClientRequest = z.infer<typeof requestSchema>;
