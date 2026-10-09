import { useState } from "react";

/** The judges' trust button: every answer can show the real query behind it. */
export default function ShowSql({ sql }) {
  const [open, setOpen] = useState(false);
  if (!sql) return null;
  return (
    <div className="sql">
      <button className="link-btn" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide SQL" : "Show SQL"}
      </button>
      {open && <pre className="sql__code">{sql}</pre>}
    </div>
  );
}
