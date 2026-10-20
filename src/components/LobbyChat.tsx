import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, MessageCircle, Send } from "lucide-react";
import { sendChat, useSession } from "../multiplayer/session";
import { useReducedMotion } from "../presentation/useReducedMotion";
import "./lobby-chat.css";
export default function LobbyChat() {
  const { chat, chatPending, me, status } = useSession(),
    [draft, setDraft] = useState(""),
    [open, setOpen] = useState(true),
    [unread, setUnread] = useState(0),
    [cooldown, setCooldown] = useState(false);
  const log = useRef<HTMLDivElement>(null),
    sticky = useRef(true),
    last = useRef(""),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    reduced = useReducedMotion();
  const lastId = chat.at(-1)?.id ?? "";
  useLayoutEffect(() => {
    if (last.current === lastId) return;
    last.current = lastId;
    if (open && sticky.current) {
      log.current?.scrollTo({
        top: log.current.scrollHeight,
        behavior: reduced ? "instant" : "smooth",
      });
      setUnread(0);
    } else setUnread((n) => n + 1);
  }, [lastId, open, reduced]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function showLatest() {
    sticky.current = true;
    setUnread(0);
    log.current?.scrollTo({
      top: log.current.scrollHeight,
      behavior: reduced ? "instant" : "smooth",
    });
  }
  return (
    <section
      className={`lobby-chat ${open ? "" : "is-collapsed"}`}
      aria-label="Lobby chat"
    >
      <button
        className="chat-heading"
        onClick={() => {
          setOpen(!open);
          if (!open) {
            sticky.current = true;
            setUnread(0);
            requestAnimationFrame(showLatest);
          }
        }}
        aria-expanded={open}
        aria-controls="lobby-chat-content"
      >
        <MessageCircle size={19} />
        <strong>Lobby chat</strong>
        <span>
          {unread ? `${unread} new` : "Say hello before the haunting"}
        </span>
        <ChevronDown size={18} />
      </button>
      <div id="lobby-chat-content" hidden={!open}>
        <div
          className="chat-messages"
          ref={log}
          role="log"
          aria-label="Lobby messages"
          aria-live="polite"
          aria-relevant="additions"
          onScroll={() => {
            const el = log.current!;
            sticky.current =
              el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            if (sticky.current) setUnread(0);
          }}
        >
          {!chat.length && (
            <p className="chat-empty">
              Your friends’ messages will appear here. This chat is shared with
              everyone in the lobby.
            </p>
          )}
          {chat.map((message) =>
            message.kind === "system" ? (
              <p className="chat-activity" key={message.id}>
                {message.text}
              </p>
            ) : (
              <article
                className={`chat-message ${message.senderId === me ? "is-own" : ""}`}
                key={message.id}
              >
                <header>
                  <strong style={{ color: message.color }}>
                    {message.name}
                    {message.senderId === me && <small>YOU</small>}
                  </strong>
                  <time dateTime={new Date(message.createdAt).toISOString()}>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </header>
                <p>{message.text}</p>
              </article>
            ),
          )}
        </div>
        {unread > 0 && (
          <button className="chat-latest" onClick={showLatest}>
            {unread} new · Jump to latest
          </button>
        )}
        <form
          className="chat-compose"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim() || chatPending || cooldown) return;
            if (sendChat(draft)) {
              setDraft("");
              setCooldown(true);
              timer.current = setTimeout(() => setCooldown(false), 850);
              sticky.current = true;
            }
          }}
        >
          <input
            aria-label="Message to lobby"
            placeholder="Message the lobby…"
            maxLength={280}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={status !== "lobby"}
            autoComplete="off"
          />
          <span className="chat-count">{draft.length}/280</span>
          <button
            aria-label="Send message"
            disabled={
              !draft.trim() || chatPending || cooldown || status !== "lobby"
            }
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}
