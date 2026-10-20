import { expect, it } from "vitest";
import { chatText, makeChat } from "./chat";
import { newMember, type RoomLobby } from "./lobby";
import { requestSchema } from "./protocol";
const lobby = (): RoomLobby => {
  const l: RoomLobby = {
    code: "ABCDEFGH",
    hostId: "host",
    members: [],
    revision: 0,
  };
  l.members.push(newMember(l, "host", "Host"));
  l.members.push(newMember(l, "guest", "Guest"));
  return l;
};
it("assigns chat identity and color from the actual lobby member", () => {
  const l = lobby(),
    message = makeChat(l, "guest", "  Hello host!  ", [], 1000);
  expect(message.name).toBe("Guest");
  expect(message.color).toBe(l.members[1].color);
  expect(message.text).toBe("Hello host!");
  expect(() => makeChat(l, "imposter", "Hi", [])).toThrow(/Join/);
  expect(
    requestSchema.parse({
      type: "chat",
      requestId: "1",
      text: "Hi",
      senderId: "host",
    }),
  ).not.toHaveProperty("senderId");
});
it("bounds chat content and rate limits each sender independently", () => {
  expect(chatText.safeParse("   ").success).toBe(false);
  expect(chatText.safeParse("x".repeat(281)).success).toBe(false);
  expect(chatText.safeParse("\u0000").success).toBe(false);
  const l = lobby(),
    first = makeChat(l, "guest", "Hi", [], 1000);
  expect(() => makeChat(l, "guest", "Again", [first], 1100)).toThrow(/wait/);
  expect(makeChat(l, "host", "Welcome", [first], 1100).senderId).toBe("host");
  expect(makeChat(l, "guest", "Later", [first], 1800).text).toBe("Later");
});
