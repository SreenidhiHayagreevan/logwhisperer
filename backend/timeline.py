import datetime

MAX_EVENTS = 50
ENTITY_COLS = ("src_user", "src_comp", "dst_comp")

def _iso(value) -> str:
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    return str(value)

def _event_text(row: dict) -> str:
    user, src, dst = row.get("src_user"), row.get("src_comp"), row.get("dst_comp")
    failed = str(row.get("result", "")).lower() == "fail"

    if user:
        if failed:
            return f"Failed login: {user} to {dst}" if dst else f"Failed login: {user}"
        if dst and src:
            return f"{user} logged into {dst} from {src}"
        return f"{user} logged into {dst or src}"

    path = " → ".join(c for c in (src, dst) if c)
    return f"Failed login: {path}" if failed else path

def build_timeline(rows: list) -> list:
    if not rows or "timestamp" not in rows[0]:
        return []
    if not any(c in rows[0] for c in ENTITY_COLS):
        return []

    events = [{"time": _iso(r["timestamp"]), "event": _event_text(r), "is_attack": 0}
              for r in rows if r.get("timestamp") is not None]
    events.sort(key=lambda e: e["time"])
    return events[:MAX_EVENTS]

if __name__ == "__main__":
    from backend.query_agent import answer_with_sql

    out = answer_with_sql("Which computers did U66@DOM1 reach, in order?")
    print("SQL:", out["sql"])
    for e in build_timeline(out["rows"])[:10]:
        print(e)
