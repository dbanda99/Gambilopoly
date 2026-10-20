import { expect, it } from "vitest";
import {
  canStart,
  COLORS,
  editMember,
  newMember,
  removeMember,
  type RoomLobby,
} from "./lobby";
import { requestSchema } from "./protocol";
import { createGame } from "../engine/gameState";
import { parseSnapshot } from "../engine/snapshot";
const lobby = (): RoomLobby => {
  const s: RoomLobby = {
    code: "ABCDEFGH",
    hostId: "host",
    members: [],
    revision: 0,
  };
  s.members.push(newMember(s, "host", "Host"));
  return s;
};
it("assigns four unique characters and colors and rejects a fifth player", () => {
  const s = lobby();
  for (let n = 1; n < 4; n++)
    s.members.push(newMember(s, `guest-${n}`, `Guest ${n}`));
  expect(new Set(s.members.map((m) => m.token)).size).toBe(4);
  expect(new Set(s.members.map((m) => m.color)).size).toBe(4);
  expect(() => newMember(s, "extra", "Extra")).toThrow(/full/);
});
it("binds customization and kicking to the right player and host", () => {
  let s = lobby();
  s.members.push(newMember(s, "guest", "Guest"));
  expect(() => editMember(s, "guest", "host", { name: "Imposter" })).toThrow(
    /own/,
  );
  expect(() =>
    editMember(s, "guest", "guest", { token: s.members[0].token }),
  ).toThrow(/taken/);
  s.members[1].ready = true;
  s = editMember(s, "guest", "guest", { name: "Boo", color: COLORS[4] });
  expect(s.members[1].ready).toBe(false);
  expect(s.members[1].name).toBe("Boo");
  expect(() => removeMember(s, "guest", "host")).toThrow();
  expect(removeMember(s, "host", "guest").members.length).toBe(1);
});
it("requires two players and ready guests, preserves identity, bot flags and selected colors in saves", () => {
  const s = lobby();
  expect(canStart(s)).toBe(false);
  s.members.push(newMember(s, "bot", "Bot", true));
  expect(canStart(s)).toBe(true);
  const g = createGame(s.members);
  g.mode = "single";
  expect(g.opening?.candidateIds).toEqual(["host", "bot"]);
  expect(parseSnapshot({ version: 1, state: g })).toEqual(g);
  s.members[1].bot = false;
  s.members[1].ready = false;
  expect(canStart(s)).toBe(false);
});
it("rejects malformed or injected action payloads", () => {
  expect(
    requestSchema.safeParse({
      type: "action",
      requestId: "x",
      revision: -1,
      action: { type: "roll", playerId: "guest" },
    }).success,
  ).toBe(false);
  expect(
    requestSchema.safeParse({
      type: "action",
      requestId: "x",
      revision: 0,
      action: { type: "set-money", playerId: "guest", money: 999999 },
    }).success,
  ).toBe(false);
  expect(
    requestSchema.safeParse({ type: "profile", profile: { color: "#000000" } })
      .success,
  ).toBe(false);
});
