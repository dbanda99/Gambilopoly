import { afterEach, expect, it, vi } from "vitest";
import { useGame } from "./store";
import { createGame } from "./engine/gameState";
import { applyAction } from "./engine/reducer";
afterEach(() => {
  vi.unstubAllGlobals();
  useGame.setState({ state: null, rollEvent: null, feedback: null });
});
it("does not replay money, notifications or dice when receiving duplicate state; resume stays quiet", () => {
  vi.stubGlobal("localStorage", { setItem: vi.fn() });
  const before = createGame(
    [
      { name: "A", token: "pumpkin" },
      { name: "B", token: "ghost" },
    ],
    { skipOpening: true },
  );
  useGame.getState().start(before);
  const after = applyAction(
    before,
    { type: "roll", playerId: "player-0" },
    () => 0,
  );
  useGame.getState().receive(after, "roll");
  const first = useGame.getState();
  expect(first.feedback).not.toBeNull();
  expect(first.rollEvent).not.toBeNull();
  useGame.getState().receive(structuredClone(after), "roll");
  expect(useGame.getState().feedback).toBe(first.feedback);
  expect(useGame.getState().rollEvent).toBe(first.rollEvent);
  useGame.getState().start(after);
  expect(useGame.getState().feedback).toBeNull();
  expect(useGame.getState().rollEvent).toBeNull();
});
