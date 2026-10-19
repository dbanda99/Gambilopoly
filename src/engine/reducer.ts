import { BOARD } from "./boardData";
import { rentFor } from "./rules";
import chance from "../data/chance.json";
import community from "../data/communityChest.json";
import type { Action, GameState, Player } from "./types";
import { applyOpeningAction } from "./opening";
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
  if (
    ["advance-intro", "skip-intro", "opening-roll", "begin"].includes(
      action.type,
    )
  )
    throw new Error("The opening sequence has already finished.");
  const s: GameState = structuredClone(current),
    p = s.players[s.currentPlayerIndex];
  const log = (message: string) => {
    s.log = [message, ...s.log].slice(0, 60);
  };
  function bankrupt(debtor: Player, creditor?: Player) {
    debtor.bankrupt = true;
    debtor.money = 0;
    debtor.propertyIds.forEach((id) => {
      s.properties[id].ownerId = creditor?.id ?? null;
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
  function pay(amount: number, creditor?: Player) {
    const paid = Math.min(p.money, amount);
    p.money -= paid;
    if (creditor) creditor.money += paid;
    if (paid < amount) bankrupt(p, creditor);
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
        pay(rent, owner);
        log(`${p.name} paid $${rent} rent to ${owner.name}.`);
      }
    } else if (tile.type === "tax") {
      pay(tile.amount!);
      log(`${p.name} paid $${tile.amount} in tax.`);
    } else if (tile.type === "chance" || tile.type === "community") {
      const cards = tile.type === "chance" ? chance : community;
      const card = cards[Math.floor(random() * cards.length)];
      log(card.text);
      if (card.amount > 0) p.money += card.amount;
      else pay(-card.amount);
    } else if (tile.id === 30) jail();
  }
  switch (action.type) {
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
          pay(50);
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
