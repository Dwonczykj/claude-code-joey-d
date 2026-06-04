---
name: record-claude-code-work
description: Organise history of claude code sessions
---

Goal: append a dated entry to my work log capturing what I did in the
last 24 hours, organised by topic. Runs every weekday.

Inputs (gather all three):

1. Git commits from the last 24h, local AND remote (cloud agents push
   directly to remote branches I haven't pulled).

   Repos to scan:
   - /Users/joey/FyxerGh/fyxer-web-app-trees/fyxer-web-app (main)
   - All worktrees under /Users/joey/FyxerGh/fyxer-web-app-trees/
     (iterate every subdirectory that is a git worktree; skip the
     main one above to avoid double-counting)
   - /Users/joey/FyxerGh/fyxer-chrome-extension
   - /Users/joey/FyxerGh/fyxer-e2b
   - /Users/joey/FyxerGh/fyxer-human-data-platform
   - /Users/joey/FyxerGh/data-platform

   For each repo:
     a. `git fetch --all --quiet`
     b. `git log --all --since="24 hours ago"
        --author="joey.dwonczyk@fyxer.com"
        --pretty=format:"%h %aI %s %d"`
        (%d includes ref names so you can see which branch each
        commit is on)

   Cloud agent commits are authored as me but pushed to branches
   containing "claude" in the name (e.g. claude/*, claude-code/*).
   Tag these as agent-driven in the output.

   Deduplicate by commit SHA.

2. Claude Code sessions from the last 24h at
   ~/.claude/projects/**/*.jsonl. Capture session start/end
   timestamps from file mtimes and message timestamps inside.

3. Claude.ai chats from the last 24h via conversation_search /
   recent_chats. Capture chat timestamps.

Context:
- Wiki location:
  /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_wiki
  This is an Obsidian folder of markdown notes.
- Read the existing wiki structure BEFORE drafting anything. List
  the folder, open the most recent daily/weekly entries and any
  topic notes that look relevant to today's work. Match the existing
  formatting exactly — heading levels, bullet style, date format,
  section structure, link syntax ([[wikilinks]] if used).
- Match new work to existing topic notes where possible. Only create
  a new topic note if nothing fits.

Output: append today's entry in the wiki's existing format. For each
topic worked on, include:
- A short headline (max 10 words)
- One-line description of what changed
- Timestamps to the minute where available (commit times, session
  start times, chat times). Format as HH:MM or HH:MM–HH:MM for
  ranges. Omit if not evidenced.
- Source mix: hands-on / agent / mixed (based on whether commits
  came from "claude*" branches)
- Business metric this ladders to — only if evidenced in the source.
- Observed result — only if evidenced in the source.

Rules:
- Keep every entry as short as possible. This runs daily; brevity
  compounds.
- Match the wiki's existing formatting; do not impose a new
  structure.
- Do not invent business impact or results. Blank is correct when
  unevidenced.
- One topic per section. If a commit spans topics, list under the
  primary one.
- Headlines follow laddering style: what improved → metric →
  retention impact, only where evidenced.