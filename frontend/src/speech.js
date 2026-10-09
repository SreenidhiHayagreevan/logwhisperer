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

// Chrome can garbage-collect an utterance mid-speech unless something holds it.
let current = null;

/** Speak text on behalf of the answer `id`, replacing anything already playing. */
export function speak(text, id) {
  if (!canSpeak || !text) return;
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.95;
  // Only the utterance now playing may clear the state; a cancelled one must not.
  const finished = () => {
    if (current === utterance) {
      current = null;
      setSpeaking(null);
    }
  };
  utterance.onend = finished;
  utterance.onerror = finished;

  const wasBusy = synth.speaking || synth.pending;
  // Always reset first: Chrome's voice can be left stuck or paused by an earlier
  // interruption, and then speak() queues silently behind it.
  synth.cancel();
  synth.resume();
  current = utterance;
  setSpeaking(id);

  const start = () => current === utterance && synth.speak(utterance);
  // Chrome drops a speak() issued in the same tick as a cancel() that stopped something.
  if (wasBusy) setTimeout(start, 150);
  else start();
}

export function stopSpeaking() {
  current = null;
  if (canSpeak) window.speechSynthesis.cancel();
  setSpeaking(null);
}

/** The text read aloud for an answer: the answer, then its next steps. */
export function briefingText(data) {
  return [data.answer, ...(data.next_steps || [])].join(". ");
}
