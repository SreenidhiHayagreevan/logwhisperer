import { voiceSupported } from "../useVoice.js";

/** Hold to talk. Pointer events cover mouse and trackpad; release always stops. */
export default function PushToTalk({ listening, start, stop, disabled }) {
  if (!voiceSupported) {
    return (
      <button className="ptt ptt--off" disabled title="Use Chrome for voice input">
        Voice needs Chrome
      </button>
    );
  }
  return (
    <button
      className={`ptt ${listening ? "ptt--live" : ""}`}
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="ptt__dot" aria-hidden="true" />
      {listening ? "Listening — release to ask" : "Hold to talk"}
    </button>
  );
}
