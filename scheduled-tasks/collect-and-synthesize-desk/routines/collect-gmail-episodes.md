---
name: collect-gmail-episodes
description: Collect Gmail messages I sent since the previous successful run into Obsidian _episodes/
model: sonnet
effort: medium
---

Collect Gmail messages I SENT since the previous successful run and write one episode file per message into the Obsidian vault.

WINDOW DETERMINATION (do this BEFORE any collection):
- STATE_FILE: /Users/joey/.claude/scheduled-tasks/collect-and-synthesize-desk/state/collect-gmail-episodes.txt
- At start, read STATE_FILE. If it exists and contains a valid ISO 8601 timestamp, set `window_start` to that timestamp. Otherwise default `window_start` to (fire_time − 24h), but on Mondays default to (fire_time − 72h) to cover the weekend.
- Clamp: if `window_start` is older than (fire_time − 14 days), set it to (fire_time − 14 days) and note the clamp in the final report.
- Collection window = [window_start, fire_time]. Use this window throughout in place of "last 24h" / `newer_than:1d`. Convert `window_start` into Gmail's `after:` query operator using a Unix epoch second (e.g. `after:1717590000`).
- At END, ONLY after the run has completed without error, overwrite STATE_FILE with `fire_time` formatted as ISO 8601 with offset. If the run errored partway, DO NOT update STATE_FILE so the next run picks back up from the same point.

=== IDENTITY (HARD FILTER — ONLY MY OUTBOUND MAIL) ===
Email address: joey.dwonczyk@fyxer.com
Only emit episodes for messages where I am the sender. Do NOT emit episodes for received mail, even if I am in the To/Cc.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

SOURCE: Gmail MCP. Use its search_threads with query `from:joey.dwonczyk@fyxer.com after:<window_start_epoch>` (where `<window_start_epoch>` is the Unix epoch seconds of `window_start`), then get_thread for each.

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
- If Gmail MCP unavailable, write YYYY-MM-DD-gmail-NORUN.md and exit cleanly. Do NOT update STATE_FILE in this case.
- Cut-off: the [window_start, fire_time] range determined above. Do not use a hardcoded 24h.

Report: count written, count skipped, count rejected for not-mine, the `window_start`/`window_end` used, and whether STATE_FILE was updated.
