import { expect, it } from "vitest";
import { applyAction } from "../engine/reducer";
import { createGame } from "../engine/gameState";
import { parseSnapshot } from "../engine/snapshot";
import { createFeedback } from "./feedback";
import { movementDuration } from "./motion";
function rentGame(money = 1500) {
  const s = createGame(
    [
      { name: "Payer", token: "pumpkin" },
      { name: "Payee", token: "ghost" },
    ],
    { skipOpening: true },
  );
  s.properties[3].ownerId = "player-1";
  s.players[1].propertyIds = [3];
  s.players[0].money = money;
  return s;
}
function roll(s: ReturnType<typeof rentGame>) {
  const values = [0, 0.2];
  return applyAction(
    s,
    { type: "roll", playerId: "player-0" },
    () => values.shift() ?? 0,
  );
}
it("records the real payer, payee and amount for rent and delays presentation until movement ends", () => {
  const before = rentGame(),
    after = roll(before),
    feedback = createFeedback(before, after, "roll");
  expect(after.transactions).toEqual([
    {
      id: `${after.id}:1:0`,
      fromId: "player-0",
      toId: "player-1",
      amount: 4,
      reason: "Rent · Cobweb Cottage",
    },
  ]);
  expect(feedback.notice?.kind).toBe("payment");
  expect(feedback.delay).toBe(movementDuration(3) * 1000);
  expect(parseSnapshot({ version: 1, state: after })).toEqual(after);
});
it("animates only money actually paid before bankruptcy", () => {
  const before = rentGame(2),
    after = roll(before);
  expect(after.transactions?.[0].amount).toBe(2);
  expect(after.players[1].money).toBe(1502);
  expect(after.status).toBe("finished");
  expect(after.log.some((line) => line.includes("paid $2 rent"))).toBe(true);
  expect(createFeedback(before, after, "roll").notice?.kind).toBe("win");
});
it("separates bank payments from player transfers and clears events on the next action", () => {
  const s = rentGame();
  s.players[0].position = 1;
  s.phase = "purchase";
  const bought = applyAction(s, { type: "buy", playerId: "player-0" });
  expect(bought.transactions?.[0]).toMatchObject({
    fromId: "player-0",
    toId: null,
    amount: 60,
  });
  expect(createFeedback(s, bought, "buy").notice?.title).toBe(
    "Property claimed",
  );
  const next = applyAction(bought, { type: "end", playerId: "player-0" });
  expect(next.transactions).toEqual([]);
  expect(createFeedback(bought, next, "end").notice?.title).toBe(
    "Payee’s turn",
  );
});
