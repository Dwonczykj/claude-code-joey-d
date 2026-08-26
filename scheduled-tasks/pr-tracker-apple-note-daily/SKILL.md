---
name: pr-tracker-apple-note-daily
description: Refresh "Open PR Tracker — Joey" Apple Note daily at 8:50am
model: sonnet
effort: medium
---

Invoke the `pr-tracker-apple-note` skill (at ~/.claude/skills/pr-tracker-apple-note/SKILL.md) to refresh the Apple Note titled "Open PR Tracker — Joey" with the current state of my open GitHub PRs on Fyxer-AI/web-app and their linked Linear PRE issues.

Concretely:

1. Call the Linear MCP `list_issues` tool with `assignee: "me"`, `team: "PRE"`, `limit: 200`. If it overflows and writes to a file, slim with `jq -c '{issues: [.issues[] | {id, title, url, status}]}' <path>`.
2. Pipe that JSON into `python3 ~/.claude/skills/pr-tracker-apple-note/build_pr_tracker.py` and capture stdout — that's the HTML body. The script calls `gh pr list --author "@me" --state open --repo Fyxer-AI/web-app ...` itself.
3. Overwrite the Apple Note: call `mcp__Read_and_Write_Apple_Notes__update_note_content` with `note_name: "Open PR Tracker — Joey"` and `new_content: <the HTML>`. If that errors with not-found, call `mcp__Read_and_Write_Apple_Notes__add_note` instead.

Reply with a single line: "Refreshed Open PR Tracker — N open PRs (X conflicts, Y failing checks, Z blocked)." Pull the bucket counts from the script's HTML (count `<div>` rows under each `<h2>`).

If `gh` is not authenticated or the GitHub call fails, do NOT overwrite the note — report the error and stop.