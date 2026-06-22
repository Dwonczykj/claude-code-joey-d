---
name: pr-tracker-apple-note
description: Refresh the "Open PR Tracker — Joey" Apple Note with all my open GitHub PRs on Fyxer-AI/web-app, grouped by health (conflicts / failing checks / blocked / clean), each row hyperlinked with its title, target branch, merge/check status, review decision, comment count, and linked Linear PRE issue + Linear status. Use when the user asks to refresh the PR tracker note, update the Apple Note tracker, or run /pr-tracker-apple-note. Also runs daily on a scheduled task.
---

# pr-tracker-apple-note

Build an HTML snapshot of my open PRs and overwrite the Apple Note titled **"Open PR Tracker — Joey"**.

## Steps

1. Fetch Linear PRE issues assigned to me (team `PRE`, up to 200) using the `mcp__ac8e4a0b-*__list_issues` tool with `assignee: "me"`, `team: "PRE"`, `limit: 200`. The result is large — if it overflows, the tool saves it to a file path; in that case `jq -c '{issues: [.issues[] | {id, title, url, status}]}' <path>` to slim it.

2. Pipe that slimmed JSON into the bundled builder:

   ```bash
   <slimmed-linear-json> | python3 ~/.claude/skills/pr-tracker-apple-note/build_pr_tracker.py
   ```

   The script shells out to `gh pr list --author "@me" --state open --repo Fyxer-AI/web-app ...` itself, joins by `pre-NNNN` in the PR head branch name, buckets by health, and prints HTML to stdout.

3. Capture stdout. Then overwrite the note by calling `mcp__Read_and_Write_Apple_Notes__update_note_content` with `note_name: "Open PR Tracker — Joey"` and `new_content: <the HTML>`. If the note doesn't exist yet, fall back to `mcp__Read_and_Write_Apple_Notes__add_note`.

## Notes

- The Apple Notes MCP accepts inline HTML directly — pass the script output verbatim, no escaping.
- Buckets in order: Conflicts → Checks failing → Blocked → Clean → Other. Within a bucket, newest PR first.
- Linear status badges: ✅ Done, 🔄 In Progress, 🚀 Awaiting deploy, 👀 Code Review, 📋 Backlog/Todo, ❌ Canceled.
- Don't add extra commentary in chat — just confirm "refreshed N PRs" after the note is updated.
- Requires `gh` CLI authenticated to Fyxer-AI. If the GitHub call fails, surface the error rather than writing an empty note.
