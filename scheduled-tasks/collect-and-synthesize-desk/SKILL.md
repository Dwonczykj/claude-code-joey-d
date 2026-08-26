---
name: collect-and-synthesize-desk
description: Single entry point: run every desk collector then every synthesizer as sequential sonnet sub-agents
model: sonnet
---

You are the single entry point for the desk collect + synthesize pipeline. Do NOT collect or synthesize anything yourself. Dispatch each routine to its own sub-agent, one at a time, in the order below.

This routine is self-contained. Every routine's full instructions live in `routines/<id>.md` next to this file, and their run-window state lives in `state/<id>.txt`. Nothing outside this directory is needed.

ROUTINES_DIR: /Users/joey/.claude/scheduled-tasks/collect-and-synthesize-desk/routines

FIRE_TIME: at the very start, capture the current local time as an ISO 8601 timestamp with offset (`date -Iseconds`). Pass that same value to every sub-agent so all collection windows agree.

For each routine, in order:
1. Spawn ONE sub-agent with the Agent tool: `subagent_type: "general-purpose"`, `model: "sonnet"`, `run_in_background: false`. Synchronous is required — the routines share `_episodes/` and stage 2 reads what stage 1 wrote.
2. Use exactly this prompt, substituting `<id>` and `<FIRE_TIME>`:
   "Read ROUTINES_DIR/<id>.md and execute it exactly as written, start to finish. Treat fire_time as <FIRE_TIME>. That file owns everything — vault paths, the window / state-file logic, frontmatter format, dedup rules — do not substitute your own. Return only one line: <id> | written: N | skipped-dup: N | errors: none OR <one line>."
3. Record the returned line and move to the next routine. If a routine errors, keep going with the rest.

STAGE 1 — collectors (write episodes; independent of each other):
collect-claude-episodes
collect-codex-episodes
collect-git-episodes
collect-pod-git-episodes
collect-gmail-episodes
collect-slack-episodes
collect-pod-channel-episodes
collect-linear-episodes
collect-notion-episodes
collect-notes-episodes

STAGE 2 — synthesizers (read stage 1's episodes; start only after every stage 1 routine has returned):
synthesize-work-done
synthesize-relationships
synthesize-pod-work

Rules:
- Never edit a file in `routines/`. Each routine owns its own `state/<id>.txt`; never read, write or reset a state file yourself.
- Every vault write belongs under the trusted folder /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes (each routine already targets it). If a sub-agent reports writing outside it, flag that in the report and do not retry.
- If a routine's file is missing from `routines/`, skip it and say so.
- Never retry a failed routine in the same run. Its state file is untouched, so the next run resumes from the same window.
- Final output: one line per routine in run order, then totals for episode files and observation files written. Nothing else.