---
name: search-synthesized-gh
description: Search pre-synthesized GitHub/git episode files and work-done observations to find context on recent PRs and commits quickly — faster than calling the GitHub API. Use when asked about specific PRs (web-app#XXXX), recent git activity, or what was shipped recently.
user_invocable: true
---

# Search Synthesized GitHub / Git Episodes

Searches the pre-generated GitHub PR and git commit episode files, plus synthesized work-done observations stored locally in Obsidian.

## Source paths

- **GitHub PR episodes**: `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes/`
  - Files matching `*git-web-app-pr-*.md` (e.g. `2026-06-10T00-02-git-web-app-pr-9731.md`)
- **Git commit episodes**: same directory
  - Files matching `*git-web-app-[0-9a-f]*.md` (7-char SHA suffix)
- **Work-done observations** (daily synthesized summaries with clusters): `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/`
  - `YYYY-MM-DD-work-done.md` — Joey's daily work synthesis
  - `YYYY-MM-DD-pod-work.md` — Context Pod synthesis

## How to use

### Finding a specific PR (e.g. #9731)
```bash
grep -r "9731" \
  '/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes/' \
  --include="*git*" -l
```
Then Read the matching file.

### Finding all PRs opened/merged in a date range
```bash
ls '/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes/' | grep "^2026-06-12.*git.*pr"
```

### Finding PRs by feature/keyword
```bash
grep -r "chat-tools\|threadConfig\|registry" \
  '/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes/' \
  --include="*git*" -l
```

### Reading today's or a recent work-done summary
```bash
# Today's
cat '/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/2026-06-12-work-done.md'

# List available
ls '/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/' | grep "work-done"
```

## Episode file format

Each `git-web-app-pr-*.md` episode has frontmatter with:
- `source_id`: e.g. `web-app#9731`
- `source_url`: GitHub PR URL
- `pr_title`, `pr_state` (`open`, `closed`, `merged`)
- `event`: `opened`, `merged`, `closed`, `reviewed`
- `actor`, `actor_handle`

## Work-done observation format

Clustered by feature area with:
- Duration in hours
- What changed (files touched, PRs, tickets)
- Business impact and why it's valuable
- Linked episode sources

## When to use vs GitHub MCP/API

- **Use this skill** for: checking what was shipped recently, finding which PR covers a feature, understanding the context behind a PR quickly, summarising recent work
- **Use GitHub API/gh CLI** for: authoritative PR state, creating PRs, reading full diffs, checking CI status
