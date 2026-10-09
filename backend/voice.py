"""POST /speak — turns an answer into spoken audio with ElevenLabs.

Owned by Himaja. Wire it into the app in backend/main.py with:

    from backend.voice import router as voice_router
    app.include_router(voice_router)

The API key never leaves the backend; the React app only ever sees audio bytes.

To test the briefing before backend/main.py exists, run this file on its own:

    python -m backend.voice          # serves only /speak, on port 8000
"""

import os

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

load_dotenv()

router = APIRouter()

ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech"
# A calm, clear default; override with ELEVENLABS_VOICE_ID in .env.
DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"
DEFAULT_MODEL_ID = "eleven_turbo_v2_5"
MAX_CHARS = 1200


class SpeakRequest(BaseModel):
    text: str


@router.post("/speak")
async def speak(req: SpeakRequest) -> Response:
    """Return audio/mpeg for the given text."""
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text to speak.")

    api_key = (os.getenv("ELEVENLABS_API_KEY") or "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="ELEVENLABS_API_KEY is not set.")

    # `or` rather than a getenv default: a blank line in .env yields "", not None.
    voice_id = (os.getenv("ELEVENLABS_VOICE_ID") or "").strip() or DEFAULT_VOICE_ID
    model_id = (os.getenv("ELEVENLABS_MODEL_ID") or "").strip() or DEFAULT_MODEL_ID

    payload = {
        "text": text[:MAX_CHARS],
        "model_id": model_id,
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.75},
    }
    headers = {"xi-api-key": api_key, "Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{ELEVENLABS_URL}/{voice_id}", json=payload, headers=headers
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=504, detail=f"ElevenLabs unreachable: {exc}") from exc

    if resp.status_code != 200:
        # Surface the reason in the server log; keep the client message short.
        print(f"[voice] ElevenLabs {resp.status_code}: {resp.text[:300]}")
        raise HTTPException(status_code=502, detail="Text-to-speech failed.")

    return Response(content=resp.content, media_type="audio/mpeg")


if __name__ == "__main__":
    # Standalone runner for testing /speak without the rest of the backend.
    import uvicorn
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware

    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("PORT", "8000")))
