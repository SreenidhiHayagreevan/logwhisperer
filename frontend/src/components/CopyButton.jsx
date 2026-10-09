import { useState } from "react";

/** Copies text and confirms briefly, so the click visibly did something. */
export default function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: leave the label unchanged */
    }
  }

  return (
    <button className="link-btn" onClick={copy}>
      {copied ? "Copied" : label}
    </button>
  );
}
