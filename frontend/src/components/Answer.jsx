import { useSyncExternalStore } from "react";
import RiskBadge from "./RiskBadge.jsx";
import ShowSql from "./ShowSql.jsx";
import CopyButton from "./CopyButton.jsx";
import {
  briefingText,
  canSpeak,
  getSpeakingId,
  speak,
  stopSpeaking,
  subscribeSpeech,
} from "../speech.js";
import { useMask } from "../settings.js";

/** One agent answer: plain words, risk, next steps, the stats, the briefing, the SQL. */
export default function Answer({ id, data, isMock }) {
  const speaking = useSyncExternalStore(subscribeSpeech, getSpeakingId) === id;
  const mask = useMask();
  // No SQL means nothing was queried: an off-topic question or a backend error.
  // Show the message alone, without a risk rating or stats it did not earn.
  const answered = Boolean(data.sql);
  const briefing = briefingText(data);

  return (
    <div className="bubble bubble--agent">
      {(answered || isMock) && (
        <div className="bubble__top">
          {answered && <RiskBadge risk={data.risk} />}
          {isMock && <span className="chip chip--mock">mock data</span>}
        </div>
      )}

      <p className="answer">{mask(data.answer)}</p>

      {data.next_steps?.length > 0 && (
        <div className="steps">
          <h3 className="steps__title">Next steps</h3>
          <ul>
            {data.next_steps.map((step, i) => (
              <li key={i}>{mask(step)}</li>
            ))}
          </ul>
        </div>
      )}

      {answered && data.stats && (
        <p className="stats">
          Scanned <strong>{formatRows(data.stats.rows_scanned)} rows</strong> in{" "}
          <strong>{formatMs(data.stats.query_ms)}</strong> · ClickHouse
        </p>
      )}

      <div className="bubble__actions">
        {canSpeak && (
          <button
            className={`btn btn--ghost ${speaking ? "is-speaking" : ""}`}
            onClick={speaking ? stopSpeaking : () => speak(briefing, id)}
          >
            {speaking && (
              <span className="bars" aria-hidden="true"><i /><i /><i /><i /></span>
            )}
            {speaking ? "Stop briefing" : "Play briefing"}
          </button>
        )}
        <CopyButton text={mask(briefing)} label="Copy answer" />
        {data.guild_session_url && (
          <a className="link-btn" href={data.guild_session_url} target="_blank" rel="noreferrer">
            View agent log on Guild
          </a>
        )}
        <ShowSql sql={data.sql} />
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
