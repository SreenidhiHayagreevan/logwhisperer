// LogWhisperer on Guild: answers security questions about the LANL auth logs.
// The agent never holds credentials. ClickHouse (read-only user) and AkashML are
// reached through Guild integrations, and every call is recorded in the session.
import { llmAgent } from "@guildai/agents-sdk";
import { LwClickhouseTools } from "@guildai-services/himajasree38~lw-clickhouse";
import { LwAkashmlTools } from "@guildai-services/himajasree38~lw-akashml";
// Same schema notes the FastAPI agents use (copied from prompts/schema_notes.md).
import schemaNotes from "./schema_notes.md";

const AKASHML_MODEL = "zai-org/GLM-5.3";

const systemPrompt: string = `
You are LogWhisperer, a security analyst for a small team with no security
specialist. You answer questions about authentication logs stored in ClickHouse.

${schemaNotes}

For every question:
1. Call lw_clickhouse_run_query with ONE ClickHouse SELECT query on auth_logs
   and default_format "JSON". Never use the is_attack column. Always include
   ORDER BY and a LIMIT of 100 or less. Never guess data.
2. Call lw_akashml_chat_completions with model "${AKASHML_MODEL}",
   max_tokens 800, and messages that give the question and the query's rows,
   asking for a plain-English explanation in at most 3 short sentences that
   names the specific accounts, computers, counts, and times in the rows.
3. Reply with that explanation, then the SQL you ran, then the rows_read and
   elapsed values from the query's statistics.

If a query fails, fix it and retry once. If you have no data, say so rather
than inventing accounts, computers, or numbers.
`;

export default llmAgent({
  tools: { ...LwClickhouseTools, ...LwAkashmlTools },
  systemPrompt,
});
