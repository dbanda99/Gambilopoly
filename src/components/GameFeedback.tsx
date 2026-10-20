import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  Banknote,
  Dices,
  Hammer,
  Home,
  LockKeyhole,
  MapPin,
  Sparkles,
  Trophy,
  TriangleAlert,
  X,
  History,
} from "lucide-react";
import type { GameState, MoneyTransaction } from "../engine/types";
import type { GameNotice } from "../presentation/feedback";
import { TOKENS } from "../engine/boardData";
import { useGame } from "../store";
import "./game-feedback.css";
const icons = {
  turn: Dices,
  payment: Banknote,
  purchase: Home,
  income: Sparkles,
  building: Hammer,
  jail: LockKeyhole,
  bankrupt: TriangleAlert,
  win: Trophy,
  landing: MapPin,
};
function Notice({
  notice,
  state,
  onDismiss,
  onHistory,
  waiting,
}: {
  notice: GameNotice;
  state: GameState;
  onDismiss: () => void;
  onHistory: () => void;
  waiting: number;
}) {
  const [held, setHeld] = useState(false),
    [closing, setClosing] = useState(false),
    Icon = icons[notice.kind],
    player = state.players.find((p) => p.id === notice.playerId),
    color = player?.color ?? (player ? TOKENS[player.token].color : "#dfb383");
  useEffect(() => {
    if (held || closing) return;
    const timer = setTimeout(
      () => setClosing(true),
      notice.kind === "win" ? 8000 : 5400,
    );
    return () => clearTimeout(timer);
  }, [notice.id, held, closing, notice.kind]);
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(onDismiss, 220);
    return () => clearTimeout(timer);
  }, [closing, onDismiss]);
  return (
    <section
      className={`game-announcement notice-${notice.kind} ${closing ? "is-closing" : ""}`}
      style={
        {
          "--notice-color": color,
          "--notice-duration": notice.kind === "win" ? "8s" : "5.4s",
        } as CSSProperties
      }
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="announcement-icon">
        <Icon size={26} />
      </span>
      <div className="announcement-copy">
        <span className="announcement-label">
          {notice.kind === "turn"
            ? "THE NIGHT CONTINUES"
            : notice.kind === "win"
              ? "THE NIGHT HAS A NEW OWNER"
              : "NEIGHBORHOOD NEWS"}
        </span>
        <h2>{notice.title}</h2>
        <p>{notice.detail}</p>
        <button className="announcement-history" onClick={onHistory}>
          <History size={12} />
          {waiting ? `${waiting} more updates · ` : ""}View activity
        </button>
      </div>
      {notice.amount !== undefined && (
        <strong className="announcement-amount">
          ${notice.amount.toLocaleString()}
        </strong>
      )}
      <button
        className="announcement-close"
        aria-label="Dismiss notification"
        onClick={() => setClosing(true)}
      >
        <X size={17} />
      </button>
      <span
        className="announcement-progress"
        style={{ animationPlayState: held ? "paused" : "running" }}
      />
    </section>
  );
}
interface Point {
  x: number;
  y: number;
}
function badgePoint(id: string | null): Point | null {
  const badge = [
    ...document.querySelectorAll<HTMLElement>("[data-player-id]"),
  ].find((el) => el.dataset.playerId === id);
  const rect = badge?.querySelector(".badge-money")?.getBoundingClientRect();
  return rect
    ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    : null;
}
function MoneyEffect({
  transaction,
  reduced,
  onDone,
}: {
  transaction: MoneyTransaction;
  reduced: boolean;
  onDone: (id: string) => void;
}) {
  const [points, setPoints] = useState<{
    from: Point | null;
    to: Point | null;
  }>({ from: null, to: null });
  useLayoutEffect(() => {
    const measure = () =>
      setPoints({
        from: badgePoint(transaction.fromId),
        to: badgePoint(transaction.toId),
      });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [transaction.id, transaction.fromId, transaction.toId]);
  useEffect(() => {
    const timer = setTimeout(() => onDone(transaction.id), 2300);
    return () => clearTimeout(timer);
  }, [transaction.id, onDone]);
  useEffect(() => {
    const animations: Animation[] = [];
    for (const [id, positive] of [
      [transaction.fromId, false],
      [transaction.toId, true],
    ] as const) {
      const badge = [
          ...document.querySelectorAll<HTMLElement>("[data-player-id]"),
        ].find((el) => el.dataset.playerId === id),
        cash = badge?.querySelector(".badge-money");
      if (cash)
        animations.push(
          cash.animate(
            [
              { filter: "brightness(1)" },
              {
                filter: "brightness(1.7)",
                color: positive ? "#38703f" : "#a02b37",
              },
              { filter: "brightness(1)" },
            ],
            {
              duration: 900,
              delay: positive && transaction.fromId ? 1000 : 0,
              easing: "ease-out",
            },
          ),
        );
    }
    return () => animations.forEach((a) => a.cancel());
  }, [transaction.id, transaction.fromId, transaction.toId]);
  const { from, to } = points,
    fly = from && to && !reduced;
  return (
    <div
      className="money-effects"
      aria-hidden="true"
      data-transfer-id={transaction.id}
      data-from={transaction.fromId ?? "bank"}
      data-to={transaction.toId ?? "bank"}
    >
      {fly &&
        Array.from({ length: 7 }, (_, i) => (
          <img
            className="flying-note"
            key={i}
            src="/assets/board/money/money-note.webp"
            alt=""
            style={
              {
                left: from.x,
                top: from.y,
                "--dx": `${to.x - from.x}px`,
                "--dy": `${to.y - from.y}px`,
                "--bend-x": `${Math.abs(to.y - from.y) > 80 ? -150 - i * 5 : (i - 3) * 8}px`,
                "--bend-y": `${Math.abs(to.y - from.y) > 80 ? (i - 3) * 10 : window.innerHeight > window.innerWidth ? 22 + i * 3 : 95 + i * 7}px`,
                "--note-angle": `${(i - 3) * 8}deg`,
                animationDelay: `${i * 85}ms`,
              } as CSSProperties
            }
          />
        ))}
      {from && (
        <strong
          className="money-change is-debit"
          style={{ left: from.x, top: from.y }}
        >
          −${transaction.amount.toLocaleString()}
        </strong>
      )}
      {to && (
        <strong
          className="money-change is-credit"
          style={{
            left: to.x,
            top: to.y,
            animationDelay: from && !reduced ? "1000ms" : "0ms",
          }}
        >
          +${transaction.amount.toLocaleString()}
        </strong>
      )}
    </div>
  );
}
export default function GameFeedback({
  state,
  reduced,
  blocked,
  onHistory,
}: {
  state: GameState;
  reduced: boolean;
  blocked: boolean;
  onHistory: () => void;
}) {
  useEffect(() => {
    const image = new Image();
    image.src = "/assets/board/money/money-note.webp";
  }, []);
  const feedback = useGame((s) => s.feedback),
    [queue, setQueue] = useState<GameNotice[]>([]),
    [transfers, setTransfers] = useState<MoneyTransaction[]>([]),
    seen = useRef(new Set<string>()),
    timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    if (!feedback || seen.current.has(feedback.id)) return;
    seen.current.add(feedback.id);
    if (seen.current.size > 200)
      seen.current.delete(seen.current.values().next().value!);
    if (feedback.delay) setQueue((q) => q.filter((n) => n.kind !== "turn"));
    const timer = setTimeout(
      () => {
        timers.current.delete(timer);
        if (feedback.notice)
          setQueue((q) => [
            ...q
              .filter(
                (n) =>
                  n.kind !== "turn" &&
                  !(
                    feedback.notice?.kind === "building" &&
                    n.kind === "building" &&
                    n.playerId === feedback.notice.playerId
                  ),
              )
              .slice(-2),
            feedback.notice!,
          ]);
        if (feedback.transactions.length)
          setTransfers((t) => [...t, ...feedback.transactions]);
      },
      Math.max(0, feedback.delay - (performance.now() - feedback.startedAt)),
    );
    timers.current.add(timer);
  }, [feedback]);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      seen.current.clear();
    },
    [],
  );
  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []),
    remove = useCallback(
      (id: string) => setTransfers((t) => t.filter((x) => x.id !== id)),
      [],
    );
  return (
    <>
      <div className="game-announcements">
        {!blocked && queue[0] && (
          <Notice
            key={queue[0].id}
            notice={queue[0]}
            state={state}
            onDismiss={dismiss}
            onHistory={onHistory}
            waiting={queue.length - 1}
          />
        )}
      </div>
      {transfers.map((t) => (
        <MoneyEffect
          key={t.id}
          transaction={t}
          reduced={reduced}
          onDone={remove}
        />
      ))}
    </>
  );
}
