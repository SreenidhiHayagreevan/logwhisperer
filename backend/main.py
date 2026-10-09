import time, traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.query_agent import answer_with_sql
from backend.analysis import investigate, explain
from backend.timeline import build_timeline

MAX_ROWS = 50

app = FastAPI(title="LogWhisperer")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AskRequest(BaseModel):
    question: str

def _fallback() -> dict:
    return {
        "answer": "I couldn't answer that. Try rephrasing the question.",
        "risk": "low",
        "next_steps": [],
        "sql": "",
        "rows": [],
        "timeline": [],
        "stats": {"rows_scanned": 0, "query_ms": 0},
        "guild_session_url": None,
    }

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/ask")
def ask(req: AskRequest):
    t0 = time.time()
    try:
        result = answer_with_sql(req.question)
        t1 = time.time()
        rows = result["rows"][:MAX_ROWS]

        inv = investigate(req.question, result["sql"], rows)
        t2 = time.time()

        exp = explain(req.question, rows, inv["risk"], inv["findings"])
        t3 = time.time()

        print(f"[ask] query {t1 - t0:.2f}s | investigate {t2 - t1:.2f}s | "
              f"explain {t3 - t2:.2f}s | total {t3 - t0:.2f}s", flush=True)

        return {
            "answer": exp["answer"],
            "risk": inv["risk"],
            "next_steps": exp["next_steps"],
            "sql": result["sql"],
            "rows": rows,
            "timeline": build_timeline(rows),
            "stats": result["stats"],
            "guild_session_url": None,
        }
    except Exception as e:
        print(f"[ask] ERROR after {time.time() - t0:.2f}s: {e!r}", flush=True)
        traceback.print_exc()
        return _fallback()
