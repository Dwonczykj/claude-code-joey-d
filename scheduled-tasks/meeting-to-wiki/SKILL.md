---
name: meeting-to-wiki
description: Fetch recent meeting summaries from BigQuery and save them as notes in the Obsidian wiki
---

You are an agent that fetches Joey's recent meeting summaries and saves each one as a wiki note AND as an episode for downstream synthesis.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes
WIKI_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes
WIKI_INDEX_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_wiki

## Steps

### 1. Determine lookback window

Check what day of the week it is. If it's Monday, use a 72-hour lookback to capture Friday's meetings over the weekend. Otherwise use 24 hours.

Compute:
- `WINDOW_HOURS` = 72 on Monday, 24 otherwise
- `WINDOW_START` = ISO 8601 timestamp for now − WINDOW_HOURS
- `WINDOW_END` = ISO 8601 timestamp for now

### 2. Fetch recent meetings — primary path (BigQuery)

Run the following SQL query using the `mcp__bigquery__execute_sql` MCP tool (load its schema via ToolSearch first if needed). Replace `{LOOKBACK_HOURS}` with the WINDOW_HOURS value:

```sql
with user_emails as (
  select distinct c.user_id, lower(c.email) as email
  from `fyxer-ai-analytics.prod_dbt_intermediate.int_firestore__connection` as c
  where c.user_id = 'hjbuwaUrtfgVnrJkP6dbAledp3Q2'
    and c.email is not null
),
user_recordings as (
  select distinct ue.user_id, cr.call_recording_id
  from `fyxer-ai-analytics.prod_dbt_intermediate.int_firestore__call_recording` as cr
  join user_emails as ue on lower(cr.email_with_access) = ue.email
),
summaries as (
  select
    cs.call_summary_id,
    cs.calendar_event_id,
    cs.created_at,
    cs.content,
    cs.call_recording_id,
    regexp_extract(cs.call_recording_id, r'^[^:]+:([^:]+)') as base_event_id
  from `fyxer-ai-analytics.prod_dbt_sensitive_intermediate.int_firestore__call_summary` as cs
  join user_recordings as ur on ur.call_recording_id = cs.call_recording_id
  where cs.created_at >= timestamp_sub(current_timestamp(), interval {LOOKBACK_HOURS} hour)
),
ranked as (
  select *,
    row_number() over (
      partition by base_event_id
      order by length(content) desc
    ) as rn
  from summaries
)
select call_summary_id, calendar_event_id, call_recording_id, created_at, content
from ranked
where rn = 1
order by created_at
```

If BigQuery auth fails, run `gcloud auth application-default login` via Bash and retry once.

### 3. Fallback path — Fyxer MCP recordings tool

If the BigQuery query fails for any reason (auth still broken after the retry, dataset unavailable, returns an error, times out, or returns clearly bad data), fall back to the Fyxer recordings MCP tool. The relevant tools (load schemas via ToolSearch first if not loaded):

- `mcp__dcf1f14f-9159-4112-9ec2-385a5bb1797f__find_recordings`
- `mcp__dcf1f14f-9159-4112-9ec2-385a5bb1797f__get_recording`
- `mcp__dcf1f14f-9159-4112-9ec2-385a5bb1797f__get_transcript`

Procedure:
1. Call `find_recordings` with `query: ""`, `from: WINDOW_START`, `to: WINDOW_END`, `maxResults: 50` to list every recording in the same lookback window. Use participants/attendee filters only if find_recordings refuses an empty query — in that case retry with `participants: ["joey.dwonczyk@fyxer.com"]`.
2. For each returned recording, call `get_recording` with the meeting id to retrieve metadata + summary + parsed sections + action items. The `summary` field is the equivalent of `cs.content` from BigQuery and is what the wiki note should use.
3. **Truncation handling.** The `get_recording` response includes only a transcript *preview* and may also truncate very long summary text. Treat the summary returned by `get_recording` as the canonical body for the note, but if it ends mid-sentence or the response signals truncation, supplement it as follows:
   - Call `get_transcript` paginated (start `offset: 0`, then call again with `offset = pagination.offset + pagination.returnedSegments` while `pagination.hasMore` is true) and append a `## Transcript (raw, paginated)` section beneath the summary with the concatenated segments.
   - In the wiki note frontmatter set `summary_truncated: true` and `transcript_appended: true` so the truncation provenance is visible.
   - If `get_transcript` returns `totalSegments: 0` the meeting was not recorded — keep whatever summary text you have and add a frontmatter field `transcript_unavailable: true` rather than retrying.
