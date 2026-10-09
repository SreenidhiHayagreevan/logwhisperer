import { useState } from "react";
import CopyButton from "./CopyButton.jsx";
import { useMask } from "../settings.js";

/** The judges' trust button: every answer can show the real query behind it. */
export default function ShowSql({ sql }) {
  const [open, setOpen] = useState(false);
  const mask = useMask();
  if (!sql) return null;
  return (
    <div className="sql">
      <button className="link-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Hide SQL" : "Show SQL"}
      </button>
      {open && (
        <div className="sql__box">
          <pre className="sql__code">{mask(sql)}</pre>
          <div className="sql__copy">
            <CopyButton text={mask(sql)} label="Copy SQL" />
          </div>
        </div>
      )}
    </div>
  );
}
