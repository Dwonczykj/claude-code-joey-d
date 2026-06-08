---
name: collect-notion-episodes
description: Collect Notion pages I edited since the previous successful run into Obsidian _episodes/
---

Collect Notion pages I EDITED since the previous successful run and write one episode file per edited page into the Obsidian vault.

WINDOW DETERMINATION (do this BEFORE any collection):
- STATE_FILE: /Users/joey/.claude/scheduled-tasks/collect-notion-episodes/last-successful-run.txt
- At start, read STATE_FILE. If it exists and contains a valid ISO 8601 timestamp, set `window_start` to that timestamp. Otherwise default `window_start` to (fire_time − 24h), but on Mondays default to (fire_time − 72h) to cover the weekend.
- Clamp: if `window_start` is older than (fire_time − 14 days), set it to (fire_time − 14 days) and note the clamp in the final report.
- Collection window = [window_start, fire_time]. Use this window throughout in place of "last 24h".
- At END, ONLY after the run has completed without error, overwrite STATE_FILE with `fire_time` formatted as ISO 8601 with offset. If the run errored partway, DO NOT update STATE_FILE so the next run picks back up from the same point.

=== IDENTITY (HARD FILTER — ONLY MY EDITS) ===
Notion email: joey.dwonczyk@fyxer.com
Notion display name: Joey Dwonczyk
Only emit episodes for pages where last_edited_by is me. Do NOT emit episodes for pages teammates edited even if they sit in my workspace.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

SOURCE: Notion MCP. Use notion-search to find pages last_edited_by me with `last_edited_time` ≥ `window_start`. Verify the `last_edited_by.person.email` (or equivalent) is mine before emitting an episode.

For each page I edited:
1. Capture: page id, title, page URL, last_edited_time, parent (workspace/team/database), and a 1-sentence summary of what changed.
2. Write file: {EPISODES_DIR}/{ISO_TS}-notion-{page-id-short}.md (ISO_TS = last_edited_time YYYY-MM-DDTHH-MM local).

Frontmatter:
---
type: episode
source: notion
source_id: <page id>
source_url: <Notion URL>
ts: <ISO 8601 with offset>
actor: joey
actor_email: joey.dwonczyk@fyxer.com
page_title: "<title>"
parent: "<parent>"
entities: []
---

Body: page title as heading; 1-2 sentence note about the edit.

Rules:
- Idempotent: skip if file exists.
- HARD RULE: drop any page whose last_edited_by is not me.
- Never write outside EPISODES_DIR.
- If Notion MCP unavailable, write YYYY-MM-DD-notion-NORUN.md and exit cleanly. Do NOT update STATE_FILE in this case.
- Cut-off: the [window_start, fire_time] range determined above. Do not use a hardcoded 24h.

Report: count written, count skipped, count rejected for not-mine, the `window_start`/`window_end` used, and whether STATE_FILE was updated.