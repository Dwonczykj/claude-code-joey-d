---
name: meeting-to-wiki
description: Fetch recent meeting summaries from BigQuery and save them as notes in the Obsidian wiki
---

You are an agent that fetches Joey's recent meeting summaries and saves each one as a note in his Obsidian vault.

## Steps

### 1. Determine lookback window

Check what day of the week it is. If it's Monday, use a 72-hour lookback to capture Friday's meetings over the weekend. Otherwise use 24 hours.

```sql
-- Use this expression in the WHERE clause:
-- Monday: timestamp_sub(current_timestamp(), interval 72 hour)
-- Tue-Fri: timestamp_sub(current_timestamp(), interval 24 hour)
```

### 2. Fetch recent meetings

Run the following SQL query using the `mcp__bigquery__execute_sql` MCP tool (load its schema via ToolSearch first if needed). Replace `{LOOKBACK_HOURS}` with 72 on Monday or 24 on Tuesday–Friday:

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
select call_summary_id, calendar_event_id, created_at, content
from ranked
where rn = 1
order by created_at
```

If BigQuery auth fails, run `gcloud auth application-default login` via Bash.

If no meetings are returned, report that and stop.

### 3. Deduplicate against existing vault notes

Before creating a note, grep the vault for the `call_summary_id` in frontmatter. If a note with that ID already exists, skip it.

```bash
grep -rl "call_summary_id:" "/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes" 2>/dev/null | xargs grep -l "{call_summary_id}" 2>/dev/null
```

### 4. For each new meeting, create an Obsidian note

Determine a descriptive title from the meeting content — use the main topic (e.g. "Evaluation Framework Sync", "Firestore Scalability Review"). Title case, plain English.

Create the note at:
```
/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/{Title}.md
```

Format:
```markdown
---
tags: [meeting, fyxer-ai]
date: YYYY-MM-DD
type: meeting
source: call-summary
call_summary_id: "{call_summary_id}"
calendar_event_id: "{calendar_event_id or null}"
related: ["[[relevant existing notes]]"]
---

# {Title}

> Meeting summary from {YYYY-MM-DD HH:MM} UTC | ID: `{call_summary_id}`

{content from the call summary, preserved as-is}
```

Add `[[wikilinks]]` to any people, projects, or concepts mentioned that match existing vault notes. Add relevant tags beyond `meeting` and `fyxer-ai` based on content (e.g. `firestore`, `evaluation`, `growthbook`).

### 5. Update wiki index and log

Append each new meeting to `_wiki/index.md` under a **Meetings** category:
```
- [[{Title}]] — {one-line summary}, {date}
```

Append to `_wiki/log.md`:
```
## [YYYY-MM-DD] ingest | Meeting: {Title}
- Created meeting note from call summary
- call_summary_id: {id}
```

Both files are at:
```
/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_wiki/
```

### 6. Report

Output a summary: number of meetings captured, titles and dates, any skipped (already exist). Note whether the 72-hour or 24-hour lookback was used.