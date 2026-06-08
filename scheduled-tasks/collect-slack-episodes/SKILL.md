---
name: collect-slack-episodes
description: Collect Slack messages I sent since the previous successful run into Obsidian _episodes/
---

Collect Slack activity authored BY ME since the previous successful run and write one episode file per message into the Obsidian vault.

WINDOW DETERMINATION (do this BEFORE any collection):
- STATE_FILE: /Users/joey/.claude/scheduled-tasks/collect-slack-episodes/last-successful-run.txt
- At start, read STATE_FILE. If it exists and contains a valid ISO 8601 timestamp, set `window_start` to that timestamp. Otherwise default `window_start` to (fire_time − 24h), but on Mondays default to (fire_time − 72h) to cover the weekend.
- Clamp: if `window_start` is older than (fire_time − 14 days), set it to (fire_time − 14 days) and note the clamp in the final report.
- Collection window = [window_start, fire_time]. Use this window throughout in place of "last 24h".
- At END, ONLY after the run has completed without error, overwrite STATE_FILE with `fire_time` formatted as ISO 8601 with offset. If the run errored partway, DO NOT update STATE_FILE so the next run picks back up from the same point.

=== IDENTITY (HARD FILTER — ONLY MY MESSAGES) ===
Slack user email: joey.dwonczyk@fyxer.com
Slack display: Joey Dwonczyk
Only emit episodes for messages where the AUTHOR is me. Do NOT emit episodes for threads I merely participated in passively (i.e. only emit one episode per individual message I posted).

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

SOURCE: Slack MCP (slack-by-salesforce). Use search/standup tools to find messages I authored within the collection window. If the server isn't connected, use ToolSearch to load its tools first.

For each message I personally sent in the window:
1. Verify author == me before writing anything.
2. Capture: channel name, thread root ts (if reply), my message ts, permalink, message text (truncate to 800 chars), and any user/channel mentions.
3. Write file: {EPISODES_DIR}/{ISO_TS}-slack-{channel-slug}-{ts-short}.md where ISO_TS is the message ts in YYYY-MM-DDTHH-MM (local).

Frontmatter:
---
type: episode
source: slack
source_id: <message ts / thread ts>
source_url: <Slack permalink>
ts: <ISO 8601 with offset>
actor: joey
actor_email: joey.dwonczyk@fyxer.com
channel: <channel name>
thread_ts: <root ts or null>
mentions: [<users>]
entities: []
---

Body: the message text (verbatim, in a markdown blockquote).

Rules:
- Idempotent: skip if target file exists.
- HARD RULE: drop any message whose author is not me, even if it appeared in search results.
- One episode per message I authored (multiple replies in the same thread → multiple episode files).
- Never write outside EPISODES_DIR.
- If Slack MCP is unavailable, write YYYY-MM-DD-slack-NORUN.md noting the failure and exit cleanly. Do NOT update STATE_FILE in this case.
- Cut-off: the [window_start, fire_time] range determined above. Do not use a hardcoded 24h.

Report: count written, count skipped, count rejected for not-mine, the `window_start`/`window_end` used, and whether STATE_FILE was updated.