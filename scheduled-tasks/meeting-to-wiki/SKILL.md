---
name: meeting-to-wiki
description: Fetch recent meeting notes via the Granola connector and save them as notes in the Obsidian wiki
model: sonnet
---

You are an agent that fetches Joey's recent Granola meeting notes and saves each one as a wiki note AND as an episode for downstream synthesis.

Granola is the ONLY meeting source for this routine. Do not call the Fyxer recordings MCP or any other meeting source.

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

### 2. Fetch recent meetings via the Granola connector

Use the Granola MCP tools (load schemas via ToolSearch first if not loaded):

- `mcp__c8bbb97e-3ea6-48db-b893-f52d8904fa17__list_meetings`
- `mcp__c8bbb97e-3ea6-48db-b893-f52d8904fa17__get_meetings`
- `mcp__c8bbb97e-3ea6-48db-b893-f52d8904fa17__get_meeting_transcript`

Procedure:
1. Call `list_meetings` with `time_range: "custom"`, `custom_start: WINDOW_START`, `custom_end: WINDOW_END`, and `involvement: {captured_by_me: true, listed_as_participant: true}` to list every meeting Joey was involved in during the lookback window.
2. Call `get_meetings` with the returned ids, batched in groups of 10 (the tool caps at 10 ids per call), to retrieve the AI summary, private notes, attendees, and metadata. The summary is what the wiki note should use; append Joey's private notes beneath it under `## My notes` when present.
3. **Truncation handling.** If a summary ends mid-sentence or the response signals truncation, call `get_meeting_transcript` for that meeting id and append a `## Transcript (raw)` section beneath the summary. Set `summary_truncated: true` and `transcript_appended: true` in the wiki note frontmatter so the provenance is visible.
   - If the transcript comes back empty, the meeting was not recorded — keep whatever summary text you have and set `transcript_unavailable: true` rather than retrying.
4. Map the Granola response to a uniform shape for the steps below:
   - `call_summary_id` ← the Granola meeting id, prefixed: `granola:<meetingId>`
   - `calendar_event_id` ← the calendar event id from metadata when Granola exposes one; null if absent
   - `call_recording_id` ← the Granola meeting id (unprefixed)
   - `created_at` ← the meeting's start timestamp
   - `content` ← the summary text (plus private notes and appended transcript when present)
   - `attendees` ← attendee emails from the metadata when present
   - `title_hint` ← the Granola meeting title (use it for the wiki note title if it is meaningful)

If Granola returns no meetings in the window, report that and stop.

### 3. Deduplicate against existing vault notes

For each candidate meeting, grep the vault for the `call_summary_id` in frontmatter. If a wiki note OR an episode file with that ID already exists, skip it.

```bash
grep -rl "call_summary_id:" "/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes" 2>/dev/null | xargs grep -l "{call_summary_id}" 2>/dev/null
```

Granola ids differ from the ids used by the previous Fyxer-MCP version of this routine, so an id miss does not prove the meeting is new. Before writing, also check for an existing note covering the same meeting by `calendar_event_id` (when present) and, failing that, by same date + near-identical title. Skip those too.

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
source_system: granola
call_summary_id: "{call_summary_id}"
calendar_event_id: "{calendar_event_id or null}"
call_recording_id: "{call_recording_id or null}"
summary_truncated: {true|false}     # omit if false
transcript_appended: {true|false}   # omit if false
transcript_unavailable: {true|false} # omit if false; set when the transcript comes back empty
related: ["[[relevant existing notes]]"]
---

# {Title}

> Meeting summary from {YYYY-MM-DD HH:MM} UTC | ID: `{call_summary_id}` | source: granola

{content from the call summary, preserved as-is}

## Transcript (raw)   <!-- only if transcript was appended due to truncation -->
{transcript text}
```

Add `[[wikilinks]]` to any people, projects, or concepts mentioned that match existing vault notes. Add relevant tags beyond `meeting` and `fyxer-ai` based on content (e.g. `firestore`, `evaluation`, `growthbook`).

### 6. For each new meeting, ALSO write an episode for synthesis

The downstream synthesizers (`synthesize-work-done`, `synthesize-pod-work`) consume files from `EPISODES_DIR`. Write one episode per meeting so meetings show up in the daily Work-Done and Pod-Work observations.

File path: `{EPISODES_DIR}/{ISO_TS}-meeting-{call_summary_id_short}.md`
- `ISO_TS` = meeting `created_at` in `YYYY-MM-DDTHH-MM` local time
- `call_summary_id_short` = first 12 chars of `call_summary_id` (after stripping the `granola:` prefix), kebab-safe

Frontmatter (YAML):
```yaml
---
type: episode
source: meeting
source_system: granola
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
- Created meeting note from call summary (source: granola)
- Created episode: {episode filename}
- call_summary_id: {id}
```

### 8. Report

Output a summary:
- whether 72-hour or 24-hour lookback was used
- number of meetings captured
- titles and dates
- any skipped (already exist)
- count of episode files written
- how many summaries were truncated and how many had transcripts appended