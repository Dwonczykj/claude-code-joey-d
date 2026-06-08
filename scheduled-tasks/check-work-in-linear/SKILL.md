---
name: check-work-in-linear
description: Reconcile my synthesized weekly work against my Linear tickets and actively update / create them so Linear reflects current reality
---

Reconcile MY synthesized work this week against the Linear tickets I'm assigned to, and ACTIVELY update Linear so it reflects the current state of my work — update stale tickets, fix state mismatches, and create missing tickets for work I've actually done that isn't tracked.

=== IDENTITY (HARD FILTER — ONLY MY WORK) ===
GitHub username: Dwonczykj
Git author email: joey.dwonczyk@fyxer.com
Linear email: joey.dwonczyk@fyxer.com
Linear display name: Joey Dwonczyk
Linear user id: 885441bc-74c0-40ef-9374-a5b09634507d

=== FIXED LINEAR CONTEXT ===
Team: Product Engineering (key `PRE`, id `d1c8a0b3-dfc0-4f5d-8b93-85ce050b3945`)
Default project for new tickets: Context Pod Q2 2026 (id `d87bb3b5-a155-485b-975b-f6c4bfabad5c`)
This routine only touches issues whose assignee is me. Never modify someone else's issue.

=== TOOLS ===
Linear MCP tools are prefixed `mcp__ac8e4a0b-1ec5-4ab5-8b10-e46579796632__`. Load via ToolSearch if not already available: `list_issues`, `get_issue`, `save_issue`, `save_comment`, `list_issue_statuses`, `list_comments`.

=== INPUTS ===
EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes
OBSERVATIONS_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations
OUTPUT_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/linear-reconciliation

WINDOW: last 7 days (Monday 00:00 of the current ISO week → now).

=== STEP 1: COLLECT MY WORK FROM SYNTHESIS ===

Load:
- All `_observations/{YYYY-MM-DD}-work-done.md` files whose date falls in the window.
- All `_episodes/*` whose ts is in the window AND whose source is `git`, `github-pr`, or `claude-code` AND whose actor is me (`actor_handle: Dwonczykj` / `actor_email: joey.dwonczyk@fyxer.com`, or `claude-code` which is inherently mine).

Build a list of "work items": one per cluster from the work-done observations PLUS one per orphan git/PR/Claude episode that didn't make it into a cluster. For each work item capture:
- title (cluster title or commit subject / PR title / Claude session summary)
- type_guess: "feature" | "bugfix" | "investigation" | "infra" | "other"
- repo (if applicable)
- linear_id_mentioned: any PRE-\d+ ticket ID referenced in commits, PR bodies, branch names, or episode bodies
- pr_state: if a PR is linked, capture { number, merged_to: "staging"|"main"|null, merged_at, url }
- evidence: list of episode wikilinks
- completion_signal: "merged-main" | "merged-staging" | "pr-open" | "in-progress" | "investigation-done" | "unknown" — derived from the strongest signal across episodes

=== STEP 2: PULL MY LINEAR STATE ===

Via Linear MCP, fetch:
- All issues where I am assignee AND updatedAt is within the window.
- All my currently-open assigned issues (any update time) so we can detect work items that match an open ticket that hasn't been touched this week.

For each issue capture: id, identifier (e.g. PRE-123), title, state (name + type), url, updatedAt, project, last comment date.

Also call `list_issue_statuses` for team PRE once and cache the mapping of state names → state ids. Identify these target states (match by name, fall back to type):
- IN_PROGRESS: name "In Progress" (type `started`)
- IN_REVIEW: name "In Review" / "In Staging" / "QA" (type `started`)
- DONE: name "Done" (type `completed`)
- TODO: name "Todo" / "Backlog" (type `unstarted` / `backlog`)

=== STEP 3: MATCH ===

