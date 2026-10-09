import { useRef, useState } from "react";
import RiskBadge from "./RiskBadge.jsx";
import ShowSql from "./ShowSql.jsx";
import { speak } from "../api.js";

/** One agent answer: plain words, risk, next steps, the briefing, the SQL. */
export default function Answer({ data, isMock }) {
  const [audioState, setAudioState] = useState("idle"); // idle | loading | playing | error
  const audioRef = useRef(null);

  async function playBriefing() {
    if (audioState === "loading") return;
    const briefing = [data.answer, ...(data.next_steps || [])].join(" ");
    setAudioState("loading");
    try {
      const url = await speak(briefing);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setAudioState("idle");
      await audio.play();
      setAudioState("playing");
    } catch (err) {
      console.warn("[LogWhisperer] /speak failed:", err.message);
      setAudioState("error");
    }
  }

  function stopBriefing() {
    audioRef.current?.pause();
    setAudioState("idle");
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

      <div className="bubble__actions">
        <button
          className="btn btn--ghost"
          onClick={audioState === "playing" ? stopBriefing : playBriefing}
          disabled={audioState === "loading"}
        >
          {audioState === "loading" && "Preparing…"}
          {audioState === "playing" && "Stop briefing"}
          {(audioState === "idle" || audioState === "error") && "Play briefing"}
        </button>
        <ShowSql sql={data.sql} />
      </div>

      {audioState === "error" && (
        <p className="hint hint--warn">
          Voice is unavailable right now — the written answer above is the same briefing.
        </p>
      )}
    </div>
  );
}
