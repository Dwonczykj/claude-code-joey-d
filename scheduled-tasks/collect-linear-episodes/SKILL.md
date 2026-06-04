---
name: collect-linear-episodes
description: Collect Linear issue activity by me in the last 24h into Obsidian _episodes/
---

Collect MY Linear activity from the last 24 hours and write one episode file per event into the Obsidian vault.

=== IDENTITY (HARD FILTER — ONLY MY WORK) ===
Linear email: joey.dwonczyk@fyxer.com
Linear display name: Joey Dwonczyk
Reject any event not performed by me OR not assigned to me.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

SOURCE: Linear MCP. Emit an episode for an issue ONLY when one of these is true within the last 24h:
  1. I CREATED the issue (creator.email == joey.dwonczyk@fyxer.com)
  2. I am the ASSIGNEE and the issue was updated in the window (assignee.email == joey.dwonczyk@fyxer.com)
  3. I CHANGED THE STATUS (state transition performed by me)
  4. I COMMENTED on the issue (comment author == me)

Use list_issues with updatedAt within 24h, then for each issue check creator/assignee/comment-author against my identity. Use list_comments to find comments I authored. Drop everything else.

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
- If Linear MCP unavailable, write YYYY-MM-DD-linear-NORUN.md and exit cleanly.
- Cut-off: last 24 hours.

Report: count written, count skipped, count rejected for not-mine.