// Spoken briefings use the browser's built-in voice: no key, nothing uploaded.
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

/** Speak text, replacing anything already playing. onDone fires on end or error. */
export function speak(text, onDone) {
  if (!canSpeak) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  utterance.onend = () => onDone?.();
  utterance.onerror = () => onDone?.();
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel();
}
