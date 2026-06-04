---
name: collect-notion-episodes
description: Collect Notion pages I edited in the last 24h into Obsidian _episodes/
---

Collect Notion pages I EDITED in the last 24 hours and write one episode file per edited page into the Obsidian vault.

=== IDENTITY (HARD FILTER — ONLY MY EDITS) ===
Notion email: joey.dwonczyk@fyxer.com
Notion display name: Joey Dwonczyk
Only emit episodes for pages where last_edited_by is me. Do NOT emit episodes for pages teammates edited even if they sit in my workspace.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

SOURCE: Notion MCP. Use notion-search to find pages last_edited_by me within the last 24h. Verify the `last_edited_by.person.email` (or equivalent) is mine before emitting an episode.

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
- If Notion MCP unavailable, write YYYY-MM-DD-notion-NORUN.md and exit cleanly.
- Cut-off: last 24 hours from fire time.

Report: count written, count skipped, count rejected for not-mine.