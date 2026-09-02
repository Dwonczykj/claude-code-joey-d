---
name: get-session
description: Find another Claude Code session by title and return its session id. Use when the user asks to look up, reference, or pull information from "another chat", "another session", "that other conversation", names a session by title, or asks "what's the session id for X".
---

Argument: a session title (exact or partial).

1. Call `list_sessions` (include_archived: true) and match the argument against each session's title — exact match first, then case-insensitive substring.
2. If nothing matches, retry with `search_session_transcripts` using the argument as the query, since the title given might actually be transcript content rather than the literal session title.
3. One match: reply with just the session id (and title, for confirmation). Multiple matches: list title + id for each and ask the user which one. No matches: say so.
