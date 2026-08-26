---
name: pre3296-relabel-agent-check-mon
description: Mon 2026-08-24 check of the #11179 relabel-agent post-merge test plan (PRE-3296)
---

Run the post-merge test-plan check for the relabel decision agent (PR Fyxer-AI/web-app#11179), tracked in Linear ticket PRE-3296 (https://linear.app/fyxer/issue/PRE-3296), a sub-ticket of PRE-3202. This is the first of three checks this week (Mon/Tue/Fri).

First, confirm whether #11179 has actually merged to staging yet: `gh pr view 11179 --repo Fyxer-AI/web-app --json state,mergedAt`. If it has NOT merged, note that and stop (nothing to check yet) — the whole plan is only live once it merges.

If it has merged, work through the checks in PRE-3296 against the `fyxer-ai-staging` GCP project (auth: `gcloud auth print-access-token`; if it fails, tell the user to run `gcloud auth login`). Read the full ticket first with the Linear MCP `get_issue` tool (id PRE-3296) so you have the exact criteria and log codes. The priorities, in order:

1. LATENCY on the critical ingestion path. Compare `email_e2e_latency` on service `onnewemailmessage` before vs after the merge time, not just the agent's own `latencyMs`. A live LLM call (gpt-5.6-luna, fallback gemini-3.5-flash-lite, up to 24s worst case) now runs inside labelling. This is the highest-risk regression.
2. Agent run volume and outcomes: query log code `analytics.relabel_decision_agent` (fields priorLogicalLabel, finalLogicalLabel, changed, toActionFolded, latencyMs, model, inputTokens, outputTokens). Expect ~5-15/day.
3. Fail-safe ladder: query `analytics.relabel_decision_failsafe` (reason = out_of_set|invalid_output|model_error|timeout) and the warn-level `relabel_decision_agent_failed` / `relabel_decision_lane_failed`. A failsafe should reproduce today's label — confirm no anomaly.
4. Sanity: correctionCount must never exceed cleanNeighbourCount.

Example query shape:
gcloud logging read 'jsonPayload.code="analytics.relabel_decision_agent" timestamp>="<since>"' --project=fyxer-ai-staging --limit=200 --format="csv[no-heading](jsonPayload.priorLogicalLabel,jsonPayload.finalLogicalLabel,jsonPayload.changed,jsonPayload.toActionFolded,jsonPayload.latencyMs,jsonPayload.model)"

Report a concise summary: merged y/n, latency delta, agent run count, changed/toActionFolded counts, failsafe counts by reason, any warn-level throws, and anything anomalous. Keep it short — this is a monitoring heartbeat, not an essay. Do not change any code.