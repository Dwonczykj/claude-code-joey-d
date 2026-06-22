---
name: search-synthesized-linear-issues
description: Search pre-synthesized Linear episode files and reconciliation observations to find context on recent Linear issues quickly — faster than calling the Linear API. Use when asked about specific tickets (PRE-XXXX), recent Linear activity, or what's been created/updated in Linear lately.
user_invocable: true
---

# Search Synthesized Linear Issues

Searches the pre-generated Linear episode files and reconciliation observations stored locally in Obsidian. This is faster than calling the Linear MCP connector and covers recent activity with richer context.

## Source paths

- **Episodes** (individual Linear events): `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes/`
  - Files matching `*linear-PRE-*.md` (e.g. `2026-06-12T11-20-linear-PRE-2688-created.md`)
- **Reconciliation observations** (weekly summaries with full state-transition audit): `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/linear-reconciliation/`
  - `latest.md` — the most recent reconciliation run
  - `YYYY-W##-linear-reconciliation.md` — per-week files

## How to use

### Finding a specific ticket (e.g. PRE-2688)
```bash
grep -r "PRE-2688" \
  '/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes/' \
  '/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/linear-reconciliation/' \
  -l
```
Then Read the matching files for full context.

### Finding all linear episodes in a date range
```bash
ls '/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes/' | grep "^2026-06.*linear"
```

### Finding tickets by keyword/title
```bash
grep -r "chat-tools\|registry\|threadConfig" \
  '/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes/' \
  --include="*linear*" -l
```

### Reading the latest reconciliation summary
```bash
cat '/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/linear-reconciliation/latest.md'
```

## Episode file format

Each `linear-PRE-*.md` episode has frontmatter with:
- `issue`: ticket identifier (e.g. `PRE-2688`)
- `issue_title`: human-readable title
- `event`: `created`, `commented`, `status-changed`, `assigned-to-me`
- `actor`, `actor_email`, `assignee_is_me`, `created_by_me`
- `source_url`: direct Linear URL

Body contains a prose summary of what happened.

## When to use vs Linear MCP

- **Use this skill** for: recent activity (last ~2 weeks), checking if a ticket exists, finding what tickets were created around a date, getting rich context on a specific ticket fast
- **Use Linear MCP** for: authoritative current state, creating/updating tickets, querying across the full backlog
