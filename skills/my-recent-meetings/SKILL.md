---
name: my-recent-meetings
description: Fetch and display deduplicated call summaries from the last 24 hours
command: my-recent-meetings
---

Run the following SQL query using the `mcp__bigquery__execute_sql` MCP tool (load its schema via ToolSearch first if needed):

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
  where cs.created_at >= timestamp_sub(current_timestamp(), interval 24 hour)
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

If BigQuery auth fails, run `/auth-bigquery` first to re-authenticate.

For each meeting returned, output a summary with:
- The meeting timestamp (created_at) converted to a readable format
- The call_summary_id
- The calendar_event_id (if present)
- The full content of the summary