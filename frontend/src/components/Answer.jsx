import { useEffect, useState } from "react";
import RiskBadge from "./RiskBadge.jsx";
import ShowSql from "./ShowSql.jsx";

const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

/** One agent answer: plain words, risk, next steps, the stats, the briefing, the SQL. */
export default function Answer({ data, isMock }) {
  const [speaking, setSpeaking] = useState(false);

  // Stop talking if this answer leaves the screen.
  useEffect(() => () => canSpeak && window.speechSynthesis.cancel(), []);

  function playBriefing() {
    const briefing = [data.answer, ...(data.next_steps || [])].join(". ");
    const utterance = new SpeechSynthesisUtterance(briefing);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel(); // one briefing at a time
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  function stopBriefing() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <div className="bubble bubble--agent">
      <div className="bubble__top">
        <RiskBadge risk={data.risk} />
        {isMock && <span className="chip chip--mock">mock data</span>}
      </div>

      <p className="answer">{data.answer}</p>

      {data.next_steps?.length > 0 && (
        <div className="steps">
          <h3 className="steps__title">Next steps</h3>
          <ul>
            {data.next_steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      )}

      {data.stats && (
        <p className="stats">
          Scanned <strong>{formatRows(data.stats.rows_scanned)} rows</strong> in{" "}
          <strong>{formatMs(data.stats.query_ms)}</strong> · ClickHouse
        </p>
      )}

      <div className="bubble__actions">
        {canSpeak && (
          <button className="btn btn--ghost" onClick={speaking ? stopBriefing : playBriefing}>
            {speaking ? "Stop briefing" : "Play briefing"}
          </button>
        )}
        <ShowSql sql={data.sql} />
        {data.guild_session_url && (
          <a
            className="link-btn"
            href={data.guild_session_url}
            target="_blank"
            rel="noreferrer"
          >
            View agent log on Guild
          </a>
        )}
      </div>
    </div>
  );
}

/** 18000000 -> "18.0M", 273 -> "273". */
function formatRows(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function formatMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}
