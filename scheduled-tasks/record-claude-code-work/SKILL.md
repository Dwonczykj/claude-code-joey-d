---
name: record-claude-code-work
description: Organise history of claude code sessions
model: sonnet
effort: medium
---

Goal: append a dated entry to my work log capturing what I did in the
last 24 hours, organised by topic. Runs every weekday.

Inputs (gather all three):

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

1. Git commits from the last 24h: read episode files in EPISODES_DIR
   with frontmatter `source: git` or `source: github-pr` whose `ts`
   falls in the last 24h. These are written earlier each day by the
   `collect-git-episodes` scheduled task (covers all repos under
   /Users/joey/FyxerGh, local and remote). Use each file's `repo`,
   `branch`, `subject`/`pr_title`, and `ts` fields directly.

   Cloud agent commits are authored as me but pushed to branches
   containing "claude" in the name (e.g. claude/*, claude-code/*) —
   check the episode's `branch` field. Tag these as agent-driven in
   the output.

   Fallback: if EPISODES_DIR has no matching git episodes for the
   window (collector didn't run or is stale), fall back to scanning
   directly: for each repo listed in `collect-git-episodes`'s
   SKILL.md, `git fetch --all --quiet` then
   `git log --all --since="24 hours ago" --author="joey.dwonczyk@fyxer.com" --pretty=format:"%h %aI %s %d"`.

   Deduplicate by commit SHA.

2. Claude Code sessions from the last 24h: read episode files in
   EPISODES_DIR with frontmatter `source: claude-code` whose
   `ts_start` falls in the last 24h. These are written earlier each
   day by the `collect-claude-episodes` scheduled task. Use each
   file's `ts_start`, `ts_end`, `project`, and summary body directly.

   Fallback: if EPISODES_DIR has no matching claude-code episodes for
   the window, fall back to scanning ~/.claude/projects/**/*.jsonl
   directly for the last 24h (session start/end from file mtimes and
   message timestamps inside).

3. Claude.ai chats from the last 24h via conversation_search /
   recent_chats. Capture chat timestamps. (Nothing else collects
   this, so always gather it fresh.)

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