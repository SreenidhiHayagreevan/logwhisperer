import os, json
from pathlib import Path
from openai import OpenAI
from dotenv import load_dotenv
from backend.db import run_sql

load_dotenv()
ROOT = Path(__file__).resolve().parent.parent
SCHEMA = (ROOT / "prompts" / "schema_notes.md").read_text()

client = OpenAI(base_url=os.getenv("AKASHML_BASE_URL"), api_key=os.getenv("AKASHML_API_KEY"))
MODEL = os.getenv("AKASHML_MODEL")

SYSTEM = f"""You are a security analyst who writes ClickHouse SQL.
Turn the user's question into ONE ClickHouse SELECT query on table auth_logs.

{SCHEMA}

Rules:
- Return ONLY JSON: {{"sql": "<one SELECT query>"}}
- Never use the is_attack column.
- Always include ORDER BY and LIMIT (max 100).
- Prefer returning user, computers, counts, and timestamps so results can be explained.

Examples:
Q: Which accounts logged into the most different computers yesterday?
{{"sql": "SELECT src_user, uniqExact(dst_comp) AS computers, count() AS logins FROM auth_logs WHERE src_user LIKE 'U%' AND src_comp != dst_comp GROUP BY src_user ORDER BY computers DESC LIMIT 10"}}

Q: Which computers did U66@DOM1 reach, in order?
{{"sql": "SELECT timestamp, src_comp, dst_comp, logon_type, result FROM auth_logs WHERE src_user = 'U66@DOM1' AND src_comp != dst_comp ORDER BY timestamp LIMIT 100"}}

Q: Who had the most failed logins?
{{"sql": "SELECT src_user, count() AS failed FROM auth_logs WHERE result = 'Fail' AND src_user LIKE 'U%' GROUP BY src_user ORDER BY failed DESC LIMIT 10"}}
"""

def _ask_model(messages):
    r = client.chat.completions.create(model=MODEL, messages=messages, temperature=0)
    text = r.choices[0].message.content or ""
    start = text.find("{")
    if start != -1:
        try:
            obj, _ = json.JSONDecoder().raw_decode(text[start:])
            return obj["sql"]
        except Exception:
            pass
    return text  # fallback: treat the whole reply as SQL

def answer_with_sql(question: str) -> dict:
    messages = [{"role": "system", "content": SYSTEM},
                {"role": "user", "content": question}]
    sql = _ask_model(messages)
    try:
        return run_sql(sql)
    except Exception as e:
        # one retry: show the model its error
        messages += [{"role": "assistant", "content": json.dumps({"sql": sql})},
                     {"role": "user", "content": f"That query failed with: {e}. Fix it and return only JSON."}]
        return run_sql(_ask_model(messages))

if __name__ == "__main__":
    for q in ["Which accounts logged into the most different computers yesterday?",
              "Which computers did U66@DOM1 reach, in order?",
              "Were there logins at unusual hours, like between midnight and 5 AM?"]:
        print("\nQ:", q)
        out = answer_with_sql(q)
        print("SQL:", out["sql"])
        print("Stats:", out["stats"])
        for row in out["rows"][:5]:
            print("  ", row)
