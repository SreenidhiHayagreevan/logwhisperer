# Guild.ai agent

LogWhisperer runs an agent on [Guild.ai](https://guild.ai) for every question, so each answer has an audit log of the model and tool calls behind it.

## How it works

1. The backend calls `start_guild_run(question)` in `backend/guild_client.py`, which starts a Guild session and returns its URL straight away.
2. `/ask` returns that URL as `guild_session_url`, and the app shows it as **View agent log on Guild**.
3. On Guild, the agent in `logwhisperer-test/agent.ts` queries ClickHouse, sends the rows to AkashML for a plain-English explanation, and records each step in the session.

The agent holds no credentials. ClickHouse and AkashML are reached through two Guild integrations, and Guild injects the stored credentials server-side:

| Integration | Calls | Credential stored in Guild |
|---|---|---|
| `lw-clickhouse` | ClickHouse Cloud HTTP interface, `GET /?query=...` | Read-only user `agent_ro` (SELECT on `auth_logs` only) |
| `lw-akashml` | AkashML `POST /chat/completions` | AkashML API key |

`integrations/` holds the OpenAPI specs both integrations were created from. `logwhisperer-test/schema_notes.md` is a copy of `prompts/schema_notes.md`, so the Guild agent and the backend agents describe the table the same way.

## Set up from scratch

Needs Node 22+ and the Guild CLI (`npm install -g @guildai/cli`, then `guild auth login`).

```bash
# Integrations (replace <host>, <owner>)
guild integration create lw-clickhouse --base-url https://<host>:8443 \
  --auth-scheme api-key --header-template "Authorization: Basic {token}"
guild integration operation create <owner>~lw-clickhouse --openapi integrations/clickhouse.openapi.json
guild integration version build <owner>~lw-clickhouse --version-number 1.0.0
guild integration version publish <owner>~lw-clickhouse --version-number 1.0.0
guild integration connect <owner>~lw-clickhouse --owner <owner>   # token: base64 of "agent_ro:<password>"

guild integration create lw-akashml --base-url https://api.akashml.com/v1 \
  --auth-scheme api-key --header-template "Authorization: Bearer {token}"
guild integration operation create <owner>~lw-akashml --openapi integrations/akashml.openapi.json
guild integration version build <owner>~lw-akashml --version-number 1.0.0
guild integration version publish <owner>~lw-akashml --version-number 1.0.0
guild integration connect <owner>~lw-akashml --owner <owner>      # token: the AkashML API key

# Agent
cd logwhisperer-test && npm install
guild agent save --message "..." --publish
guild workspace agent add <owner>~logwhisperer-test --workspace <owner>~<workspace>

# Key for the backend
guild api-key create --name logwhisperer-backend --scopes sessions:write,workspaces:read,agents:read
```

Then set these in the backend's `.env`:

```
GUILD_API_KEY=<key id>:<secret>
GUILD_TRIGGER_URL=https://api.guild.ai/v1/workspaces/<workspace id>/sessions
GUILD_AGENT_ID=<agent id>
```