For each work item from STEP 1, find the best matching Linear issue using these signals (in priority order):
1. Explicit PRE-\d+ in the work item's commits / PR / branch (confidence "high").
2. PR linked to a Linear issue via Linear's GitHub integration (confidence "high").
3. Title/body similarity against my open issues (confidence "medium" if clear, "low" if hand-wavy — require ≥2 distinctive shared terms; bare verbs like "fix" / "update" don't count).
4. No reasonable match → "missing".

Categorise every work item into ONE of:
- `tracked_ok` — ticket exists and its state already matches the work item's completion_signal.
- `tracked_state_mismatch` — ticket exists, state is wrong. Compute expected_state from completion_signal:
  - merged-main → DONE
  - merged-staging → IN_REVIEW
  - pr-open / in-progress / investigation-done → IN_PROGRESS
- `tracked_stale` — ticket exists, state is acceptable, but ticket hasn't been updated/commented on in the last 7 days despite work happening this week.
- `missing` — no Linear ticket appears to cover this work. Draft a title + 1–2-sentence description for a new ticket.

=== STEP 4: ACT ON LINEAR (this is the new behaviour — do, don't just suggest) ===

HARD GUARDRAILS before any write:
- Skip the write if the matched issue's assignee is not me. Log it under "skipped — not mine" in the report instead.
- Skip the write if the matched issue is in a project we explicitly shouldn't touch (any project containing "Eval", "Sandbox", or "Archive" in the name) — log under "skipped — protected project".
- Match confidence "low" never triggers a write (status change or new ticket). It only goes into the report as a suggestion for me to review manually.
- Confidence "medium" triggers comments and stale nudges but NOT state transitions and NOT new-ticket creation.
- Confidence "high" triggers state transitions and new-ticket creation.
- Never create more than 5 new tickets per run. If more than 5 `missing` items qualify, create the top 5 (most evidence first) and list the rest in the report under "deferred — would have created".
- Idempotency: before commenting on a ticket, fetch its recent comments via `list_comments` and skip if the same provenance line (matching the wikilink set or PR URL) was posted in the last 7 days.

4a. `tracked_state_mismatch` (high confidence only):
- Call `save_issue` with `id` and `state: <target state id>`.
- Add a `save_comment` describing why, including the evidence (PR URL + episode wikilinks).

4b. `tracked_stale` (medium or high confidence):
- Add a `save_comment` summarising what happened this week in 1–2 sentences, with episode wikilinks. Do NOT change state.

4c. `missing` (high confidence only — i.e. work item with strong evidence that no ticket covers it):
- Call `save_issue` with:
  - `team`: `d1c8a0b3-dfc0-4f5d-8b93-85ce050b3945`
  - `project`: `d87bb3b5-a155-485b-975b-f6c4bfabad5c`
  - `title`: drafted title
  - `description`: markdown body with the problem / what was done / evidence wikilinks (real newlines, no `\n`)
  - `assignee`: `885441bc-74c0-40ef-9374-a5b09634507d` (me)
  - `state`: derived from completion_signal:
    - merged-main → DONE
    - merged-staging → IN_REVIEW
    - pr-open / in-progress / investigation-done → IN_PROGRESS
    - unknown → leave unset (team default)
- After creation, record the returned identifier so the report cites the real PRE-\d+.

4d. `tracked_ok`: do nothing. Listed in the report for completeness.

=== STEP 5: WRITE THE RECONCILIATION REPORT ===

OUTPUT_FILE: {OUTPUT_DIR}/{YYYY-Www}-linear-reconciliation.md
Also write {OUTPUT_DIR}/latest.md as a copy.

Frontmatter:
---
type: observation
kind: linear-reconciliation
window_start: <ISO>
window_end: <ISO>
generated_at: <ISO>
work_item_count: <int>
tracked_ok: <int>
state_transitions_applied: <int>
stale_comments_added: <int>
tickets_created: <int>
skipped_low_confidence: <int>
skipped_not_mine: <int>
skipped_protected_project: <int>
deferred_creation: <int>
---

Body sections:
# Linear reconciliation — Week of {YYYY-MM-DD}

## Summary
- {N} work items synthesized this week.
- Applied: {state_transitions_applied} state transitions, {stale_comments_added} stale comments, {tickets_created} new tickets.
- Held back: {skipped_low_confidence} low-confidence matches, {deferred_creation} deferred creations.

## ✏️ State transitions applied
For each transition: `{ticket id} — {title}` · {current → new} · Reason · Linear URL · evidence wikilinks.

## 💬 Stale comments added
For each: `{ticket id} — {title}` · 1-line summary of comment posted · Linear URL.

## 🆕 Tickets created
For each new ticket: `{returned PRE-\d+} — {title}` · initial state · Linear URL · evidence.

## ⏸️ Held for manual review (low confidence)
For each: work item title, candidate ticket(s) considered, why confidence is low.

## ⏭️ Deferred new tickets (capped at 5/run)
For each deferred missing item: drafted title + 1-line description + evidence.

## ✅ Already in sync
Compact table: {ticket id} | {title} | {state} | {URL}

## Provenance
Work items considered: {N}. Sources: git episodes={a}, PR episodes={b}, claude episodes={c}, work-done observations={d}. Linear writes: state changes={x}, comments={y}, creates={z}.

=== RULES ===
- HARD RULE: only consider and only mutate issues where the assignee is me. Drop everything else silently from the write phase.
- Never invent ticket IDs. Only reference IDs that come back from real Linear API calls.
- All Linear writes must be idempotent within a week — re-running the same week should produce zero new comments / no state thrash.
- If Linear MCP is unavailable, write a NORUN stub and exit cleanly with zero writes.
- This routine is allowed to write to Linear (create, comment, change state) but is NEVER allowed to close someone else's ticket, delete a ticket, or move a ticket out of the Context Pod project.

REPORT AT END (terminal output): path to OUTPUT_FILE, counts per category, and an explicit list of every Linear write performed (issue id, action, link) so I can audit in one glance.