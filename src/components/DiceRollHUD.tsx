import { useEffect, useState } from "react";
import {
  DICE_SECONDS,
  diceStage,
  type RollPresentation,
} from "../presentation/diceRoll";
export default function DiceRollHUD({ roll }: { roll: RollPresentation }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(Math.max(0, (performance.now() - roll.startedAt) / 1000));
    const timer = setInterval(
      () =>
        setElapsed(
          Math.min(DICE_SECONDS, (performance.now() - roll.startedAt) / 1000),
        ),
      80,
    );
    return () => clearInterval(timer);
  }, [roll]);
  const stage = diceStage(elapsed);
  return (
    <div
      className="dice-result-label"
      role="status"
      data-stage={stage}
      aria-label="Dice roll presentation"
    >
      {stage === "throw"
        ? "Rolling the dice…"
        : stage === "settled"
          ? "The dice have landed"
          : stage === "pickup"
            ? "Your roll"
            : `${roll.dice[0]} + ${roll.dice[1]} = ${roll.dice[0] + roll.dice[1]}`}
    </div>
  );
}
