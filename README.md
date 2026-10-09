# LogWhisperer

An AI security analyst you can talk to. Ask questions about security logs in plain English, by voice or text, and get a clear answer, a risk rating, a timeline of the attacker's path, and a spoken briefing. Every answer shows the real SQL query behind it.

Built for the Cyberdefense Hackathon (San Francisco, Oct 9 2026), **Attack intelligence** track, by Sreenidhi Hayagreevan and Himaja Sree.

## How it works

1. **You ask** a question by voice or text, such as "Which accounts logged into the most new computers last night?"
2. **QueryAgent** turns the question into ClickHouse SQL and runs it.
3. **InvestigatorAgent** reads the rows, looks for attacker patterns (lateral movement, odd-hour logins, failed-login bursts) and rates the risk as low, medium or high.
4. **ExplainerAgent** writes a short plain-English answer with next steps.
5. **The app** shows the answer, the risk badge, the timeline and the SQL, and ElevenLabs reads the briefing aloud.

The agents have read-only, SELECT-only access to ClickHouse, so they cannot change the logs.

## Stack

| Layer | Tool |
|---|---|
| Log storage and search | ClickHouse |
| Agents | OpenAI Agents SDK |
| Spoken briefing | ElevenLabs text-to-speech |
| Voice input | Browser Web Speech API (Chrome) |
| Backend | FastAPI (Python) |
| Frontend | React + Vite |

## Data

[LANL Comprehensive, Multi-Source Cyber-Security Events](https://csr.lanl.gov/data/cyber1/): real, anonymised authentication logs from Los Alamos National Laboratory's internal network, with labelled red-team attack events. We load a 1 to 3 day slice with the most red-team activity and use the labels as the answer key.

> A. D. Kent, "Comprehensive, Multi-Source Cyber-Security Events," Los Alamos National Laboratory, 2015. doi:10.17021/1179829

## Run it

You need Python 3, Node 18+ and Chrome.

```bash
# 1. Keys (never committed)
cp .env.example .env        # then fill in the values

# 2. Backend, on port 8000
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000

# 3. Frontend, on port 5173
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in Chrome and allow the microphone. Hold **Hold to talk** to ask by voice, or type in the box.

If the backend is not running, the app answers from `prompts/mock_response.json` and marks the answer with a **mock data** chip.

## API

Two endpoints on port 8000.

| Endpoint | Input | Output |
|---|---|---|
| `POST /ask` | `{"question": "..."}` | JSON: `answer`, `risk`, `next_steps`, `sql`, `rows`, `timeline` |
| `POST /speak` | `{"text": "..."}` | `audio/mpeg` |

`prompts/mock_response.json` is the reference example of the `/ask` response.

## Repo layout

```
backend/     FastAPI app, agents, read-only SQL helper, /speak (voice.py)
frontend/    React app: chat, push-to-talk, timeline, Show SQL
prompts/     Schema notes, example queries, mock response
scripts/     LANL slicing, labelling and loading
```
