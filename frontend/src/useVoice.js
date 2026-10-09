import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognition =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

export const voiceSupported = Boolean(SpeechRecognition);

/**
 * Push-to-talk via the browser's Web Speech API (Chrome).
 * start() while the button is held, stop() on release; onFinal fires with the
 * transcript. The text box stays the always-available fallback.
 */
export function useVoice({ onFinal }) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const finalRef = useRef("");
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event) => {
      let live = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalRef.current += chunk;
        else live += chunk;
      }
      setInterim(live);
    };
    rec.onerror = (event) => {
      console.warn("[LogWhisperer] speech error:", event.error);
      setListening(false);
      // "aborted" and "no-speech" are just a quick tap; the rest need saying.
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone is blocked. Allow it in Chrome's address bar, or type the question.");
      } else if (event.error === "network" || event.error === "audio-capture") {
        setError("Voice input is not working right now. Type the question instead.");
      }
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const text = finalRef.current.trim();
      finalRef.current = "";
      if (text) onFinalRef.current?.(text);
    };

    recRef.current = rec;
    return () => {
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    };
  }, []);

  const start = useCallback(() => {
    if (!recRef.current || listening) return;
    finalRef.current = "";
    setError("");
    try {
      recRef.current.start();
      setListening(true);
    } catch (err) {
      console.warn("[LogWhisperer] could not start mic:", err.message);
    }
  }, [listening]);

  const stop = useCallback(() => {
    if (!recRef.current || !listening) return;
    try {
      recRef.current.stop();
    } catch {
      /* already stopped */
    }
  }, [listening]);

  return { listening, interim, error, start, stop };
}
