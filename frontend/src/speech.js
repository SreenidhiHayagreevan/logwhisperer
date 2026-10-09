// Spoken briefings use the browser's built-in voice: no key, nothing uploaded.
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

// One briefing plays at a time. `speakingId` says which answer it belongs to, so
// that answer's button can show "Stop briefing" however the speech was started.
let speakingId = null;
const listeners = new Set();

function setSpeaking(id) {
  speakingId = id;
  listeners.forEach((notify) => notify());
}

export function subscribeSpeech(notify) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export const getSpeakingId = () => speakingId;

/** Speak text on behalf of the answer `id`, replacing anything already playing. */
export function speak(text, id) {
  if (!canSpeak || !text) return;
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  const finished = () => speakingId === id && setSpeaking(null);
  utterance.onend = finished;
  utterance.onerror = finished;

  const interrupting = synth.speaking || synth.pending;
  if (interrupting) synth.cancel();
  setSpeaking(id);
  // Chrome drops a speak() issued in the same tick as a cancel().
  if (interrupting) setTimeout(() => synth.speak(utterance), 80);
  else synth.speak(utterance);
}

export function stopSpeaking() {
  if (canSpeak) window.speechSynthesis.cancel();
  setSpeaking(null);
}

/** The text read aloud for an answer: the answer, then its next steps. */
export function briefingText(data) {
  return [data.answer, ...(data.next_steps || [])].join(". ");
}
