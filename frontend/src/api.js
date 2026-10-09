// All backend calls live here. Keys stay on the backend; the app never sees them.
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

import mockResponse from "../../prompts/mock_response.json";

/**
 * Ask the agents a question.
 * Returns { data, isMock }. Falls back to the mock contract example if the
 * backend is not up yet, so the UI is always demoable.
 */
export async function ask(question) {
  try {
    const res = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    if (!res.ok) throw new Error(`/ask returned ${res.status}`);
    return { data: normalize(await res.json()), isMock: false };
  } catch (err) {
    console.warn("[LogWhisperer] /ask unavailable, using mock:", err.message);
    return { data: normalize(mockResponse), isMock: true };
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
