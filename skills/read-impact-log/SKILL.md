---
name: read-impact-log
description: Fetch Joey's Fyxer Impact Log from Notion and refresh its read-only snapshot in his Obsidian vault. Use to read, check, search, or quote the impact log, or as the first step of update-impact-log.
user_invocable: true
arguments: "[query]"
---

# read-impact-log

Source of truth (Notion, shared with reviewers for 360/performance review): `https://app.notion.com/p/39c244dd67558154abdbd4dff308effe`

## Flow

1. `notion-fetch` the URL above.
2. Write the fetched content to the snapshot file, overwriting whatever was there:
   `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_wiki/snapshots/Fyxer Impact Log (Notion Snapshot).md`
   Format:
   ```yaml
   ---
   type: notion-snapshot
   source_url: "https://app.notion.com/p/39c244dd67558154abdbd4dff308effe"
   snapshotted: <ISO 8601 timestamp, now>
   read_only: true
   ---
   ```
   followed by `> Read-only snapshot, refreshed on every read-impact-log / update-impact-log call. Edit the Notion page, not this file.` then the page's markdown content verbatim (strip the Notion API wrapper, keep headings/bold/links).
3. If invoked with a query/argument, answer it from the freshly-fetched content (don't answer from the stale on-disk snapshot). If invoked bare, just report the snapshot is refreshed and give a one-line summary of the most recent entry.

## Notes

- This file only reads. Never edit the Notion page from this skill — that's `update-impact-log`.
- The snapshot always fully replaces the previous one (single file, not versioned) — it's a mirror, not a history.
- Companion private log for effort that didn't clear the bar: see `read-no-impact-log`.
