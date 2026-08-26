---
name: pre3296-relabel-agent-check-tue
description: Tue 2026-08-25 check of the #11179 relabel-agent post-merge test plan (PRE-3296)
---

Run the post-merge test-plan check for the relabel decision agent (PR Fyxer-AI/web-app#11179), tracked in Linear ticket PRE-3296 (https://linear.app/fyxer/issue/PRE-3296), a sub-ticket of PRE-3202. This is the second of three checks this week (Mon/Tue/Fri).

First, confirm whether #11179 has actually merged to staging yet: `gh pr view 11179 --repo Fyxer-AI/web-app --json state,mergedAt`. If it has NOT merged, note that and stop (nothing to check yet).

If it has merged, work through the checks in PRE-3296 against the `fyxer-ai-staging` GCP project (auth: `gcloud auth print-access-token`; if it fails, tell the user to run `gcloud auth login`). Read the full ticket first with the Linear MCP `get_issue` tool (id PRE-3296) for the exact criteria and log codes. Priorities, in order:

1. LATENCY on the critical ingestion path. Compare `email_e2e_latency` on service `onnewemailmessage` before vs after merge, not just the agent's own `latencyMs`. Highest-risk regression.
2. Agent run volume and outcomes: log code `analytics.relabel_decision_agent` (priorLogicalLabel, finalLogicalLabel, changed, toActionFolded, latencyMs, model, tokens). Expect ~5-15/day.
3. Fail-safe ladder: `analytics.relabel_decision_failsafe` (reason = out_of_set|invalid_output|model_error|timeout) plus warn-level `relabel_decision_agent_failed` / `relabel_decision_lane_failed`. A failsafe should reproduce today's label.
4. Sanity: correctionCount must never exceed cleanNeighbourCount.

Example query:
gcloud logging read 'jsonPayload.code="analytics.relabel_decision_agent" timestamp>="<since>"' --project=fyxer-ai-staging --limit=200 --format="csv[no-heading](jsonPayload.priorLogicalLabel,jsonPayload.finalLogicalLabel,jsonPayload.changed,jsonPayload.toActionFolded,jsonPayload.latencyMs,jsonPayload.model)"

Report a concise summary: merged y/n, latency delta, agent run count, changed/toActionFolded counts, failsafe counts by reason, warn-level throws, anything anomalous. Note any change since yesterday's (Mon) check. Keep it short. Do not change any code.