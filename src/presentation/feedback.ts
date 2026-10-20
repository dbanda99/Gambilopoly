import { BOARD } from "../engine/boardData";
import type { Action, GameState, MoneyTransaction } from "../engine/types";
import { movementDuration } from "./motion";
import { DICE_SECONDS } from "./diceRoll";
export interface GameNotice {
  id: string;
  kind:
    | "turn"
    | "payment"
    | "purchase"
    | "income"
    | "building"
    | "jail"
    | "bankrupt"
    | "win"
    | "landing";
  title: string;
  detail: string;
  playerId: string;
  amount?: number;
}
export interface Feedback {
  id: string;
  startedAt: number;
  delay: number;
  notice: GameNotice | null;
  transactions: MoneyTransaction[];
}
export function createFeedback(
  previous: GameState,
  next: GameState,
  action?: Action["type"],
): Feedback {
  const current = next.players[next.currentPlayerIndex],
    actor = previous.players[previous.currentPlayerIndex],
    id = `${next.id}:${next.revision}`;
  const freshMotion =
    next.movement?.revision === next.revision ? next.movement : null;
  const delay =
    action === "roll"
      ? freshMotion
        ? movementDuration(freshMotion.steps) * 1000
        : DICE_SECONDS * 1000
      : 0;
  const transactions = next.transactions ?? [];
  const base = {
    id,
    startedAt: performance.now(),
    delay,
    transactions,
    notice: null as GameNotice | null,
  };
  const notice = (
    kind: GameNotice["kind"],
    title: string,
    detail: string,
    playerId = actor.id,
    amount?: number,
  ): Feedback => ({
    ...base,
    notice: { id, kind, title, detail, playerId, amount },
  });
  if (next.status === "finished")
    return notice(
      "win",
      `${next.players.find((p) => !p.bankrupt)?.name} owns the night!`,
      "The last player standing takes the crown.",
      next.players.find((p) => !p.bankrupt)!.id,
    );
  if (!actor.bankrupt && next.players.find((p) => p.id === actor.id)?.bankrupt)
    return notice(
      "bankrupt",
      `${actor.name} is bankrupt`,
      "Their remaining assets have been settled.",
    );
  if (action === "begin" || action === "end")
    return notice(
      "turn",
      `${current.name}’s turn`,
      previous.extraTurn && current.id === actor.id
        ? "Doubles earned another turn."
        : current.bot
          ? "The neighborhood is thinking…"
          : "Roll the dice. Your next fortune is waiting.",
      current.id,
    );
  const payment = transactions.find((t) => t.fromId && t.toId);
  if (payment) {
    const from = next.players.find((p) => p.id === payment.fromId)!,
      to = next.players.find((p) => p.id === payment.toId)!;
    return notice(
      "payment",
      "Rent paid",
      `${from.name} → ${to.name} · ${payment.reason.replace("Rent · ", "")}`,
      from.id,
      payment.amount,
    );
  }
  if (action === "buy")
    return notice(
      "purchase",
      "Property claimed",
      `${actor.name} now owns ${BOARD[actor.position].name}.`,
      actor.id,
      transactions[0]?.amount,
    );
  if (action === "pass")
    return notice("landing", "Property passed", next.log[0]);
  if (action === "build" || action === "sell-building")
    return notice(
      "building",
      transactions[0]?.reason ?? "Buildings updated",
      next.log[0],
      actor.id,
      transactions[0]?.amount,
    );
  if (!actor.inJail && next.players.find((p) => p.id === actor.id)?.inJail)
    return notice(
      "jail",
      `${actor.name} enters the Dungeon`,
      "Roll doubles or pay $50 bail on your turn.",
    );
  if (transactions.length) {
    const t = transactions.at(-1)!,
      recipient = t.toId ? next.players.find((p) => p.id === t.toId)! : actor;
    return notice(
      t.toId ? "income" : "payment",
      t.reason,
      `${recipient.name} ${t.toId ? "collects" : "pays"} $${t.amount.toLocaleString()}.`,
      recipient.id,
      t.amount,
    );
  }
  if (action === "roll" && next.phase === "end")
    return notice(
      "landing",
      actor.inJail && current.inJail
        ? "Still in the Dungeon"
        : `${actor.name} landed`,
      actor.inJail && current.inJail
        ? "Try doubles again next turn, or pay bail."
        : BOARD[current.position].name,
    );
  return base;
}
