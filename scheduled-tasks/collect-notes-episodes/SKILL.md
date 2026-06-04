---
name: collect-notes-episodes
description: Collect Apple Notes.app notes I edited in the last 24h into Obsidian _episodes/
---

Collect Apple Notes.app activity from the last 24 hours and write one episode file per modified note into the Obsidian vault.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

SOURCE: Apple Notes.app via AppleScript (osascript). Notes.app is an important context source — Joey records a lot of work-in-progress thinking there.

Use this AppleScript via Bash (osascript -e ...) to enumerate notes modified in the last 24h:

  tell application "Notes"
    set cutoff to (current date) - (24 * hours)
    set results to {}
    repeat with n in notes
      if modification date of n > cutoff then
        set end of results to {id of n, name of n, (modification date of n) as string, (creation date of n) as string, plaintext of n, name of container of n}
      end if
    end repeat
    return results
  end tell

Notes:
- `plaintext` of a note can be large — truncate body to first 1500 chars when writing the episode.
- `id of n` returns an x-coredata:// URI; use a short stable hash of it for the filename.
- If AppleScript is blocked by macOS Automation permissions, write a single file YYYY-MM-DD-notes-NORUN.md with body "Notes.app access denied — grant Automation permission to the terminal/Claude Code in System Settings > Privacy & Security > Automation" and exit cleanly.

For each modified note:
1. Capture: note id, title, folder (container name), creation ts, modification ts, plaintext snippet (first 1500 chars).
2. Write file: {EPISODES_DIR}/{ISO_TS}-notes-{id-hash-short}.md where ISO_TS is modification ts in YYYY-MM-DDTHH-MM (local).

Frontmatter:
---
type: episode
source: apple-notes
source_id: <note id URI>
ts: <ISO 8601 with offset, modification time>
ts_created: <ISO 8601, creation time>
actor: joey
folder: "<container name>"
title: "<note title>"
entities: []
---

Body:
# {title}

> {plaintext snippet, truncated to 1500 chars}

Rules:
- Idempotent: if the target file already exists AND its frontmatter `ts` matches the current modification ts, skip. Otherwise overwrite (the note has been edited again).
- Never write outside EPISODES_DIR.
- Never modify or delete any note in Notes.app — read-only.
- Cut-off: last 24 hours from fire time.

Report: count written, count skipped (unchanged), count overwritten (re-edited), any AppleScript errors.