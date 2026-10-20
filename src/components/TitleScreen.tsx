import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useReducedMotion } from "../presentation/useReducedMotion";
import "./title-screen.css";
const assets = {
  studio: "/assets/board/logo/gambito-logo.png",
  background: "/assets/board/title/title-background.webp",
  title: "/assets/board/title/game-text-title.webp",
};
const cues = [
  [500, "logo"],
  [1500, "caption"],
  [3500, "fade"],
  [4500, "blackout"],
  [5200, "background"],
  [6700, "title"],
  [7900, "menu"],
] as const;
type Stage = "black" | (typeof cues)[number][1];
export default function TitleScreen({
  onPlay,
  onInstructions,
  returnToMenu = false,
}: {
  onPlay: () => void;
  onInstructions: () => void;
  returnToMenu?: boolean;
}) {
  const [stage, setStage] = useState<Stage>(returnToMenu ? "menu" : "black"),
    [loaded, setLoaded] = useState(false),
    [credits, setCredits] = useState(false),
    [leaving, setLeaving] = useState(false),
    [skipped, setSkipped] = useState(false);
  const reduced = useReducedMotion(),
    exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    creditsButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let active = true;
    Promise.all(
      Object.values(assets).map(
        (src) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => resolve();
            image.onerror = () => resolve();
            image.src = src;
          }),
      ),
    ).then(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded || returnToMenu || skipped) return;
    const timers = cues.map(([ms, next]) =>
      setTimeout(() => setStage(next), ms * (reduced ? 0.2 : 1)),
    );
    return () => timers.forEach(clearTimeout);
  }, [loaded, reduced, returnToMenu, skipped]);
  useEffect(
    () => () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    [],
  );
  const visibleStage = skipped ? "menu" : stage;
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (credits) {
        setCredits(false);
        creditsButton.current?.focus();
      } else if (visibleStage !== "menu") setSkipped(true);
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [credits, visibleStage]);
  const studioVisible = visibleStage === "logo" || visibleStage === "caption",
    sceneVisible = ["background", "title", "menu"].includes(visibleStage),
    titleVisible = visibleStage === "title" || visibleStage === "menu",
    menuVisible = visibleStage === "menu";
  function play() {
    if (leaving) return;
    setLeaving(true);
    exitTimer.current = setTimeout(onPlay, reduced ? 100 : 650);
  }
  function closeCredits() {
    setCredits(false);
    creditsButton.current?.focus();
  }
  return (
    <main
      className={`title-screen ${leaving ? "is-leaving" : ""}`}
      data-stage={visibleStage}
      aria-label="Gambilopoly title screen"
    >
      <img
        className={`title-backdrop ${sceneVisible ? "is-visible" : ""}`}
        src={assets.background}
        alt=""
      />
      <div className={`title-vignette ${sceneVisible ? "is-visible" : ""}`} />
      <div
        className={`studio-credit ${studioVisible ? "is-visible" : ""}`}
        aria-hidden={!studioVisible}
      >
        <img src={assets.studio} alt="Gambito logo" />
        <p className={visibleStage === "caption" ? "is-visible" : ""}>
          Gambito's Designs presents...
        </p>
      </div>
      <div className="title-composition">
        <h1 className={`game-title-art ${titleVisible ? "is-visible" : ""}`}>
          <img src={assets.title} alt="Gambilopoly" />
        </h1>
        <nav
          className={`title-menu ${menuVisible ? "is-visible" : ""}`}
          aria-label="Game options"
          inert={!menuVisible || leaving || credits}
        >
          <button onClick={play}>Play</button>
          <button onClick={onInstructions}>Instructions</button>
          <button ref={creditsButton} onClick={() => setCredits(true)}>
            Credits
          </button>
        </nav>
      </div>
      <p className={`title-copyright ${menuVisible ? "is-visible" : ""}`}>
        © 2026 Gambito's Designs <span aria-hidden="true">|</span> All rights
        reserved.
      </p>
      {!menuVisible &&
        visibleStage !== "black" &&
        visibleStage !== "blackout" && (
          <button className="skip-title" onClick={() => setSkipped(true)}>
            Skip intro
          </button>
        )}
      {credits && (
        <div className="modal-shade" onClick={closeCredits}>
          <section
            className="rules-modal title-credits"
            role="dialog"
            aria-modal="true"
            aria-labelledby="credits-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              autoFocus
              className="close"
              aria-label="Close credits"
              onClick={closeCredits}
            >
              <X />
            </button>
            <span className="eyebrow">THE PEOPLE BEHIND THE NIGHT</span>
            <h2 id="credits-title">Credits</h2>
            <img src={assets.studio} alt="" />
            <h3>Gambito's Designs</h3>
            <p>
              Game concept, creative direction, and supplied artwork and models.
            </p>
            <p>Built with React, Three.js and React Three Fiber.</p>
            <button className="secondary" onClick={closeCredits}>
              Back to title
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
