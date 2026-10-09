from pathlib import Path
import os, re, sys, time
import clickhouse_connect
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from backend.query_agent import answer_with_sql
from backend.analysis import analyze

MAX_ROWS = 50   # same cap as /ask

QUESTIONS = [
    "Which accounts logged into the most different computers yesterday?",
    "Which source computer used the most different user accounts to log into other computers?",
    "What did computer C17693 do yesterday, in time order?",
    "Were there logins between midnight and 5 AM?",
    "Who had the most failed logins?",
]

ACCOUNT_RE = re.compile(r"^[^@\s]+@\S+$")   # e.g. U66@DOM1, C586$@DOM1, U1718@?
COMPUTER_RE = re.compile(r"^C\d+$")         # e.g. C17693

# Admin client: the only place in the project allowed to read is_attack.
admin = clickhouse_connect.get_client(
    host=os.getenv("CLICKHOUSE_HOST"),
    username=os.getenv("CLICKHOUSE_USER"),
    password=os.getenv("CLICKHOUSE_PASSWORD"),
    secure=True,
)

def ground_truth():
    accounts = {r[0] for r in admin.query(
        "SELECT DISTINCT src_user FROM auth_logs WHERE is_attack = 1").result_rows}
    computers = {r[0] for r in admin.query(
        "SELECT DISTINCT src_comp FROM auth_logs WHERE is_attack = 1").result_rows}
    return accounts, computers

def _values(value):
    if isinstance(value, (list, tuple)):
        for v in value:
            yield from _values(v)
    elif isinstance(value, str):
        yield value

def entities(rows):
    accounts, computers = set(), set()
    for row in rows:
        for value in row.values():
            for v in _values(value):
                if ACCOUNT_RE.match(v):
                    accounts.add(v)
                elif COMPUTER_RE.match(v):
                    computers.add(v)
    return accounts, computers

def run_pipeline(question):
    result = answer_with_sql(question)
    if result["sql"] is None:
        raise ValueError("Model treated the question as off-topic.")
    rows = result["rows"][:MAX_ROWS]
    return result, rows, analyze(question, result["sql"], rows)

def main():
    bad_accounts, bad_computers = ground_truth()
    print(f"Ground truth: {len(bad_accounts)} attacker accounts, "
          f"{len(bad_computers)} attacker source computers\n")

    summary = []
    for i, q in enumerate(QUESTIONS, 1):
        print("=" * 80)
        print(f"Q{i}: {q}")
        start = time.time()
        try:
            result, rows, out = run_pipeline(q)
        except Exception as e:
            print(f"  ERROR: {e!r}\n")
            summary.append((i, "error", 0, 0, 0))
            continue

        print(f"Answer: {out['answer']}")
        print(f"Risk: {out['risk']}")
        print(f"SQL: {result['sql']}")
        print(f"rows_scanned: {result['stats']['rows_scanned']:,} | "
              f"query_ms: {result['stats']['query_ms']} | "
              f"pipeline: {time.time() - start:.1f}s")

        accounts, computers = entities(rows)
        hit_accounts = sorted(accounts & bad_accounts)
        hit_computers = sorted(computers & bad_computers)
        print(f"Accounts in rows: {len(accounts)} | attackers: {hit_accounts or 'none'}")
        print(f"Computers in rows: {len(computers)} | attackers: {hit_computers or 'none'}")
        found = len(hit_accounts) + len(hit_computers)
        print(f"Matches ground truth: {'yes' if found else 'no'}\n")

        summary.append((i, out["risk"], len(hit_accounts), len(hit_computers),
                        result["stats"]["query_ms"]))

    print("=" * 80)
    print(f"{'Q':<3}{'risk':<8}{'attacker accts':>16}{'attacker comps':>16}{'query_ms':>10}")
    for i, risk, n_acc, n_comp, ms in summary:
        print(f"{i:<3}{risk:<8}{n_acc:>16}{n_comp:>16}{ms:>10}")

if __name__ == "__main__":
    main()
