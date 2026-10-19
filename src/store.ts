import { create } from "zustand";
import { applyAction } from "./engine/reducer";
import type { Action, GameState } from "./engine/types";
import { parseSnapshot } from "./engine/snapshot";
import type { RollPresentation } from "./presentation/diceRoll";
const key = "gambilopoly-local-v1";
export function readSave(): GameState | null {
  try {
    return parseSnapshot(JSON.parse(localStorage.getItem(key) ?? "null"));
  } catch {
    return null;
  }
}
export const useGame = create<{
  state: GameState | null;
  error: string;
  rollEvent: RollPresentation | null;
  start: (state: GameState) => void;
  dispatch: (action: Action) => void;
  clearError: () => void;
}>((set, get) => ({
  state: null,
  error: "",
  rollEvent: null,
  start: (state) => {
    set({ state, error: "", rollEvent: null });
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, state }));
    } catch {}
  },
  dispatch: (action) => {
    try {
      const state = applyAction(get().state!, action);
      get().start(state);
      if (
        (action.type === "roll" || action.type === "opening-roll") &&
        state.dice
      )
        set({
          rollEvent: {
            dice: state.dice,
            playerId: action.playerId,
            revision: state.revision,
            purpose: action.type === "roll" ? "turn" : "opening",
            startedAt: performance.now(),
          },
        });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
  clearError: () => set({ error: "" }),
}));
