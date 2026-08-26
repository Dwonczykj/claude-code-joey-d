---
name: verify-chat-turn-analytics-staging
description: Verify the new "Chat turn analytics" telemetry from web-app PR #9946 is emitting correctly in staging logs.
model: sonnet
effort: medium
---

Verify that the new per-turn chat telemetry from Fyxer-AI/web-app PR #9946 ("feat: Better turn based tool analytics on chat agent") is working correctly in the staging environment.

Background: PR #9946 (branch joeydwonczyk/chat-agent-per-turn-analytics-trace, base staging) adds a structured log emitted once per agent step inside functions/src/features/chat/streaming/streamUnifiedChatResponse.ts. The log call is `logger.info("Chat turn analytics", { code: "unified_chat_turn_analytics", flow: <FyxerFlow.UNIFIED_CHAT>, userId, organisationId, threadId, threadType, turnIndex, inputTokens, outputTokens, durationMs, tools })`. It runs inside the deployed Cloud Functions `onChatMessageCreated` (main path) and `onChatRunRetryRequestCreated` (retry path). Staging GCP project = `fyxer-ai-staging`.

Steps:
1. Check whether PR #9946 has merged to `staging`: run `gh pr view 9946 --repo Fyxer-AI/web-app --json state,mergedAt,mergeCommit,baseRefName`. If it is NOT merged yet, report that it hasn't merged so the telemetry isn't deployed to staging, and STOP (nothing further to verify). If merged, note the merge time and continue.
2. Confirm the functions redeployed after the merge (a staging deploy runs on merge to staging). If a deploy is clearly still in progress or failed, note it.
3. Query staging logs for the new message over the last 24h. Prefer the `observability-staging` MCP tool `list_log_entries` with resourceNames ["projects/fyxer-ai-staging"] and filter `jsonPayload.code="unified_chat_turn_analytics"`, orderBy "timestamp desc". If that MCP returns a permission error, fall back to: `~/google-cloud-sdk/bin/gcloud logging read 'jsonPayload.code="unified_chat_turn_analytics"' --project=fyxer-ai-staging --freshness=1d --limit=25 --format=json` (run `~/google-cloud-sdk/bin/gcloud auth login` first only if auth has expired and an interactive prompt is possible; otherwise report the auth blocker).
4. Verify entries exist and are well-formed: each jsonPayload should contain turnIndex (integer >= 0), inputTokens, outputTokens (non-negative numbers), durationMs (> 0), tools (array — may be empty), threadId, threadType. Flag any entries with durationMs that look wrong (e.g. equal to epoch-millis magnitude, which would indicate a finish-step arrived before a start-step), missing fields, or token values of "?"/null.
5. Report concisely: number of matching entries in the window, how many distinct threads, whether the field structure is correct, a couple of representative (PII-free) example values for turnIndex/inputTokens/outputTokens/durationMs/tools, and any anomalies or errors found. If zero entries despite a successful merge+deploy, note that chat traffic may simply not have hit staging yet and suggest sending a test chat message.

Constraints: Do NOT include any customer PII (names, email addresses, message content) in the report — internal IDs (threadId, organisationId, userId) are fine. Keep the report short and skimmable.