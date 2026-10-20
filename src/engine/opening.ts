import type { Action, GameState } from "./types";

// The opening rolls are authoritative actions, just like rolls during a turn.
export function applyOpeningAction(
  current: GameState,
  action: Action,
  random: () => number,
): GameState {
  const s = structuredClone(current),
    o = s.opening;
  s.transactions = [];
  if (!o || s.phase !== "opening")
    throw new Error("The opening sequence has already finished.");
  const log = (text: string) => {
    s.log = [text, ...s.log].slice(0, 60);
  };
  switch (action.type) {
    case "skip-intro":
      if (o.stage !== "tour" && o.stage !== "introductions")
        throw new Error("The camera introduction has finished.");
      o.stage = "order";
      break;
    case "advance-intro":
      if (o.stage === "tour") o.stage = "introductions";
      else if (o.stage === "introductions") {
        if (o.spotlightIndex < s.players.length - 1) o.spotlightIndex++;
        else o.stage = "order";
      } else throw new Error("The camera introduction has finished.");
      break;
    case "opening-roll": {
      if (o.stage !== "order") throw new Error("Wait for the starting roll.");
      const id = action.playerId;
      if (!o.candidateIds.includes(id) || o.rolls[id])
        throw new Error("This player has already rolled.");
      const dice: [number, number] = [
        1 + Math.floor(random() * 6),
        1 + Math.floor(random() * 6),
      ];
      o.rolls[id] = dice;
      o.history.push({ round: o.round, playerId: id, dice });
      s.dice = dice;
      // Keep the snapshot bounded even in an exceptionally long chain of ties.
      o.history = o.history.slice(-40);
      log(
        `${s.players[s.currentPlayerIndex].name} rolled ${dice[0]} + ${dice[1]} for starting order.`,
      );
      const next = o.candidateIds.find((candidate) => !o.rolls[candidate]);
      if (next) {
        s.currentPlayerIndex = s.players.findIndex((p) => p.id === next);
        break;
      }
      const highest = Math.max(
        ...Object.values(o.rolls).map((d) => d[0] + d[1]),
      );
      const leaders = o.candidateIds.filter(
        (candidate) =>
          o.rolls[candidate][0] + o.rolls[candidate][1] === highest,
      );
      if (leaders.length > 1) {
        o.round++;
        o.candidateIds = leaders;
        o.rolls = {};
        s.currentPlayerIndex = s.players.findIndex((p) => p.id === leaders[0]);
        log(
          `Tie at ${highest}! ${leaders.map((id) => s.players.find((p) => p.id === id)!.name).join(" and ")} roll again.`,
        );
      } else {
        o.winnerId = leaders[0];
        o.stage = "ready";
        s.currentPlayerIndex = s.players.findIndex((p) => p.id === o.winnerId);
        log(
          `${s.players[s.currentPlayerIndex].name} wins the opening roll with ${highest}.`,
        );
      }
      break;
    }
    case "begin":
      if (o.stage !== "ready" || !o.winnerId)
        throw new Error("Everyone must finish the opening rolls first.");
      s.phase = "roll";
      s.opening = null;
      s.dice = null;
      log(
        `${s.players[s.currentPlayerIndex].name} goes first. Play continues clockwise.`,
      );
      break;
    default:
      throw new Error("Finish the opening sequence before playing.");
  }
  s.revision++;
  return s;
}
