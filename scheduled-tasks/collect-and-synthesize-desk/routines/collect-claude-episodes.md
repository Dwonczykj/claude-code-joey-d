---
name: collect-claude-episodes
description: Collect Claude Code session episodes since the previous successful run into Obsidian _episodes/
model: sonnet
effort: medium
---

Collect Claude Code session activity since the previous successful run and write one episode file per session into the Obsidian vault.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

WINDOW DETERMINATION (do this BEFORE any collection):
- STATE_FILE: /Users/joey/.claude/scheduled-tasks/collect-and-synthesize-desk/state/collect-claude-episodes.txt
- At start, read STATE_FILE. If it exists and contains a valid ISO 8601 timestamp, set `window_start` to that timestamp. Otherwise default `window_start` to (fire_time − 24h), but on Mondays default to (fire_time − 72h) to cover the weekend gap.
- Clamp: if `window_start` is older than (fire_time − 14 days), set it to (fire_time − 14 days) and note the clamp in the final report.
- Collection window = [window_start, fire_time]. Use this window throughout the routine in place of "last 24h".
- At END, ONLY after the run has completed without error, overwrite STATE_FILE with `fire_time` formatted as ISO 8601 with offset. If the run errored partway, DO NOT update STATE_FILE so the next run picks back up from the same point.

SOURCE: Claude Code session transcripts under ~/.claude/projects/ (one directory per project; each contains .jsonl session transcripts). Use Bash + Read.

For each session whose latest message timestamp falls within the collection window:
1. Derive: session start ts, session end ts, project (directory name), a 1-2 sentence summary of what the session worked on (read the first user message + last assistant message), and any file paths or PR/branch names touched (grep for paths and `gh pr`/`git` invocations).
2. Write file: {EPISODES_DIR}/{ISO_TS}-claude-{session-id-short}.md where ISO_TS is the session start in YYYY-MM-DDTHH-MM format (local time).

Frontmatter (YAML):
---
type: episode
source: claude-code
source_id: <session id>
source_path: <absolute path to .jsonl>
ts_start: <ISO 8601 with offset>
ts_end: <ISO 8601 with offset>
duration_minutes: <int>
actor: joey
project: <project dir name>
entities: []
---

Body: 1-2 sentence summary, then a bullet list of files touched / commands of note / PRs referenced.

Rules:
- Idempotent: if the target file already exists, skip it.
- Never edit files outside EPISODES_DIR.
- If ~/.claude/projects/ is empty or unreadable, write a single file YYYY-MM-DD-claude-NORUN.md with body "no sessions found in window" and exit cleanly. If the directory was unreadable due to an error, do NOT update STATE_FILE; if it was simply empty within the window, that counts as a successful empty run and STATE_FILE should be updated.
- Do not run typecheck, lint, or tests. Do not commit anything.
- Cut-off window: the [window_start, fire_time] range determined above. Do not use a hardcoded 24h.

Report at the end: count of episode files written, count skipped (already existed), the EPISODES_DIR path, and the `window_start`/`window_end` used. Confirm whether STATE_FILE was updated.
