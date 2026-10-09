"""Single-service entry point for hosting: the API plus the built web app.

Local development does not use this file; run the backend and the Vite dev
server separately as described in the README. For a hosted deployment:

    cd frontend && npm ci && npm run build && cd ..
    uvicorn server:app --host 0.0.0.0 --port $PORT

/ask and /health come from backend.main; every other path serves the app.
"""

from pathlib import Path

from fastapi.staticfiles import StaticFiles

from backend.main import app

DIST = Path(__file__).resolve().parent / "frontend" / "dist"
app.mount("/", StaticFiles(directory=DIST, html=True), name="app")
