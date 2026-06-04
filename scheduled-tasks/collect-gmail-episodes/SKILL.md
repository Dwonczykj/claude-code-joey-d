---
name: collect-gmail-episodes
description: Collect Gmail messages I sent in the last 24h into Obsidian _episodes/
---

Collect Gmail messages I SENT in the last 24 hours and write one episode file per message into the Obsidian vault.

=== IDENTITY (HARD FILTER — ONLY MY OUTBOUND MAIL) ===
Email address: joey.dwonczyk@fyxer.com
Only emit episodes for messages where I am the sender. Do NOT emit episodes for received mail, even if I am in the To/Cc.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

SOURCE: Gmail MCP. Use its search_threads with query `from:joey.dwonczyk@fyxer.com newer_than:1d`, then get_thread for each.

For each message I authored in the window:
1. Verify the message `From:` header is joey.dwonczyk@fyxer.com before writing anything.
2. Capture: thread id, message id, subject, recipients (To/Cc), sent ts, snippet (first 400 chars of body).
3. Write file: {EPISODES_DIR}/{ISO_TS}-gmail-{thread-id-short}.md (ISO_TS = send time, YYYY-MM-DDTHH-MM local).

Frontmatter:
---
type: episode
source: gmail
source_id: <message id>
thread_id: <thread id>
ts: <ISO 8601 with offset>
actor: joey
actor_email: joey.dwonczyk@fyxer.com
subject: "<subject>"
to: [<recipients>]
cc: [<cc>]
entities: []
---

Body: subject as heading, then snippet in a blockquote.

Rules:
- Idempotent: skip if file exists.
- HARD RULE: drop any message whose From is not joey.dwonczyk@fyxer.com.
- Never write outside EPISODES_DIR.
- If Gmail MCP unavailable, write YYYY-MM-DD-gmail-NORUN.md and exit cleanly.
- Cut-off: last 24 hours from fire time.

Report: count written, count skipped, count rejected for not-mine.