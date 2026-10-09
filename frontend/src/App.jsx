import { useCallback, useEffect, useRef, useState } from "react";
import { ask } from "./api.js";
import { useVoice } from "./useVoice.js";
import Answer from "./components/Answer.jsx";
import Timeline from "./components/Timeline.jsx";
import PushToTalk from "./components/PushToTalk.jsx";
import "./App.css";

const DEMO_QUESTIONS = [
  "Which accounts logged into the most new computers last night?",
  "Which computers did that account reach, in order?",
  "Were there any failed login bursts overnight?",
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  // The newest answer drives the right-hand panel.
  const latest = [...messages].reverse().find((m) => m.role === "agent");

  const send = useCallback(
    async (question) => {
      const text = question.trim();
      if (!text || busy) return;
      setDraft("");
      setBusy(true);
      setMessages((prev) => [...prev, { role: "user", text }]);
      const { data, isMock, error } = await ask(text);
      setMessages((prev) => [
        ...prev,
        error ? { role: "error", text: error } : { role: "agent", data, isMock },
      ]);
      setBusy(false);
    },
    [busy]
  );

  const { listening, interim, error: voiceError, start, stop } = useVoice({ onFinal: send });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1 className="header__name">LogWhisperer</h1>
          <p className="header__tag">Talk to your security logs</p>
        </div>
        <span className="header__data">LANL cyber-security events · ClickHouse</span>
      </header>

      <main className="grid">
        <section className="panel panel--chat">
          <div className="chat" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="empty">
                <p className="empty__lead">Ask the logs a question.</p>
                <div className="empty__chips">
                  {DEMO_QUESTIONS.map((q) => (
                    <button key={q} className="chip chip--demo" onClick={() => send(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="bubble bubble--user">
                  {msg.text}
                </div>
              ) : msg.role === "error" ? (
                <div key={i} className="bubble bubble--agent bubble--error" role="alert">
                  {msg.text}
                </div>
              ) : (
                <Answer key={i} data={msg.data} isMock={msg.isMock} />
              )
            )}

            {busy && (
              <div className="bubble bubble--agent thinking">
                <span className="dots"><i /><i /><i /></span>
                Querying the logs and checking the results. This can take up to a minute…
              </div>
            )}
          </div>

          {voiceError && <p className="hint hint--warn composer__hint">{voiceError}</p>}

          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
          >
            <input
              className="composer__input"
              value={listening && interim ? interim : draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask in plain English…"
              disabled={busy}
            />
            <PushToTalk listening={listening} start={start} stop={stop} disabled={busy} />
            <button className="btn btn--send" type="submit" disabled={busy || !draft.trim()}>
              Send
            </button>
          </form>
        </section>

        <aside className="panel panel--side">
          <h2 className="panel__title">Attacker timeline</h2>
          <Timeline timeline={latest?.data?.timeline} rows={latest?.data?.rows} />
        </aside>
      </main>
    </div>
  );
}
