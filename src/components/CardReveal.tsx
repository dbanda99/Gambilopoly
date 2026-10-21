import { useEffect, useRef, useState } from "react";
import type { PendingCard } from "../engine/types";
import "./play-effects.css";
import { assetUrl } from "../utils/assetUrl";
export default function CardReveal({
  card,
  onContinue,
  reducedMotion,
  canContinue = true,
}: {
  card: PendingCard;
  onContinue: () => void;
  reducedMotion: boolean;
  canContinue?: boolean;
}) {
  const [face, setFace] = useState(false),
    [ready, setReady] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const prefix = card.deck === "chance" ? "chance" : "community-chest";
  useEffect(() => {
    let active = true;
    let flip: ReturnType<typeof setTimeout>,
      settled: ReturnType<typeof setTimeout>;
    const images = [
      `${prefix}-back-design.png`,
      `${prefix}-text-design.png`,
    ].map(
      (file) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = () => resolve();
          image.onerror = () => resolve();
          image.src = assetUrl(`/assets/board/cards/${file}`);
        }),
    );
    Promise.all(images).then(() => {
      if (!active) return;
      flip = setTimeout(
        () => {
          setFace(true);
          settled = setTimeout(
            () => {
              setReady(true);
              button.current?.focus();
            },
            reducedMotion ? 0 : 850,
          );
        },
        reducedMotion ? 150 : 950,
      );
    });
    return () => {
      active = false;
      clearTimeout(flip);
      clearTimeout(settled);
    };
  }, [prefix, reducedMotion]);
  return (
    <div
      className="card-reveal-shade"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawn-card-title"
    >
      <div className="card-reveal-stage">
        <div className={`flipping-card ${face ? "is-face-up" : ""}`}>
          <div
            className="card-side card-back"
            aria-hidden={face}
            style={{
              backgroundImage: `url(${assetUrl(`/assets/board/cards/${prefix}-back-design.png`)})`,
            }}
          />
          <div
            className="card-side card-front"
            aria-hidden={!face}
            style={{
              backgroundImage: `url(${assetUrl(`/assets/board/cards/${prefix}-text-design.png`)})`,
            }}
          >
            <span className="eyebrow">A MESSAGE FROM THE NEIGHBORHOOD</span>
            <h2 id="drawn-card-title">
              {card.deck === "chance" ? "Chance" : "Community Chest"}
            </h2>
            <p>{card.text}</p>
            <strong>
              {card.amount > 0
                ? `Collect $${card.amount}`
                : `Pay $${-card.amount}`}
            </strong>
          </div>
        </div>
        <button
          ref={button}
          className="game-action card-continue"
          disabled={!ready || !canContinue}
          onClick={onContinue}
        >
          {ready
            ? canContinue
              ? "Continue"
              : "Waiting for the player…"
            : "Revealing your card…"}
        </button>
      </div>
    </div>
  );
}
