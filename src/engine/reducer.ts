import { BOARD } from "./boardData";
import { rentFor } from "./rules";
import chance from "../data/chance.json";
import community from "../data/communityChest.json";
import type { Action, GameState, Player } from "./types";
import { applyOpeningAction } from "./opening";
import { buildingCost, buildingError } from "./buildings";
export function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}
export function applyAction(
  current: GameState,
  action: Action,
  random: () => number = secureRandom,
): GameState {
  if (current.status !== "playing") throw new Error("This match has finished.");
  if (current.players[current.currentPlayerIndex].id !== action.playerId)
    throw new Error("It is another player’s turn.");
  if (current.phase === "opening")
    return applyOpeningAction(current, action, random);
  if (current.phase === "card" && action.type !== "ack-card")
    throw new Error("Read and resolve your card first.");
  if (
    ["advance-intro", "skip-intro", "opening-roll", "begin"].includes(
      action.type,
    )
  )
    throw new Error("The opening sequence has already finished.");
  const s: GameState = structuredClone(current),
    p = s.players[s.currentPlayerIndex];
  s.transactions = [];
  function transaction(
    fromId: string | null,
    toId: string | null,
    amount: number,
    reason: string,
  ) {
    if (amount > 0)
      s.transactions!.push({
        id: `${s.id}:${s.revision + 1}:${s.transactions!.length}`,
        fromId,
        toId,
        amount,
        reason,
      });
  }
  const log = (message: string) => {
    s.log = [message, ...s.log].slice(0, 60);
  };
  function bankrupt(debtor: Player, creditor?: Player) {
    debtor.bankrupt = true;
    debtor.money = 0;
    debtor.propertyIds.forEach((id) => {
      s.properties[id].ownerId = creditor?.id ?? null;
      if (!creditor) {
        s.properties[id].buildings = 0;
        s.properties[id].mortgaged = false;
      }
      if (creditor) creditor.propertyIds.push(id);
    });
    debtor.propertyIds = [];
    log(`${debtor.name} is bankrupt.`);
    s.phase = "end";
    s.extraTurn = false;
    const alive = s.players.filter((x) => !x.bankrupt);
    if (alive.length === 1) {
      s.status = "finished";
      log(`${alive[0].name} owns the night!`);
    }
  }
  function pay(amount: number, creditor?: Player, reason = "Payment") {
    const paid = Math.min(p.money, amount);
    p.money -= paid;
    if (creditor) creditor.money += paid;
    transaction(p.id, creditor?.id ?? null, paid, reason);
    if (paid < amount) bankrupt(p, creditor);
    return paid;
  }
  function jail() {
    p.position = 10;
    p.inJail = true;
    p.jailTurns = 0;
    s.extraTurn = false;
    s.phase = "end";
    s.movement = null;
    log(`${p.name} was sent to the Dungeon.`);
  }
  function landing() {
    const tile = BOARD[p.position];
    s.phase = "end";
    log(`${p.name} landed on ${tile.name}.`);
    if (tile.price) {
      const property = s.properties[tile.id];
      if (!property.ownerId) {
        s.phase = "purchase";
      } else if (property.ownerId !== p.id) {
        const owner = s.players.find((x) => x.id === property.ownerId)!;
        const rent = rentFor(s, tile.id);
        const paid = pay(rent, owner, `Rent · ${tile.name}`);
        log(
          `${p.name} paid $${paid} rent to ${owner.name}.${paid < rent ? ` $${rent - paid} could not be paid.` : ""}`,
        );
      }
    } else if (tile.type === "tax") {
      pay(tile.amount!, undefined, `Tax · ${tile.name}`);
      log(`${p.name} paid $${tile.amount} in tax.`);
    } else if (tile.type === "chance" || tile.type === "community") {
      const cards = tile.type === "chance" ? chance : community;
      const index = Math.floor(random() * cards.length),
        card = cards[index];
      s.pendingCard = {
        deck: tile.type,
        index,
        text: card.text,
        amount: card.amount,
        playerId: p.id,
        revision: s.revision + 1,
      };
      s.phase = "card";
      log(
        `${p.name} drew a ${tile.type === "chance" ? "Chance" : "Community Chest"} card.`,
      );
    } else if (tile.id === 30) jail();
  }
  switch (action.type) {
    case "ack-card": {
      if (
        s.phase !== "card" ||
        !s.pendingCard ||
        s.pendingCard.playerId !== p.id
      )
        throw new Error("There is no card to resolve.");
      const card = s.pendingCard;
      s.pendingCard = null;
      s.phase = "end";
      log(card.text);
      if (card.amount > 0) {
        p.money += card.amount;
        transaction(null, p.id, card.amount, "Card reward");
      } else pay(-card.amount, undefined, "Card payment");
      break;
    }
    case "build":
    case "sell-building": {
      const sell = action.type === "sell-building",
        error = buildingError(s, p.id, action.spaceId, sell);
      if (error) throw new Error(error);
      const property = s.properties[action.spaceId],
        cost = buildingCost(action.spaceId);
      property.buildings += sell ? -1 : 1;
      p.money += sell ? cost / 2 : -cost;
      transaction(
        sell ? null : p.id,
        sell ? p.id : null,
        sell ? cost / 2 : cost,
        sell
          ? "Building sold"
          : property.buildings === 5
            ? "Inn upgrade"
            : "House built",
      );
      log(
        `${p.name} ${sell ? "sold a building on" : property.buildings === 5 ? "built an inn on" : "built a house on"} ${BOARD[action.spaceId].name}.`,
      );
      break;
    }
    case "roll": {
      if (s.phase !== "roll")
        throw new Error("Resolve this turn before rolling again.");
      const dice: [number, number] = [
        1 + Math.floor(random() * 6),
        1 + Math.floor(random() * 6),
      ];
      s.dice = dice;
      const double = dice[0] === dice[1];
      s.extraTurn = double && !p.inJail;
      s.doubles = double ? s.doubles + 1 : 0;
      log(`${p.name} rolled ${dice[0]} + ${dice[1]}.`);
      if (s.doubles === 3) {
        jail();
        break;
      }
      if (p.inJail) {
        p.jailTurns++;
        s.extraTurn = false;
        if (double) {
          p.inJail = false;
          p.jailTurns = 0;
          log("Doubles! The dungeon door opens.");
        } else if (p.jailTurns === 3) {
          pay(50, undefined, "Dungeon bail");
          if (p.bankrupt) break;
          p.inJail = false;
          p.jailTurns = 0;
          log(`${p.name} paid $50 to leave the Dungeon.`);
        } else {
          s.phase = "end";
          log("Still in the Dungeon. Try doubles next turn or pay bail.");
          break;
        }
      }
      const steps = dice[0] + dice[1],
        from = p.position;
      p.position = (from + steps) % 40;
      if (from + steps >= 40) {
        p.money += 200;
        transaction(null, p.id, 200, "Passed Witching Hour");
        log(`${p.name} passed Witching Hour and collected $200.`);
      }
      s.movement = { playerId: p.id, from, steps, revision: s.revision + 1 };
      landing();
      break;
    }
    case "buy": {
      if (s.phase !== "purchase")
        throw new Error("There is no property to buy.");
      const tile = BOARD[p.position];
      if (p.money < tile.price!)
        throw new Error("You do not have enough money.");
      if (s.properties[tile.id].ownerId)
        throw new Error("This property already has an owner.");
      p.money -= tile.price!;
      transaction(p.id, null, tile.price!, `Property purchased · ${tile.name}`);
      p.propertyIds.push(tile.id);
      s.properties[tile.id].ownerId = p.id;
      s.phase = "end";
      log(`${p.name} bought ${tile.name} for $${tile.price}.`);
      break;
    }
    case "pass":
      if (s.phase !== "purchase")
        throw new Error("There is no purchase to pass.");
      s.phase = "end";
      log(`${p.name} passed on ${BOARD[p.position].name}.`);
      break;
    case "bail":
      if (s.phase !== "roll" || !p.inJail)
        throw new Error("Bail is only available before rolling in jail.");
      if (p.money < 50) throw new Error("Bail costs $50.");
      p.money -= 50;
      transaction(p.id, null, 50, "Dungeon bail");
      p.inJail = false;
      p.jailTurns = 0;
      log(`${p.name} paid $50 bail.`);
      break;
    case "resign":
      bankrupt(p);
      break;
    case "end":
      if (s.phase !== "end")
        throw new Error("Finish your roll and purchase decision first.");
      if (!s.extraTurn || p.bankrupt) {
        do {
          s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
        } while (s.players[s.currentPlayerIndex].bankrupt);
        s.doubles = 0;
      }
      s.extraTurn = false;
      s.phase = "roll";
      s.movement = null;
      break;
  }
  s.revision++;
  return s;
}
