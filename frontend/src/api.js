// All backend calls live here. Keys stay on the backend; the app never sees them.
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
// The three agents can take a while; give up before the audience does.
const ASK_TIMEOUT_MS = 60000;

import mockResponse from "../../prompts/mock_response.json";

/**
 * Ask the agents a question.
 * Returns { data, isMock, error }.
 * - Backend not there yet (unreachable, or no /ask route): the mock contract
 *   example, flagged with isMock so the UI can say so.
 * - Backend there but failing (5xx, bad JSON, timeout): error set, no mock — a
 *   canned answer must never stand in for a real one that went wrong.
 */
export async function ask(question) {
  let res;
  try {
    res = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal: AbortSignal.timeout(ASK_TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === "TimeoutError") {
      return { error: "The agents took too long to answer. Try asking again." };
    }
    console.warn("[LogWhisperer] /ask unreachable, using mock:", err.message);
    return { data: normalize(mockResponse), isMock: true };
  }

  if (res.status === 404 || res.status === 405) {
    console.warn(`[LogWhisperer] no /ask route yet (${res.status}), using mock`);
    return { data: normalize(mockResponse), isMock: true };
  }

  try {
    if (!res.ok) throw new Error(`/ask returned ${res.status}`);
    return { data: normalize(await res.json()), isMock: false };
  } catch (err) {
    console.warn("[LogWhisperer] /ask failed:", err.message);
    return { error: "Something went wrong answering that. Try asking again, or rephrase the question." };
  }
}

/** Send text to ElevenLabs via the backend; returns an object URL for an <audio> src. */
export async function speak(text) {
  const res = await fetch(`${API_BASE}/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`/speak returned ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/** Guard every contract field so a missing key can never blank the screen. */
function normalize(raw) {
  const risk = ["low", "medium", "high"].includes(raw?.risk) ? raw.risk : "low";
  return {
    answer: raw?.answer || "No answer came back.",
    risk,
    next_steps: Array.isArray(raw?.next_steps) ? raw.next_steps : [],
    sql: raw?.sql || "",
    rows: Array.isArray(raw?.rows) ? raw.rows : [],
    timeline: Array.isArray(raw?.timeline) ? raw.timeline : [],
  };
}
