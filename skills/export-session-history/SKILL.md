---
name: export-session-history
description: Export the current Claude Code session's chat transcript to a temp file, print the path, and copy the path to the clipboard. Use when the user asks to dump/export/save the current session, chat thread, or message history to a file.
---

# Export session history

Run this exact command. It copies the current session's transcript (the most-recently-modified `.jsonl` in this project's Claude Code session dir) to a temp file, copies the path to the clipboard, and prints it:

```bash
DIR="$HOME/.claude/projects/$(pwd | sed 's/[/.]/-/g')"
SRC=$(ls -t "$DIR"/*.jsonl 2>/dev/null | head -1)
[ -z "$SRC" ] && { echo "No session transcript found in $DIR"; exit 1; }
DEST="${TMPDIR:-/tmp}/$(basename "$SRC")"
cp "$SRC" "$DEST"
printf '%s' "$DEST" | pbcopy
echo "$DEST"
```

Then tell the user the path (it's already on their clipboard).

The transcript is raw JSONL — one message per line, the source of truth for the session. If the user asks for readable/formatted output instead, extract `.message.content` per line with `jq`.
