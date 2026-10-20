import { useEffect } from "react";
import type { GameState } from "../engine/types";
import { botAction } from "../engine/bot";
import { useSession, systemAction, animationWait } from "./session";
export function useAutomation(state: GameState | null, busy: boolean) {
  const { mode, status, me } = useSession();
  useEffect(() => {
    if (
      !state ||
      !mode ||
      mode === "guest" ||
      status !== "playing" ||
      busy ||
      state.status !== "playing"
    )
      return;
    const ready = state.opening?.stage === "ready";
    const action = ready
      ? { type: "begin" as const, playerId: me }
      : botAction(state);
    if (!action) return;
    const timer = setTimeout(
      () => systemAction(action),
      animationWait() + (state.phase === "card" ? 2400 : ready ? 1200 : 1000),
    );
    return () => clearTimeout(timer);
  }, [state?.revision, state?.id, busy, mode, status, me]);
}
