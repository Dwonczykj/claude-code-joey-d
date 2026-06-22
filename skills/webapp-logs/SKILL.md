---
name: webapp-logs
description: Query the LOCAL Firebase emulator logs (functions, firestore, etc.) for the Fyxer web-app running on this machine via `pnpm functions:dev`. LOCAL ONLY — it reads localhost emulator ports and CANNOT see QA, staging, or production logs. Use when debugging the locally running app: errors, a function's structured logs, what happened after an action in the local app, or to live-tail while reproducing a bug locally. Reads the same stream the Emulator UI at localhost:4000/logs shows, from the CLI.
---

# webapp-logs

Read the Fyxer web-app's **local** emulator logs from the CLI.

## Scope — local only

This skill talks to the Firebase emulators running on **localhost** (the logging
emulator on `:4500`, discovered via the hub on `:4400`). It can ONLY surface logs
from the web-app running on this machine via `pnpm functions:dev`.

It **cannot** read logs from any deployed environment — **QA, staging, and
production are out of scope**. There is no flag or host option that makes this
work against a remote project; pointing `--host` elsewhere will not reach a
deployed environment's logs. For deployed-environment logs use Google Cloud
Logging / the observability tooling instead, not this skill. If the task is to
debug QA, staging, or prod, do not use this skill.

## How the logs are served

The Emulator UI at
`http://localhost:4000/logs` only streams logs over a WebSocket (the logging
emulator on port 4500) — there is no plain HTTP/REST endpoint for them. This
skill bundles `query-logs.js`, a zero-dependency Node script (Node 18+, uses the
built-in global `WebSocket`) that connects to that stream, replays the buffered
backlog, applies filters, and prints clean log lines.

## Prerequisite

The emulators must be running: `pnpm functions:dev` (from the web-app root). If
they aren't, the script exits 1 with a clear hint. It auto-discovers the logging
port from the emulator hub (`:4400`), so it keeps working if ports shift.

## How to run

```bash
node ~/.claude/skills/webapp-logs/query-logs.js [options]
```

The script is in this skill's directory next to `SKILL.md`. By default it runs
**one-shot**: connects, drains everything currently buffered, prints, and exits
(it does not hang). Only the log **message** is printed (ANSI stripped); the
functions logger duplicates the entire payload into a `data` field, so pass
`--data` only when you actually need the structured object.

## Recipes (most useful first)

```bash
# Errors and warnings only — the fastest "what broke?" check
node ~/.claude/skills/webapp-logs/query-logs.js --level warn,error

# What happened in the last 30 seconds (run right after reproducing in the app)
node ~/.claude/skills/webapp-logs/query-logs.js --since 30

# Everything about a specific function / code / id (message + data is searched)
node ~/.claude/skills/webapp-logs/query-logs.js -g "sendChatDraft"
node ~/.claude/skills/webapp-logs/query-logs.js -g "chat_model_latency"

# Drop the noisy HTTP request/response lines to see real app logs
node ~/.claude/skills/webapp-logs/query-logs.js -v "response sent|request received|got id token|authenticating|decoded"

# Last N buffered entries
node ~/.claude/skills/webapp-logs/query-logs.js --last 40

# Include the structured data payload when a message alone isn't enough
node ~/.claude/skills/webapp-logs/query-logs.js -g draft --data --last 20

# Live-tail while you reproduce a bug (streams new entries for 60s, then exits)
node ~/.claude/skills/webapp-logs/query-logs.js -f -g "draft" --timeout 60

# Machine-readable output (one JSON object per line) to pipe into jq
node ~/.claude/skills/webapp-logs/query-logs.js -g error --json | jq -r .message
```

Run `node ~/.claude/skills/webapp-logs/query-logs.js --help` for the full option list.

## Reading the output

Each line is `HH:MM:SS LEVEL message`. The app logs via a structured (pino-style)
logger, so most `INFO` messages are themselves JSON with a `code` field
(`message_completed`, `chat_model_latency`, `get_person_recents_query_completed`,
…) — grep on `code` values to follow a flow. Lines beginning with `>` are the
functions runtime forwarding the app's own logs.

## Tips for debugging

- Combine filters: `--level warn,error --since 60` for "recent failures".
- The HTTP request/response logging (`request received` / `response sent`) is
  high-volume; `-v` it out unless you're debugging routing/status codes.
- Secret-manager 404 errors at startup are expected locally (no `.secret.local`
  overrides) — usually not the bug you're chasing.

## Related: reading Firestore data from the CLI

Not logs, but often needed alongside them while debugging. The Firestore emulator
(`:8080`) serves the REST API; rules are bypassed with `Authorization: Bearer owner`.
Project id is irrelevant in the emulator — use `fyxer-ai-dev`.

```bash
# List docs in a collection
curl -s -H "Authorization: Bearer owner" \
  "http://localhost:8080/v1/projects/fyxer-ai-dev/databases/(default)/documents/EmailMessage?pageSize=5" | jq

# Structured query
curl -s -H "Authorization: Bearer owner" -H "Content-Type: application/json" \
  "http://localhost:8080/v1/projects/fyxer-ai-dev/databases/(default)/documents:runQuery" \
  -d '{"structuredQuery":{"from":[{"collectionId":"EmailMessage"}],"limit":3}}' | jq
```
