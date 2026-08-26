---
name: collect-pod-channel-episodes
description: Collect all new messages in Slack #pod-context and #pod-context-pirates since the previous successful run into Obsidian _episodes/
model: sonnet
effort: medium
---

Collect ALL new messages posted in the two Pod Context Slack channels since the previous successful run and write one episode file per message into the Obsidian vault. Unlike collect-slack-episodes (which captures only messages I authored), this collector captures EVERY message in these channels regardless of author — pod-channel context is shared context.

WINDOW DETERMINATION (do this BEFORE any collection):
- STATE_FILE: /Users/joey/.claude/scheduled-tasks/collect-and-synthesize-desk/state/collect-pod-channel-episodes.txt
- At start, read STATE_FILE. If it exists and contains a valid ISO 8601 timestamp, set `window_start` to that timestamp. Otherwise default `window_start` to (fire_time − 24h), but on Mondays default to (fire_time − 72h) to cover the weekend.
- Clamp: if `window_start` is older than (fire_time − 14 days), set it to (fire_time − 14 days) and note the clamp in the final report.
- Collection window = [window_start, fire_time]. Use this window throughout in place of "last 24 hours".
- At END, ONLY after the run has completed without error, overwrite STATE_FILE with `fire_time` formatted as ISO 8601 with offset. If the run errored partway, DO NOT update STATE_FILE so the next run picks back up from the same point.

CHANNELS:
- #pod-context
- #pod-context-pirates

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

=== POD AUTHORS (for tagging) ===
- joey.dwonczyk@fyxer.com  → display: "Joey"
- assem.dikhayeva@fyxer.com → display: "Assem"
- richard.kirsch@fyxer.com  → display: "Richard"
- will.drewett@fyxer.com    → display: "Will"
Any other author is captured as-is.

=== SOURCE ===
Use the Slack MCP. Prefer `slack_read_channel` for each of the two channels, with a time window of [window_start, fire_time]. If pagination is required to cover the window, paginate until you reach the cutoff (do not stop at the default page count if there are still messages within the window). If `slack_read_channel` is unavailable, fall back to `slack_search_public_and_private` with a `in:#pod-context` / `in:#pod-context-pirates` filter and an `after:` date derived from `window_start` (then post-filter by exact ts in code).

For each message in either channel within the window:
1. Capture: channel name, message ts, thread root ts (if reply), permalink, author user_id, author email (resolve via `slack_read_user_profile` if needed and cache for the run), author display, message text (truncate body to 1500 chars), reactions (emoji + count), attachment count, any mentions.
2. Write file: {EPISODES_DIR}/{ISO_TS}-pod-{channel-slug}-{ts-short}.md where ISO_TS is the message ts in YYYY-MM-DDTHH-MM (local).

Channel slug mapping:
- #pod-context → "pod-context"
- #pod-context-pirates → "pod-context-pirates"

Frontmatter:
---
type: episode
source: slack-channel
source_id: <message ts>
source_url: <Slack permalink>
ts: <ISO 8601 with offset>
channel: <pod-context|pod-context-pirates>
thread_ts: <root ts or null>
author: <display name>
author_email: <resolved email or null>
author_user_id: <Slack user id>
is_pod_member: <true|false>
mentions: [<users mentioned>]
reactions: [{emoji, count}, ...]
entities: []
---

Body: the message text in a markdown blockquote.

=== RULES ===
- Capture EVERY message in the window regardless of author — including non-pod-member messages (e.g. cross-team threads, bot posts that contain product context). This is shared pod context, not personal mail.
- Idempotent: if a target file already exists, skip it. (Use the Slack message ts as the stable id — Slack ts never changes after edit, so duplicates are exact.)
- For thread replies, write one episode per reply (do not roll the thread into a single file). Frontmatter `thread_ts` allows downstream synthesizers to re-cluster them.
- Resolve author emails via `slack_read_user_profile` lazily and cache the user_id→email mapping in-memory for the run to minimise API calls.
- Never write outside EPISODES_DIR.
- If the Slack MCP is unavailable, write a single file YYYY-MM-DD-pod-channels-NORUN.md noting the failure and exit cleanly. Do NOT update STATE_FILE in this case.
- Cut-off: the [window_start, fire_time] range determined above. Do not use a hardcoded 24h.

=== REPORT AT END ===
- Count of episodes written per channel.
- Count skipped (already existed).
- Count of unique authors seen this run (and how many were pod members vs. external).
- Any user_id → email resolutions that failed.
- The `window_start`/`window_end` used.
- Whether STATE_FILE was updated.
