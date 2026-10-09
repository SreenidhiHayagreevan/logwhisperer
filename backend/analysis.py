import os, json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(base_url=os.getenv("AKASHML_BASE_URL"), api_key=os.getenv("AKASHML_API_KEY"))
MODEL = os.getenv("AKASHML_MODEL")

MAX_ROWS = 50
RISKS = ("low", "medium", "high")

INVESTIGATE_SYSTEM = """You are a security investigator reviewing Windows authentication logs from a company network.
You get a user's question, the SQL that was run, and the result rows.

Look for:
- Lateral movement: one account reaching many different computers.
- One source computer using many different accounts.
- Logins at unusual hours (for example midnight to 5 AM).
- Bursts of failed logins.

Accounts with a "?" domain (e.g. U1718@?) and accounts that are busy every hour of the day are likely automated or system activity.
Rate them lower risk unless other signs appear. Accounts ending in $ are computer accounts.

Only describe what the rows show. Name specific accounts, computers, counts, and times.

Return ONLY JSON: {"risk": "low" | "medium" | "high", "findings": ["<short finding>", ...]}"""

EXPLAIN_SYSTEM = """You explain security findings to a non-expert. Your answer is read aloud.

Rules:
- "answer": plain English, at most 3 short sentences, under 60 words. No jargon, no SQL.
- "next_steps": up to 3 concrete actions, e.g. "Lock account U66@DOM1" or "Check computers C1823 and C2867".

Return ONLY JSON: {"answer": "<text>", "next_steps": ["<action>", ...]}"""


def _first_json(text: str):
    start = (text or "").find("{")
    if start == -1:
        return None
    try:
        obj, _ = json.JSONDecoder().raw_decode(text[start:])
    except ValueError:
        return None
    return obj if isinstance(obj, dict) else None

def _ask(system: str, payload: dict):
    try:
        r = client.chat.completions.create(
            model=MODEL,
            temperature=0,
            messages=[{"role": "system", "content": system},
                      {"role": "user", "content": json.dumps(payload, default=str)}],
        )
    except Exception:
        return None
    return _first_json(r.choices[0].message.content)

def _str_list(value, limit: int) -> list:
    if not isinstance(value, list):
        return []
    return [str(v).strip() for v in value if str(v).strip()][:limit]

def investigate(question: str, sql: str, rows: list) -> dict:
    data = _ask(INVESTIGATE_SYSTEM, {"question": question, "sql": sql, "rows": rows[:MAX_ROWS]}) or {}
    risk = str(data.get("risk", "")).strip().lower()
    findings = _str_list(data.get("findings"), 10)
    if risk not in RISKS:
        # unknown risk is never reported as "low"
        risk = "medium"
        findings = findings or ["Automatic analysis failed. Review the results manually."]
    return {"risk": risk, "findings": findings}

def explain(question: str, rows: list, risk: str, findings: list) -> dict:
    data = _ask(EXPLAIN_SYSTEM, {"question": question, "risk": risk,
                                 "findings": findings, "rows": rows[:MAX_ROWS]}) or {}
    answer = data.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        answer = f"I found results with {risk} risk, but could not summarize them. Please review the findings."
    return {"answer": answer.strip(), "next_steps": _str_list(data.get("next_steps"), 3)}

if __name__ == "__main__":
    from backend.query_agent import answer_with_sql

    q = "Which accounts logged into the most different computers yesterday?"
    result = answer_with_sql(q)
    print("SQL:", result["sql"])

    inv = investigate(q, result["sql"], result["rows"])
    exp = explain(q, result["rows"], inv["risk"], inv["findings"])

    print("Risk:", inv["risk"])
    print("Findings:")
    for f in inv["findings"]:
        print("  -", f)
    print("Answer:", exp["answer"])
    print("Next steps:")
    for s in exp["next_steps"]:
        print("  -", s)
