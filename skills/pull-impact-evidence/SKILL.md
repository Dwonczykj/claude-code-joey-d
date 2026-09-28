---
name: pull-impact-evidence
description: Gather real-world evidence (BigQuery, PostHog, Slack, call transcripts, Canny) for whether a shipped feature actually moved a business metric or answered real user demand, before drafting an impact-log or no-impact-log entry for it. Use before update-impact-log/update-no-impact-log when the existing evidence is thin, contested, or only covers one metric.
user_invocable: true
arguments: "[feature / PR / ticket / prior claim to check]"
---

# pull-impact-evidence

Evidence-gathering step that feeds `update-impact-log` / `update-no-impact-log`. Those two skills draft an entry from whatever's already known; this skill goes and checks, so the entry isn't built on a single naive metric or a hunch.

Long-running and multi-source — for a feature that needs a real dig, prefer running this via `fork-session` (high effort) so it works in the background rather than blocking the conversation. For a quick check, run it inline.

**Model:** default to Opus 4.8 (`--model claude-opus-4-8`) unless Joey names a different one. If he does, use the model lookup table in the `fork-session` skill to map whatever he says to its full id — don't keep a second copy of that table here.

## Flow

1. **Establish what's already claimed.** Read whatever prior analysis exists first — don't re-derive from scratch: Claude Code memory (`grep`/`Read` over `/Users/joey/.claude/projects/-Users-joey-FyxerGh-fyxer-web-app-trees-fyxer-web-app/memory/`), any spec under `specs/`, any prior write-up under `docs-private/`. State the existing claim and its caveats before adding to it.

2. **Identify the metric(s) a change like this should move.** Don't default to one obvious metric (e.g. draft_used) — list the plausible candidates: activation/connection-completion, Day-1/Day-7 retention, time-to-first-value, churn/unsubscribe in the affected cohort, cost, NPS/CSAT if tracked, and whatever the feature's own design doc named as its target.

3. **BigQuery.** Before writing any query, read the schema/table definitions in the sibling repo `/Users/joey/FyxerGh/data-platform` (dbt models or schema docs) — don't guess table or column names. Cross-check against these memory files for known gotchas: `reference_bq_log_analytics_datasets.md`, `reference_bq_posthog_events_mirror.md`, `reference_bq_email_body_label_join.md`, `reference_bq_firestore_mirror_workflow_inference.md`. Prefer a matched/controlled comparison (same lifecycle stage, same eligibility gate) over a naive before/after or treated/untreated split — a naive cut across different user cohorts routinely manufactures an effect that isn't there (see `project_tone_synthesis_draft_usage.md` for the canonical example of this trap).

4. **PostHog.** Check for a funnel, insight, feature flag, or experiment tied to the feature. Prod project is 13839, staging is 21785 (`reference_posthog_project_env_split.md`) — don't read staging data as if it were prod.

5. **Qualitative evidence.** Search Slack for the feature/ticket by name in both engineering and customer-facing channels — look for complaints as well as praise, don't cherry-pick positive mentions. Check Fyxer's own meeting-assistant MCP tools (`search_memory`, `search_context`, `search_meetings` — this is Fyxer's own product being used to search customer call transcripts) for any customer mention of the feature. Quote verbatim and cite (channel/permalink, or transcript + timestamp) — don't paraphrase into something stronger than what was said.

6. **Canny.** Check both directions: (a) *pain that motivated the build* — search Canny ideas/comments for requests or complaints the feature addresses, with vote counts, to show real prior demand; (b) *reception after shipping* — if there's a matching idea or changelog entry, check its comments and reactions for whether users who asked for it actually liked what shipped, and whether the idea's status moved to something like "delivered"/"complete". If the Canny MCP server isn't authenticated in this session, say so in the report rather than skipping it silently.

7. **Write the report**, don't just summarize in chat: `docs-private/<feature-slug>-evidence-pull.md` (create `docs-private/` if absent; it's gitignored per repo convention, never commit it). Structure: every metric checked and what it showed (with real numbers and the query/tool used), the qualitative evidence found (Slack, transcripts, Canny), and an honest verdict — does this change, strengthen, or fail to move the prior conclusion. If nothing new turned up, say that plainly rather than inflating weak signal into a story.

8. **Hand back to the log skills — but ask first.** The verdict here is what `update-impact-log` or `update-no-impact-log` should draft from next — don't draft the log entry yourself inside this skill, that's their job. Once the report is written, ask Joey which of these to run, and give a recommendation with a one-line reason (don't just list options):
   - `update-impact-log` — the evidence clears the bar (a hard number, or a strong strategic/foundational story).
   - `update-no-impact-log` — the evidence confirms it didn't clear the bar (flat, zero-adoption, dead-ended, unmeasured with no strategic story).
   - `read-impact-log` / `read-no-impact-log` only — evidence is genuinely inconclusive and it's not yet time to log anything either way; just refresh the snapshot so the latest read is on hand next time.
   - Something else — the verdict points somewhere this skill doesn't cover (e.g. the finding is itself worth a Slack post, a Linear ticket, or a rewrite of an existing entry rather than a new one).
   Wait for his answer before writing anything to Notion.

## Notes

- If a needed source needs auth you don't have in this session (prod Firestore via fyxer-vault, staging/QA Firebase MCP, Canny), say so in the report rather than silently skipping it.
- Precision over enthusiasm — this report is what decides whether something goes in the reviewer-facing Impact Log or the private No-Impact Log.
