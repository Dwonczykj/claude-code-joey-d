---
name: collect-claude-episodes
description: Collect Claude Code session episodes from the last 24h into Obsidian _episodes/
---

Collect Claude Code session activity from the last 24 hours and write one episode file per session into the Obsidian vault.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

SOURCE: Claude Code session transcripts under ~/.claude/projects/ (one directory per project; each contains .jsonl session transcripts). Use Bash + Read.

For each session whose latest message timestamp is within the last 24h:
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
- If ~/.claude/projects/ is empty or unreadable, write a single file YYYY-MM-DD-claude-NORUN.md with body "no sessions found in window" and exit cleanly.
- Do not run typecheck, lint, or tests. Do not commit anything.
- Cut-off window: last 24 hours from the moment this routine fires.

Report at the end: count of episode files written, count skipped (already existed), and the EPISODES_DIR path.