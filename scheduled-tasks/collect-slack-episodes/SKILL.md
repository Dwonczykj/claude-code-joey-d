---
name: collect-slack-episodes
description: Collect Slack messages I sent in the last 24h into Obsidian _episodes/
---

Collect Slack activity authored BY ME from the last 24 hours and write one episode file per message into the Obsidian vault.

=== IDENTITY (HARD FILTER — ONLY MY MESSAGES) ===
Slack user email: joey.dwonczyk@fyxer.com
Slack display: Joey Dwonczyk
Only emit episodes for messages where the AUTHOR is me. Do NOT emit episodes for threads I merely participated in passively (i.e. only emit one episode per individual message I posted).

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

SOURCE: Slack MCP (slack-by-salesforce). Use search/standup tools to find messages I authored in the last 24h. If the server isn't connected, use ToolSearch to load its tools first.

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
- If Slack MCP is unavailable, write YYYY-MM-DD-slack-NORUN.md noting the failure and exit cleanly.
- Cut-off: last 24 hours from fire time.

Report: count written, count skipped, count rejected for not-mine.