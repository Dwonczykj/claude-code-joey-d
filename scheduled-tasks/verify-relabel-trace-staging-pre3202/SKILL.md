---
name: verify-relabel-trace-staging-pre3202
description: Verify PRE-3202 relabel decision-agent trace is logging full traces in staging before staging→main promotion
---

Verify that the relabel decision-agent trace logging (PRE-3202, PR #11355 "feat: log full relabel decision-agent trace for offline eval") is working in the STAGING environment and pulls back FULL traces, BEFORE the code is promoted from staging to main. This is a time-sensitive verification gate — report clearly and promptly.

CONTEXT
- PR #11355 merged to staging on 2026-08-25 (evening BST). It adds a staging/dev/local-only `logger.info("relabel decision agent trace", ...)` call in functions/src/features/labels/logic/relabelDecisionAgent/logRelabelDecisionTrace.ts. It fires every time the relabel decision agent runs on an email in staging. Prod is deliberately excluded.
- GCP project for staging: `fyxer-ai-staging`. Region europe-west1.
- The log entry's jsonPayload has `code = "analytics.relabel_decision_agent_trace"` and `flow = "EMAIL_LABELLING"`.
- `gcloud logging read` uses the local gcloud USER credential (NOT ADC). The account should be joey.dwonczyk@fyxer.com. If a query returns an auth error like "reauthenticate" / "do not currently have an active account" / "Reauthentication required", run `gcloud auth login` and retry. Do NOT use `gcloud auth application-default login`.

STEP 1 — pull recent traces (last ~13h, since the merge)
Run:
  gcloud logging read 'jsonPayload.code="analytics.relabel_decision_agent_trace"' --project=fyxer-ai-staging --freshness=13h --limit=20 --format=json
Count how many entries came back.

STEP 2 — if ZERO entries, disambiguate "not deployed" vs "deployed but no relabel events overnight"
- Check the code deployed and labelling is otherwise flowing:
  gcloud logging read 'jsonPayload.flow="EMAIL_LABELLING"' --project=fyxer-ai-staging --freshness=3h --limit=5 --format='value(timestamp,jsonPayload.code)'
- If labelling activity exists but no trace entries, the relabel decision agent simply may not have run on any email in the window (low overnight volume), OR the deploy hasn't landed. Note which. The relabel decision agent only runs on emails that hit the relabel path, so zero is plausible on a quiet staging.
- Also check for the trace's own failure log (means the trace IS deployed but erroring):
  gcloud logging read 'jsonPayload.code="relabel_decision_trace_failed"' --project=fyxer-ai-staging --freshness=13h --limit=10 --format=json

STEP 3 — verify FULL trace completeness (on the entries from step 1)
For at least 2-3 example entries, confirm the jsonPayload contains ALL of these fields with real (non-null where expected) values. A "full trace" must have:
- systemPrompt (full string) and userPrompt (full string, capped at 64k chars — a truncation marker is fine)
- outcomeStatus, and either finalLogicalLabel (when outcomeStatus="chosen") or failureReason (when "failed")
- priorLogicalLabel, model, latencyMs, discardedAfterDeadline, inputTokens/outputTokens
- eligibleLogicalLabels, routingFacts, expertPrior
- emailToLabel = { emailMessageId, threadId, providerEmailId, messageId, sentAtUTC }
- relabelLookalikes[] and cleanLookalikes[] — each element has { emailMessageId, score } and, for relabelLookalikes, userLogicalLabel + fyxerLogicalLabel
- retrievedCorrectionCount, retrievedCleanNeighbourCount
Flag any field that is missing or unexpectedly null across all sampled entries (that indicates a logging bug). Note the distribution of outcomeStatus values seen.

STEP 4 — report
Write a concise plain-text report with:
1. VERDICT: is the trace logging working in staging and pulling back full traces? (WORKING / WORKING-BUT-NO-EVENTS-YET / BROKEN / CANNOT-VERIFY)
2. How many trace entries in the window, and the outcomeStatus breakdown.
3. Field-completeness result — explicitly list any missing/null fields, or state "all expected fields present".
4. Any relabel_decision_trace_failed warnings (count + a sample error).
5. One paste-ready example trace (systemPrompt + userPrompt + emailToLabel + lookalike ids), lightly trimmed if huge.
6. A clear line on whether it's safe to promote staging→main from a logging standpoint, and if not, exactly what to check.

Save the full report to /Users/joey/.claude/scheduled-tasks/verify-relabel-trace-staging-pre3202/report-$(date +%Y%m%d-%H%M).txt and also print the verdict + summary in your final message so the notification carries it.