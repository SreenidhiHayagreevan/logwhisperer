import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "logwhisperer.settings";
export const HISTORY_KEY = "logwhisperer.history";

const DEFAULTS = {
  theme: "system", // system | light | dark
  autoSpeak: false, // read each new answer aloud
  voice: "", // voice name for briefings; "" picks the most natural one available
  maskNames: false, // hide account and computer numbers on screen
  saveHistory: false, // keep the conversation in this browser
};

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}

/** User preferences, kept in this browser only. */
export function useSettings() {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* private window or storage blocked: settings last for this visit */
    }
  }, [settings]);

  // "system" removes the attribute so the CSS media query decides.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const update = useCallback(
    (patch) => setSettings((prev) => ({ ...prev, ...patch })),
    []
  );
  return [settings, update];
}

// U66@DOM1 -> U•••@DOM1, C17693 -> C•••. For sharing a screen without
// exposing which accounts and machines are under investigation.
const IDENTIFIER = /\b([UC])\d+/g;
const identity = (value) => value;
const maskText = (value) =>
  typeof value === "string" ? value.replace(IDENTIFIER, "$1•••") : value;

const MaskContext = createContext(identity);
export const MaskProvider = MaskContext.Provider;
export const maskFor = (on) => (on ? maskText : identity);
/** Returns a function to pass any on-screen text through. */
export const useMask = () => useContext(MaskContext);
