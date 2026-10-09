"""POST /speak — turns an answer into spoken audio with ElevenLabs.

Owned by Himaja. Wire it into the app in backend/main.py with:

    from backend.voice import router as voice_router
    app.include_router(voice_router)

The API key never leaves the backend; the React app only ever sees audio bytes.
"""

import os

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

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

    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="ELEVENLABS_API_KEY is not set.")

    voice_id = os.getenv("ELEVENLABS_VOICE_ID", DEFAULT_VOICE_ID)
    model_id = os.getenv("ELEVENLABS_MODEL_ID", DEFAULT_MODEL_ID)

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
