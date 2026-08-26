---
name: pre3296-relabel-agent-check-fri
description: Fri 2026-08-28 check of the #11179 relabel-agent post-merge test plan (PRE-3296)
---

Run the post-merge test-plan check for the relabel decision agent (PR Fyxer-AI/web-app#11179), tracked in Linear ticket PRE-3296 (https://linear.app/fyxer/issue/PRE-3296), a sub-ticket of PRE-3202. This is the third and final check this week (Mon/Tue/Fri) — treat it as an end-of-week wrap-up.

First, confirm whether #11179 has actually merged to staging yet: `gh pr view 11179 --repo Fyxer-AI/web-app --json state,mergedAt`. If it has NOT merged, note that and stop.

If it has merged, work through the checks in PRE-3296 against the `fyxer-ai-staging` GCP project (auth: `gcloud auth print-access-token`; if it fails, tell the user to run `gcloud auth login`). Read the full ticket first with the Linear MCP `get_issue` tool (id PRE-3296) for the exact criteria and log codes. Priorities, in order:

1. LATENCY on the critical ingestion path. Compare `email_e2e_latency` on service `onnewemailmessage` before vs after merge, not just the agent's own `latencyMs`. Highest-risk regression.
2. Agent run volume and outcomes: log code `analytics.relabel_decision_agent` (priorLogicalLabel, finalLogicalLabel, changed, toActionFolded, latencyMs, model, tokens). Expect ~5-15/day.
3. Fail-safe ladder: `analytics.relabel_decision_failsafe` (reason = out_of_set|invalid_output|model_error|timeout) plus warn-level `relabel_decision_agent_failed` / `relabel_decision_lane_failed`. A failsafe should reproduce today's label.
4. Sanity: correctionCount must never exceed cleanNeighbourCount.
5. Also check the tight-loop subtlety from the ticket: how many RelabelExemplar rows were created this week from agent-labelled mail (a self-reinforcing loop on a small pool). Query the RelabelExemplar collection in fyxer-ai-staging Firestore for docs created since merge.

6. COST per decision — the "$0.11 per 1,000 decisions" figure in the relabel-agent pricing note is wrong and should not be used to size prod. Measured on the first 9 staging decisions (2026-08-20, all gpt-5.6-luna): input averaged 1,673 tokens/call and output 33, not the ~500 input that figure implies, giving ~$0.37 per 1,000 decisions at luna rates (0.2 / 1.2 USD per million in/out) — roughly 3.4x the note. Recompute from this week's actual inputTokens/outputTokens and report USD per 1,000 decisions plus mean input tokens, so the estimate gets corrected before anyone budgets off it. Note `estimatedCostUsd` is NOT on the log lines shipped in merged #11179 — that field (and the gemini-3.7-flash fallback swap) only lands with the follow-up commit 0146215af1, so compute cost by hand from the token counts until that is on staging.

Example query:
gcloud logging read 'jsonPayload.code="analytics.relabel_decision_agent" timestamp>="<since>"' --project=fyxer-ai-staging --limit=200 --format="csv[no-heading](jsonPayload.priorLogicalLabel,jsonPayload.finalLogicalLabel,jsonPayload.changed,jsonPayload.toActionFolded,jsonPayload.latencyMs,jsonPayload.model)"

Report a full-week summary vs Mon and Tue: merged y/n, latency trend, total agent runs, changed/toActionFolded counts, failsafe counts by reason, any warn-level throws, exemplar-pool growth, measured cost per 1,000 decisions vs the $0.11/1k note, and a plain verdict on whether the plumbing held (which is all this can prove — NOT whether the agent's decisions are actually better; that needs the Phase 7 offline bake-off). Do not change any code.