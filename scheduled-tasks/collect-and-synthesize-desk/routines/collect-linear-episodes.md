---
name: collect-linear-episodes
description: Collect Linear issue activity by me since the previous successful run into Obsidian _episodes/
model: sonnet
effort: medium
---

Collect MY Linear activity since the previous successful run and write one episode file per event into the Obsidian vault.

WINDOW DETERMINATION (do this BEFORE any collection):
- STATE_FILE: /Users/joey/.claude/scheduled-tasks/collect-and-synthesize-desk/state/collect-linear-episodes.txt
- At start, read STATE_FILE. If it exists and contains a valid ISO 8601 timestamp, set `window_start` to that timestamp. Otherwise default `window_start` to (fire_time − 24h), but on Mondays default to (fire_time − 72h) to cover the weekend.
- Clamp: if `window_start` is older than (fire_time − 14 days), set it to (fire_time − 14 days) and note the clamp in the final report.
- Collection window = [window_start, fire_time]. Use this window throughout in place of "last 24h" / "updatedAt within 24h".
- At END, ONLY after the run has completed without error, overwrite STATE_FILE with `fire_time` formatted as ISO 8601 with offset. If the run errored partway, DO NOT update STATE_FILE so the next run picks back up from the same point.

=== IDENTITY (HARD FILTER — ONLY MY WORK) ===
Linear email: joey.dwonczyk@fyxer.com
Linear display name: Joey Dwonczyk
Reject any event not performed by me OR not assigned to me.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

SOURCE: Linear MCP. Emit an episode for an issue ONLY when one of these is true within the collection window:
  1. I CREATED the issue (creator.email == joey.dwonczyk@fyxer.com)
  2. I am the ASSIGNEE and the issue was updated in the window (assignee.email == joey.dwonczyk@fyxer.com)
  3. I CHANGED THE STATUS (state transition performed by me)
  4. I COMMENTED on the issue (comment author == me)

Use list_issues with `updatedAt` ≥ `window_start`, then for each issue check creator/assignee/comment-author against my identity. Use list_comments to find comments I authored within the window. Drop everything else.

For each qualifying event:
1. Capture: issue identifier (e.g. ENG-123), title, event type (created | assigned-to-me | status-changed | commented), new status (if applicable), comment text snippet (if applicable), URL, ts.
2. Write file: {EPISODES_DIR}/{ISO_TS}-linear-{ISSUE-ID}-{event-type}.md

Frontmatter:
---
type: episode
source: linear
source_id: <issue id + event suffix>
source_url: <Linear URL>
ts: <ISO 8601 with offset>
actor: joey
actor_email: joey.dwonczyk@fyxer.com
event: <created|assigned-to-me|status-changed|commented>
issue: <ENG-123>
issue_title: "<title>"
assignee_is_me: <true|false>
created_by_me: <true|false>
new_status: <status or null>
entities: [[<ENG-123>]]
---

Body: short description of the event; for comments, the comment text in a blockquote.

Rules:
- Idempotent: skip if file exists.
- HARD RULE: every emitted episode must have at least one of created_by_me=true OR assignee_is_me=true OR the actor of the recorded event == me. If neither, drop.
- Never write outside EPISODES_DIR.
- If Linear MCP unavailable, write YYYY-MM-DD-linear-NORUN.md and exit cleanly. Do NOT update STATE_FILE in this case.
- Cut-off: the [window_start, fire_time] range determined above. Do not use a hardcoded 24h.

Report: count written, count skipped, count rejected for not-mine, the `window_start`/`window_end` used, and whether STATE_FILE was updated.

=== FINAL STEP: SLACK DM TO SELF ===
After the run completes (success OR handled-error path that still wrote files), send ONE Slack DM to myself summarising the run. Use `mcp__821107f7-…__slack_send_message` to my own DM channel:
- Recipient: my own Slack user — resolve via `slack_search_users` with email `joey.dwonczyk@fyxer.com` and use the returned user id as the channel (Slack DMs the user when channel is their user id).
- If the user lookup fails, fall back to `slack_send_message_draft` to the same target and report the failure in the final report — do NOT crash the routine.

Message format (Slack mrkdwn, ≤ 8 lines):
  *collect-linear-episodes — {YYYY-MM-DD HH:MM local}*
  TL;DR: {one sentence: e.g. "Wrote N Linear episodes (created={a}, assigned={b}, status-changed={c}, commented={d}); skipped {S} existing; rejected {R} not-mine."}
  Window: {window_start} → {window_end}{ ` (clamped to 14d`)` if clamped}
  STATE_FILE: {updated|not updated (run errored)}
  {if Linear MCP was unavailable: "Linear MCP unavailable — NORUN stub written."}

Rules:
- Send EXACTLY ONE message per run.
- Never include PR numbers, file paths, or other identifiers that weren't surfaced in the actual run output.
- Do NOT post to any other channel.
- This Slack send is best-effort: if it fails, log the failure in the final report and exit cleanly — do NOT retry, and do NOT block STATE_FILE update on it.
