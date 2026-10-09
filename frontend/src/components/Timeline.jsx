import ResultsTable from "./ResultsTable.jsx";
import { useMask } from "../settings.js";

/**
 * The attacker's path in time order. Falls back to the results table when the
 * agents return rows but no timeline, so the panel is never empty-handed.
 */
export default function Timeline({ timeline, rows }) {
  const mask = useMask();
  if (!timeline?.length) {
    if (rows?.length) {
      return (
        <div className="panel__body">
          <ResultsTable rows={rows} />
        </div>
      );
    }
    return (
      <div className="panel__body">
        <p className="hint">Ask a question to see the attacker's path here.</p>
      </div>
    );
  }

  const events = [...timeline].sort(
    (a, b) => new Date(a.time) - new Date(b.time)
  );

  return (
    <div className="panel__body">
      <ol className="timeline">
        {events.map((event, i) => (
          <li
            key={i}
            className={`tl ${Number(event.is_attack) === 1 ? "tl--attack" : ""}`}
            style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
          >
            <time className="tl__time">{formatTime(event.time)}</time>
            <div className="tl__event">
              {mask(event.event)}
              {Number(event.is_attack) === 1 && (
                <span className="tl__flag">attack</span>
              )}
            </div>
          </li>
        ))}
      </ol>
      {rows?.length > 0 && (
        <>
          <h3 className="panel__subtitle">Query results</h3>
          <ResultsTable rows={rows} />
        </>
      )}
    </div>
  );
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value ?? "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
