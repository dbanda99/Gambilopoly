import { create } from "zustand";
import { applyAction } from "./engine/reducer";
import type { Action, GameState } from "./engine/types";
import { parseSnapshot } from "./engine/snapshot";
import type { RollPresentation } from "./presentation/diceRoll";
const key = "gambilopoly-local-v1";
let actionController: ((action: Action) => void) | null = null;
export function setActionController(controller: typeof actionController) {
  actionController = controller;
}
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
  receive: (state: GameState, rolled?: Action["type"]) => void;
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
    if (actionController) {
      actionController(action);
      return;
    }
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
  receive: (state, rolled) => {
    get().start(state);
    if ((rolled === "roll" || rolled === "opening-roll") && state.dice)
      set({
        rollEvent: {
          dice: state.dice,
          playerId:
            state.movement?.revision === state.revision
              ? state.movement.playerId
              : rolled === "opening-roll"
                ? (state.opening?.history.at(-1)?.playerId ??
                  state.players[state.currentPlayerIndex].id)
                : state.players[state.currentPlayerIndex].id,
          revision: state.revision,
          purpose: rolled === "roll" ? "turn" : "opening",
          startedAt: performance.now(),
        },
      });
  },
  clearError: () => set({ error: "" }),
}));
