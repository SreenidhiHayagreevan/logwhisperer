# LogWhisperer: project context

An AI security analyst you can talk to. Users ask questions about security logs in plain English; agents query ClickHouse and explain findings.
Built at the Cyberdefense Hackathon (Oct 9, 2026). Sponsors used: ClickHouse, AkashML, Guild.ai.

## Data
- ClickHouse Cloud table `auth_logs`: 19,374,688 rows, LANL authentication logs for one day (2026-10-08, "yesterday").
- Columns: timestamp, time, src_user, dst_user, src_comp, dst_comp, auth_type, logon_type, auth_orientation, result, is_attack.
- is_attack is HIDDEN GROUND TRUTH (261 attack rows). Agents must NEVER query or see it.
- is_attack may be read only by scripts/check_accuracy.py (accuracy checks) and backend/labels.py (display-only timeline labels, applied after the agents have answered). Both use the admin ClickHouse user; everything else uses the read-only user via run_sql.
- Known attack: source computer C17693, accounts like U66@DOM1 and U293@DOM1, lateral movement around 9:30 AM.
- Schema notes for prompts: prompts/schema_notes.md

## Code
- Python 3.12, venv in .venv. Packages in requirements.txt.
- backend/db.py: run_sql(query) is the ONLY way to query ClickHouse. Uses read-only user, SELECT only, adds LIMIT, returns {sql, columns, rows, stats: {rows_scanned, query_ms}}.
- LLM: AkashML via the OpenAI Python client: base_url=AKASHML_BASE_URL, api_key=AKASHML_API_KEY, model=AKASHML_MODEL (from .env). Use temperature=0 and ask for JSON output; do not rely on tool calling.
- Backend: FastAPI in backend/main.py, port 8000, CORS for http://localhost:5173.
- Frontend: React + Vite in frontend/ (owned by Himaja).

## API contract: POST /ask
Request: {"question": "..."}
Response: {"answer": str, "risk": "low"|"medium"|"high", "next_steps": [str], "sql": str, "rows": [obj], "timeline": [{"time": iso str, "event": str, "is_attack": 0|1}], "stats": {"rows_scanned": int, "query_ms": int}, "guild_session_url": str|null}
Example saved in prompts/mock_response.json.

## Rules
- Simple, readable code; small functions; no unnecessary abstractions.
- Never commit .env or data/. Never hardcode keys.
- /ask must never crash: on any error return a friendly answer, risk "low", empty timeline.
