// Spoken briefings use the browser's built-in voices: no key, nothing uploaded
// by this app. (Chrome's "Google" voices are synthesised by Google's service.)
export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

// One briefing plays at a time. `speakingId` says which answer it belongs to, so
// that answer's button can show "Stop briefing" however the speech was started.
let speakingId = null;
// Set when the browser accepts a briefing but never starts playing it.
let stuck = false;
// Chrome can garbage-collect utterances mid-speech unless something holds them.
let current = null;
let voices = [];
let preferredVoice = ""; // voice name chosen in Settings; "" picks automatically
const listeners = new Set();
const START_TIMEOUT_MS = 4000;

const notifyAll = () => listeners.forEach((notify) => notify());

function setSpeaking(id) {
  speakingId = id;
  notifyAll();
}

export function subscribeSpeech(notify) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export const getSpeakingId = () => speakingId;
export const getSpeechStuck = () => stuck;
export const getVoices = () => voices;

// Voices arrive asynchronously, and Chrome's Google voices only when online.
if (canSpeak) {
  const refresh = () => {
    voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
    notifyAll();
  };
  refresh();
  window.speechSynthesis.addEventListener("voiceschanged", refresh);
}

export function setPreferredVoice(name) {
  preferredVoice = name || "";
}

// Most natural first. Premium and Enhanced are macOS downloads; the Google
// voices ship with Chrome; the rest are the standard system voices.
const VOICE_ORDER = [
  /\((Premium|Enhanced)\)/,
  /^Google US English$/,
  /^Google UK English Female$/,
  /^Samantha$/,
  /^Karen$/,
  /^Daniel$/,
];

export function bestVoice() {
  const chosen = voices.find((v) => v.name === preferredVoice);
  if (chosen) return chosen;
  for (const pattern of VOICE_ORDER) {
    const match = voices.find((v) => pattern.test(v.name));
    if (match) return match;
  }
  return voices.find((v) => v.lang === "en-US") || voices[0] || null;
}

/** Speak text on behalf of the answer `id`, replacing anything already playing. */
export function speak(text, id) {
  if (!canSpeak || !text) return;
  const synth = window.speechSynthesis;
  const voice = bestVoice();
  // One utterance per sentence: natural pauses between them, and it avoids
  // Chrome cutting off long passages with the Google voices.
  const sentences = text.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) || [text];
  const run = { started: false };
  run.utterances = sentences.map((sentence) => {
    const utterance = new SpeechSynthesisUtterance(sentence.trim());
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    return utterance;
  });

  // Only the briefing now playing may clear the state; a cancelled one must not.
  const finished = () => {
    if (current === run) {
      current = null;
      setSpeaking(null);
    }
  };
  run.utterances[0].onstart = () => {
    run.started = true;
    if (stuck) {
      stuck = false;
      notifyAll();
    }
  };
  run.utterances.at(-1).onend = finished;
  run.utterances.forEach((utterance) => {
    utterance.onerror = finished;
  });

  const wasBusy = synth.speaking || synth.pending;
  // Always reset first: Chrome's voice can be left stuck or paused by an earlier
  // interruption, and then speak() queues silently behind it.
  synth.cancel();
  synth.resume();
  current = run;
  setSpeaking(id);

  const start = () => {
    if (current === run) run.utterances.forEach((utterance) => synth.speak(utterance));
  };
  // Chrome drops a speak() issued in the same tick as a cancel() that stopped something.
  if (wasBusy) setTimeout(start, 150);
  else start();

  // If playback never begins, stop pretending: clear the state and say so.
  setTimeout(() => {
    if (current === run && !run.started) {
      current = null;
      synth.cancel();
      stuck = true;
      setSpeaking(null);
    }
  }, START_TIMEOUT_MS);
}

export function stopSpeaking() {
  current = null;
  if (canSpeak) window.speechSynthesis.cancel();
  setSpeaking(null);
}

const ORDINALS = ["First", "Second", "Third"];

/**
 * The text read aloud for an answer, written for the ear: the answer, then the
 * next steps introduced one by one. Domain suffixes such as "@DOM1" are dropped
 * because a voice reads them as "at dom one".
 */
export function briefingText(data) {
  const steps = (data.next_steps || []).map((step, i) => {
    const text = step.trim().replace(/[.!?]+$/, "");
    const lead = ORDINALS[i];
    return lead ? `${lead}, ${text.charAt(0).toLowerCase()}${text.slice(1)}.` : `${text}.`;
  });
  const parts = [data.answer.trim()];
  if (steps.length) parts.push("Here is what I recommend.", ...steps);
  return parts
    .join(" ")
    .replace(/@[A-Za-z0-9?$]+/g, "")
    .replace(/\s+/g, " ");
}
