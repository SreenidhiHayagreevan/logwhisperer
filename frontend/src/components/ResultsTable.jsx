import { useMask } from "../settings.js";

/** Renders whatever columns the rows happen to have — the schema is not fixed. */
export default function ResultsTable({ rows }) {
  const mask = useMask();
  if (!rows?.length) return null;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  function downloadCsv() {
    const escape = (value) => `"${String(mask(formatRaw(value))).replaceAll('"', '""')}"`;
    const lines = [
      columns.map(escape).join(","),
      ...rows.map((row) => columns.map((col) => escape(row[col])).join(",")),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "logwhisperer-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="table-tools">
        <span className="hint hint--inline">
          {rows.length} {rows.length === 1 ? "row" : "rows"}
        </span>
        <button className="link-btn" onClick={downloadCsv}>
          Download CSV
        </button>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col}>{col.replaceAll("_", " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col}>{mask(formatCell(row[col]))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ClickHouse datetimes arrive as 2026-10-08T01:30:00; show them as "Oct 8, 01:30:00".
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;

function formatRaw(value) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatCell(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" && ISO_DATETIME.test(value)) {
    const date = new Date(value.replace(" ", "T"));
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    }
  }
  if (typeof value === "number") return value.toLocaleString();
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
