// Colour plus the written word, so the level never depends on colour alone.
const LABELS = { high: "High risk", medium: "Medium risk", low: "Low risk" };

export default function RiskBadge({ risk }) {
  const level = LABELS[risk] ? risk : "low";
  return (
    <span className={`badge badge--${level}`}>
      <span className="badge__dot" aria-hidden="true" />
      {LABELS[level]}
    </span>
  );
}
