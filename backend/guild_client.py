import os, json, base64, urllib.request
from dotenv import load_dotenv

load_dotenv()

TIMEOUT_SECONDS = 5


def start_guild_run(question: str) -> "str | None":
    """Start the Guild agent on this question and return the session URL.

    Returns as soon as the run is created; it does not wait for the agent to
    finish. Returns None if Guild is not configured, slow, or failing. Never
    raises, so /ask keeps working without Guild.
    """
    try:
        api_key = os.getenv("GUILD_API_KEY")          # "<key id>:<secret>"
        url = os.getenv("GUILD_TRIGGER_URL")
        agent_id = os.getenv("GUILD_AGENT_ID")
        if not (api_key and url and agent_id and question and question.strip()):
            return None

        body = json.dumps({
            "session_type": "chat",
            "agent_id": agent_id,
            "initial_prompt": question.strip(),
        }).encode()
        request = urllib.request.Request(url, data=body, method="POST", headers={
            "Authorization": "Basic " + base64.b64encode(api_key.encode()).decode(),
            "Content-Type": "application/json",
        })
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            session = json.loads(response.read())

        session_url = session.get("session_url")
        if not session_url and session.get("id"):
            session_url = f"https://app.guild.ai/sessions/{session['id']}"
        return session_url or None
    except Exception as e:
        print(f"[guild] run not started: {type(e).__name__}")
        return None


if __name__ == "__main__":
    print(start_guild_run("Which accounts logged into the most different computers yesterday?"))
