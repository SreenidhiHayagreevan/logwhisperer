import { useEffect, useRef, useSyncExternalStore } from "react";
import { bestVoice, getVoices, setPreferredVoice, speak, subscribeSpeech } from "../speech.js";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** Preferences popover. Everything here is stored in this browser only. */
export default function Settings({ settings, update, onClearHistory, onClose }) {
  const ref = useRef(null);
  const voices = useSyncExternalStore(subscribeSpeech, getVoices);

  function previewVoice(name) {
    setPreferredVoice(name);
    speak("One account reached many new computers overnight. Here is what I recommend.", "preview");
  }

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const onClick = (e) => {
      // The parent holds the Settings button too, so its own click can toggle.
      const menu = ref.current?.parentElement;
      if (menu && !menu.contains(e.target)) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  return (
    <div className="settings" ref={ref} role="dialog" aria-label="Settings">
      <section className="settings__group">
        <h3 className="settings__title">Appearance</h3>
        <div className="segmented" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.value}
              role="radio"
              aria-checked={settings.theme === t.value}
              className={`segmented__item ${settings.theme === t.value ? "is-on" : ""}`}
              onClick={() => update({ theme: t.value })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="settings__group">
        <h3 className="settings__title">Voice</h3>
        <Toggle
          label="Read answers aloud"
          hint="Speaks each new answer as it arrives."
          checked={settings.autoSpeak}
          onChange={(autoSpeak) => update({ autoSpeak })}
        />
        {voices.length > 0 && (
          <div className="field">
            <label className="toggle__label" htmlFor="voice">Voice</label>
            <div className="field__row">
              <select
                id="voice"
                className="select"
                value={settings.voice}
                onChange={(e) => {
                  update({ voice: e.target.value });
                  previewVoice(e.target.value);
                }}
              >
                <option value="">Automatic ({bestVoiceName(settings.voice)})</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
              <button className="btn btn--small" onClick={() => previewVoice(settings.voice)}>
                Preview
              </button>
            </div>
            <span className="toggle__hint">
              "Google" voices sound the most natural and need an internet connection.
            </span>
          </div>
        )}
      </section>

      <section className="settings__group">
        <h3 className="settings__title">Privacy</h3>
        <Toggle
          label="Mask account and computer names"
          hint="Shows U••• and C••• on screen. Useful when sharing your screen."
          checked={settings.maskNames}
          onChange={(maskNames) => update({ maskNames })}
        />
        <Toggle
          label="Keep history on this device"
          hint="Off: the conversation is forgotten when you close the tab."
          checked={settings.saveHistory}
          onChange={(saveHistory) => update({ saveHistory })}
        />
        <button className="btn btn--small" onClick={onClearHistory}>
          Clear conversation
        </button>
        <p className="settings__note">
          Questions go to the LogWhisperer backend, the AkashML model and the Guild agent
          log. Voice input uses Chrome's speech service. The logs are queried read-only.
        </p>
      </section>
    </div>
  );
}

/** Name of the voice "Automatic" resolves to right now. */
function bestVoiceName(selected) {
  if (selected) setPreferredVoice("");
  const name = bestVoice()?.name || "system default";
  if (selected) setPreferredVoice(selected);
  return name;
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="toggle">
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        <span className="toggle__hint">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle__track" aria-hidden="true" />
    </label>
  );
}
