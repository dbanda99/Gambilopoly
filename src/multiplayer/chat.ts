import { z } from "zod";
import type { RoomLobby } from "./lobby";
export const chatText = z
  .string()
  .trim()
  .min(1)
  .max(280)
  .refine(
    (text) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text),
    "Use plain text in chat.",
  );
export const chatMessageSchema = z.object({
  id: z.string().max(100),
  senderId: z.string().max(80).nullable(),
  name: z.string().max(24),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  text: z.string().min(1).max(300),
  kind: z.enum(["message", "system"]),
  createdAt: z.number().int().nonnegative(),
});
export const chatHistorySchema = z.array(chatMessageSchema).max(60);
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export function makeChat(
  lobby: RoomLobby,
  senderId: string,
  text: unknown,
  history: ChatMessage[],
  now = Date.now(),
): ChatMessage {
  const member = lobby.members.find(
    (m) => m.id === senderId && m.connected && !m.bot,
  );
  if (!member) throw Error("Join the lobby before sending a message.");
  const message = chatText.parse(text),
    last = [...history]
      .reverse()
      .find((m) => m.senderId === senderId && m.kind === "message");
  if (last && now - last.createdAt < 750)
    throw Error("Please wait a moment before sending another message.");
  return {
    id: crypto.randomUUID(),
    senderId,
    name: member.name,
    color: member.color,
    text: message,
    kind: "message",
    createdAt: now,
  };
}