4. Map the MCP response to the same shape used downstream so step 4+ stays uniform:
   - `call_summary_id` ← the recording id (prefix with `mcp:` so we can tell it didn't come from BQ, e.g. `mcp:<meetingId>`)
   - `calendar_event_id` ← whatever the recording metadata exposes (often `calendarEventId`); null if absent
   - `call_recording_id` ← the recording id
   - `created_at` ← the recording's start timestamp
   - `content` ← the summary text (plus appended transcript when supplemented)
   - `attendees` ← list of attendee emails from the metadata when present
   - `title_hint` ← the recording title from metadata when present (use it for the wiki note title if it is meaningful)

If both BigQuery and the MCP fallback return nothing, report that and stop. If only the MCP path returns results, note in the final report that the fallback was used.

### 4. Deduplicate against existing vault notes

For each candidate meeting (from either source), grep the vault for the `call_summary_id` in frontmatter. If a wiki note OR an episode file with that ID already exists, skip it.

```bash
grep -rl "call_summary_id:" "/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes" 2>/dev/null | xargs grep -l "{call_summary_id}" 2>/dev/null
```

### 5. For each new meeting, create an Obsidian wiki note

Determine a descriptive title from the meeting content (or `title_hint` from MCP if it is meaningful) — use the main topic (e.g. "Evaluation Framework Sync", "Firestore Scalability Review"). Title case, plain English.

Create the wiki note at:
```
{WIKI_DIR}/{Title}.md
```

Format:
```markdown
---
tags: [meeting, fyxer-ai]
date: YYYY-MM-DD
type: meeting
source: call-summary
source_system: bigquery | fyxer-mcp
call_summary_id: "{call_summary_id}"
calendar_event_id: "{calendar_event_id or null}"
call_recording_id: "{call_recording_id or null}"
summary_truncated: {true|false}     # only if MCP fallback was used
transcript_appended: {true|false}   # only if MCP fallback was used
transcript_unavailable: {true|false} # only if MCP fallback was used and totalSegments == 0
related: ["[[relevant existing notes]]"]
---

# {Title}

> Meeting summary from {YYYY-MM-DD HH:MM} UTC | ID: `{call_summary_id}` | source: {bigquery|fyxer-mcp}

{content from the call summary, preserved as-is}

## Transcript (raw, paginated)   <!-- only if appended via MCP fallback -->
{concatenated transcript segments}
```

Add `[[wikilinks]]` to any people, projects, or concepts mentioned that match existing vault notes. Add relevant tags beyond `meeting` and `fyxer-ai` based on content (e.g. `firestore`, `evaluation`, `growthbook`).

### 6. For each new meeting, ALSO write an episode for synthesis

The downstream synthesizers (`synthesize-work-done`, `synthesize-pod-work`) consume files from `EPISODES_DIR`. Write one episode per meeting so meetings show up in the daily Work-Done and Pod-Work observations.

File path: `{EPISODES_DIR}/{ISO_TS}-meeting-{call_summary_id_short}.md`
- `ISO_TS` = meeting `created_at` in `YYYY-MM-DDTHH-MM` local time
- `call_summary_id_short` = first 12 chars of `call_summary_id` (after stripping any `mcp:` prefix), kebab-safe

Frontmatter (YAML):
```yaml
---
type: episode
source: meeting
source_system: bigquery | fyxer-mcp
source_id: <call_summary_id>
source_path: <absolute path to the wiki note created in step 5>
ts: <ISO 8601 with offset — meeting created_at>
ts_start: <ISO 8601 with offset — meeting created_at>
ts_end: <ISO 8601 with offset — meeting created_at + estimated duration, or same as ts_start if unknown>
duration_minutes: <int, 0 if unknown>
actor: joey
actor_email: joey.dwonczyk@fyxer.com
actor_handle: Dwonczykj
project: fyxer-ai
call_summary_id: <call_summary_id>
calendar_event_id: <calendar_event_id or null>
call_recording_id: <call_recording_id or null>
attendees: [<list of attendee emails when known, else []>]
pod_attendees: [<subset of attendees that match the pod allowlist, else []>]
title: "{Title}"
summary_truncated: {true|false}     # mirror of wiki-note flag
transcript_appended: {true|false}   # mirror of wiki-note flag
entities: []
---
```

Pod allowlist for `pod_attendees`:
- joey.dwonczyk@fyxer.com
- assem.dikhayeva@fyxer.com
- richard.kirsch@fyxer.com
- will.drewett@fyxer.com

Body of the episode file:
```
{1-2 sentence neutral summary distilled from the call summary — what was discussed, what was decided, any owners named}

- Wiki note: [[{Title}]]
- Recording: {call_recording_id or "—"}
- Attendees: {comma-separated attendee emails or "unknown"}
- Decisions / actions: {bullet list of any explicit decisions or action items extracted from the summary, or "none recorded"}
```

Rules for episode files:
- Idempotent — if the target file already exists, skip writing it (treat as already-ingested).
- Never edit anything outside EPISODES_DIR from this step.
- Do NOT paste the full transcript into the episode body. The episode is a pointer + distillation; full content lives in the wiki note. This keeps the synthesizer's context small.

### 7. Update wiki index and log

Append each new meeting to `{WIKI_INDEX_DIR}/index.md` under a **Meetings** category:
```
- [[{Title}]] — {one-line summary}, {date}
```

Append to `{WIKI_INDEX_DIR}/log.md`:
```
## [YYYY-MM-DD] ingest | Meeting: {Title}
- Created meeting note from call summary (source: {bigquery|fyxer-mcp})
- Created episode: {episode filename}
- call_summary_id: {id}
```

### 8. Report

Output a summary:
- which source was used (bigquery, fyxer-mcp, or both)
- whether 72-hour or 24-hour lookback was used
- number of meetings captured
- titles and dates
- any skipped (already exist)
- count of episode files written
- if the MCP fallback was used, note how many summaries were truncated and how many had transcripts appended
