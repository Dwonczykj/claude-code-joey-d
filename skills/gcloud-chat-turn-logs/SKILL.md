---
name: gcloud-chat-turn-logs
description: Query GCP Cloud Logging for Fyxer Chat tool-call traces (QA/prod) — find what tools fired per turn, their resultStatus, and silent failures. Use when investigating chat behavior like "why did the model call write_memory 16 times" or "what did the agent actually do in that thread". Auto-runs `gcloud auth login` if the first call returns an auth error.
---

# gcloud chat turn logs

## When to use
- A chat thread did something unexpected (too many tool calls, missing results, partial behavior) and you want the actual server-side trace.
- Need to correlate tool-call counts to actual side-effects (e.g. firestore writes) per turn.

## Projects
- QA: `fyxer-ai-qa`
- Prod: `fyxer-ai-prod`

## Step 1 — Turn summary

Lists every turn on a thread with the tool names it fired (matches the user-visible "Used N tools" counter). `threadId` is in the chat URL, in Firestore, and in any logged jsonPayload.

```bash
gcloud logging read 'jsonPayload.code="unified_chat_turn_analytics" AND jsonPayload.threadId="<THREAD_ID>"' \
  --project=<PROJECT> --freshness=1d --limit=25 \
  --format='table(timestamp, jsonPayload.threadId, jsonPayload.turnIndex, jsonPayload.inputTokens, jsonPayload.outputTokens, jsonPayload.durationMs, jsonPayload.tools)'
```

If you don't know the thread, omit the threadId clause and add `--freshness=2h`.

## Step 2 — Per-call outcome

`chat_tool_completed` carries `resultStatus` (`written` | `failed` | `near_duplicates_found` | etc.) — the diff between calls and successes.

```bash
gcloud logging read 'jsonPayload.chatThreadId="<THREAD_ID>" AND jsonPayload.code="chat_tool_completed"' \
  --project=<PROJECT> --freshness=1d --limit=50 --format=json \
  | python3 -c "import json,sys; [print(x['timestamp'],'|',x['jsonPayload'].get('toolName'),'|',x['jsonPayload'].get('resultStatus'),'|',x['jsonPayload'].get('durationMs'),'ms') for x in json.load(sys.stdin)]"
```

## Step 3 — Side-effect logs (memory tools example)

```bash
gcloud logging read 'jsonPayload.userId="<USER_ID>" AND jsonPayload.code=~"memory_item"' \
  --project=<PROJECT> --freshness=1d --limit=50 \
  --format='value(timestamp,jsonPayload.code,jsonPayload.id)'
```

Substitute the `code=~"..."` pattern for the feature you're tracing (e.g. `draft_`, `schedule_`, `notetaker_`).

## Step 4 — Silent failures

If `chat_tool_completed.resultStatus = "failed"` but nothing is logged at WARNING+, the failure happened in a tool-shared guard (e.g. `buildEpisode`, `resolveExpiresAt`) that returns `{ status: "failed" }` without logging. Read the tool's `_shared.ts` / argument-validation helpers — those are the usual culprits. Add a WARN log there if you need future visibility.

```bash
gcloud logging read 'jsonPayload.userId="<USER_ID>" AND severity>=WARNING' \
  --project=<PROJECT> --freshness=1d --limit=30 \
  --format='value(timestamp,severity,jsonPayload.code,jsonPayload.message)'
```

Empty result + lots of `resultStatus=failed` = silent guard rejection.

## Auth recovery

If any call returns `ERROR: (gcloud.logging.read) ... credentials ... reauthenticate`, `ERROR: (gcloud.logging.read) You do not currently have an active account`, or `Reauthentication required`, run:

```bash
gcloud auth login
```

Then retry the original command. Do NOT use `gcloud auth application-default login` here — `gcloud logging read` uses the user credential, not ADC.

## Tips
- `tools` in `unified_chat_turn_analytics` is the cheapest summary — start there before pulling per-call logs.
- `chat_tool_called` exists but does NOT log tool input args — don't try to read input payloads from it.
- For prod, prefer `--freshness=2h` to keep result sets small; QA is fine at `1d`.
- `chatThreadId` (chat_tool_completed) vs `threadId` (unified_chat_turn_analytics) — both keys exist; pick the one matching the log code.
