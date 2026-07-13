---
name: archive-routine-sessions
description: Find finished throwaway sessions spawned by scheduled routines (episode collectors, synthesizers, meeting-to-wiki, weekly reports, etc.) and archive them from this supervised session. Use when the user says "archive routine sessions", "clean up my routine sessions", "archive finished cron sessions", "tidy up my session list", or "/archive-routine-sessions". Runs interactively — archiving requires per-session confirmation and is impossible from an unsupervised routine session, so this must be run by hand.
---

# Archive routine sessions

Routine (scheduled-task / cron) sessions run **unsupervised**, where `archive_session`
is disabled and always prompts. So they can only be archived from a **supervised
interactive session** like this one. This skill lists them, matches them to the
user's actual routines, and archives the finished ones after confirmation.

## Why not a hook

`SessionEnd` can't do this: the `archive_session` MCP tool is confirmation-gated and
unavailable in unsupervised mode, and there is no `claude` CLI archive command for a
`command` hook to call. This skill is the working alternative — run it periodically.

## Steps

1. **Get the routine set.** Call `mcp__scheduled-tasks__list_scheduled_tasks`. Keep the
   `description` of each task — this is what you'll match session titles against. If that
   server is unavailable, fall back to the title-pattern heuristics below.

2. **Get the sessions.** Call `mcp__ccd_session_mgmt__list_sessions` (default, no archived).
   The current session is already excluded from the result.

3. **Select candidates.** A session is a candidate to archive only if **all** hold:
   - `isRunning` is `false` (never archive a running session — some interactive sessions
     stay running).
   - It has **no open PR** (`prState` is absent or not `"OPEN"`).
   - Its `title`/`cwd` clearly corresponds to a scheduled routine's purpose — i.e. the
     session was produced by one of the routines, not by hand.

   Match on meaning, not exact strings. Routine session titles are model-generated from
   the routine prompt. Typical patterns, all of which are routine output:
   - `Collect <source> episodes` / `Collect pod <source> episodes` (git, gmail, slack,
     linear, notion, notes, claude, channel)
   - `Synthesize work done` / `Synthesize pod work` / `Synthesize relationships`
   - `Meeting to wiki`, `Record claude code work`, `Organise notes` / episodes into `_Wiki`
   - Weekly report / recognition / pod-context HTML generators, `check-work-in-linear`
     reconciliation, one-off `drafts-experiment-*` / `verify-*` runs

   When a finished session doesn't clearly map to a routine, **leave it out** and list it
   separately as "unclassified — not touching". Never archive real interactive work.

4. **Confirm as a batch.** Show the candidates as a numbered list (title, cwd, last
   activity) plus the unclassified ones you're skipping. Ask the user to confirm all, or
   name any to drop. Do not archive anything the user hasn't seen.

5. **Archive.** For each confirmed candidate call
   `mcp__ccd_session_mgmt__archive_session` with its `session_id` and a short `reason`
   (e.g. `"finished routine: collect-git-episodes"`). Each call prompts for confirmation —
   that's expected; the user approves each. Report which were archived and any skipped.

## Guardrails

- Never archive: a running session, a session with an open PR, or the current session.
- When unsure whether a session is routine output, skip it and say so.
- No threshold needed — a finished routine session is disposable regardless of age.
