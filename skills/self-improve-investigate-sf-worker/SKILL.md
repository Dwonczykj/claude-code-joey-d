---
name: self-improve-investigate-sf-worker
description: Find where an sf worker or orchestrator session spent its wall time (plan review, build, pre-PR gate, fix-pr loop, waiting on Joey) and which tool calls were slowest, from its raw transcript. Use when Joey says "where did the time go", "what's the bottleneck in the sf factory", "investigate this worker's trace", "why did this PR take so long to build", or hands over a session id or build room to look at. One of the self-improve-* skills that record repeatable investigation steps.
---

# Investigate an sf worker's trace

## Where the traces are

- Transcript: `~/.claude/projects/<project-slug>/<cli-session-id>.jsonl`. One line per event, each with a `timestamp`. Lines are not in time order, so the script sorts them.
- Desktop id to CLI id: `~/Library/Application Support/Claude/claude-code-sessions/<account>/<org>/local_<id>.json`, fields `cliSessionId` and `lastAssistantCliSessionId`. A resumed session has more than one CLI id.
- Orchestrator to children: `~/.claude/handovers/links.jsonl` and `tree.sh`. A room's workers also appear in `~/FyxerGh/build-room/<room>/events.jsonl`.
- Compact per-session records (no timestamps per call, so not enough for timing): `~/FyxerGh/build-room/sf-outer-loop/records/<cli-id>.json`.

## Steps

1. Get the session ids. A named session: use the `get-session` skill. A whole room: `--room ~/FyxerGh/build-room/<room>`.
2. Run the script, which takes `local_` ids, CLI ids or paths:
   ```bash
   cd ~/.claude/skills/self-improve-investigate-sf-worker && python3 scripts/phase_timing.py <id> [<id> ...] [--top 8]
   python3 scripts/phase_timing.py --room ~/FyxerGh/build-room/<room>
   ```
3. Read the output. Rows are phases (the last Skill the session invoked); columns are categories. Only user and assistant lines count, because queue, hook and attachment lines are written mid-wait and split waits wrongly. Each gap is charged to the event that ended it:
   - `model`, `build/test` (pnpm, jest, tsc, gate), `git/gh`, `review-poll` (Qodo, `gh pr view/checks`, review-comment reads), `poll/wait` (sleep, Monitor), `sub-agent`, `session-mgmt`, `other tool`.
   - `human`: a human message, or an AskUserQuestion card however long it sat.
   - `background`: a notification ended the wait. The roll-up lists the causes (task-notification = a background command or Monitor finished; peer = another session messaged).
   - `stall`: one tool call or model turn over 30 min. Laptop sleep or a hung shell, not work.
   - `away`: a gap over 30 min ended by a human, hook or restart. Excluded from "active".
4. For a room, add `--html <room>/time-report.html` for a charts page (phase and session bars, push cycles) and send it to Joey with SendUserFile, display render.
5. Open the slowest calls in the raw transcript when the one-line command is not enough: find the `tool_use` id, read the event before it.
6. Write down what you found as a short list of causes with a number each (minutes lost, how often), and which sf skill or script to change. Do not change sf skills from here; hand the list to Joey or to `sf:doctor`.

## Qodo findings (what the review loop is catching)

```bash
python3 scripts/qodo_findings.py --room ~/FyxerGh/build-room/<room> --out <room>/qodo-findings.json
```

Reads Qodo's inline review comments with `gh` (the summary comment is overwritten each round, so it hides history). Prints findings by kind, by file type (spec/docs, src, tests), by rough family and rounds per PR. `--room` takes every `#1xxxx` number in the room files, so it can include PRs from outside the room; pass PR numbers instead for a clean set. Family regexes are guesses; about half land in "other".

## Daily digest

`scripts/daily_digest.py` runs both scripts over every room with a session active in the last 24h and writes `~/FyxerGh/build-room/sf-outer-loop/digests/<date>.md` (flags first: any stall, any open PR over 3 Qodo rounds). No model calls. The launchd job is `com.joey.sf-outer-loop-digest` (off until bootstrapped); on/off and the wider plan are in `sf-outer-loop/design-self-improving-loop.md`.

## Reading it

- Large `model` time means long thinking or many round trips; check repeated Skill reloads and plan-review rounds.
- Large `build/test` or `other tool` time is nearly always one Bash command. The slowest-calls list names it.
- Large `human` time means the worker stopped to ask; list the cards and ask whether the build could have defaulted.
- Large `background` time is waiting on review bots, CI or other sessions. In `sf:fix-pr` it is the Qodo loop.

## Hypotheses to test with it

- Qodo waits dominate `sf:fix-pr`. Check the background causes and `review-poll` per PR, and the gap between pushes. A local Qodo CLI run exists (see the fast Qodo loop memory); measure how often it runs before the push, and which Qodo findings a lint rule or the repo rules file could have caught first.

## Improving this skill

Run it on the next few real sessions and fix what misleads. Known gaps to check first:
- Phase = last Skill invoked, so work inside a sub-agent is charged to the parent's phase. Sub-agent transcripts are not read yet. `sub-agent` is tiny (28 min over 38 sessions), so review seats probably run through Bash or background commands, not the Agent tool; check.
- A "Wait for Qodo verdict" background command can span a laptop sleep, so long background waits are upper bounds.
- Parallel tool calls: only the first result carries the gap.
- The 30-minute `stall` and `away` cut-offs are guesses.
- `other tool` is still 20h (8h53m of it `cd <worktree> && ...` commands): split it by what the command does.

Log each run below (date, session, what was wrong with the output, what was changed).

### Run log
- 2026-11-17: built. First run on `2720860b` (1,069 calls) exposed out-of-order timestamps (negative Joey time) and overnight gaps counted as work; fixed with a sort and the `away` bucket.
- 2026-11-17: `jd-custom-integrations-rules-as-flows` (38 sessions, `--room --summary`). Found: 56% of active time (65h of 115h) is background waits; Bash is 28h of the 29h of tool time; `sf:review-seat` 21h and `openspec-update-change` 20h are the biggest phases. Added `--summary` roll-up and fixed room discovery (ids are in ledger.md and tickets.json, not events.jsonl). Open: the three gaps above.
- 2026-11-17: v2 after Joey asked for categories and charts. Rewrote the accounting (conversation lines only, cards stay `human`, `stall` and `away` split, `review-poll`, background causes, push-gap stats, `--html`). Room run: active 157h = human 35h, background 43h (33h task-notification, 10h peer), model 21h, other tool 20h, stall 26h. `sf:fix-pr`: 14h of 22h is background.
- 2026-11-17: Qodo analysis on the rules-as-flows room (script `qodo_findings.py`). 184 Action-required findings on 37 PRs (88 bug, 75 skill insight, 3 rule violation, 1 requirement gap); 78 are in spec/docs files (design.md, spec.md, tasks.md), 105 in src, 1 in tests. Repeating families: who can see or approve (36), idempotency/retry/overlap (22), flow silently stops after a change (15). Median 1 round per PR with findings, worst 7; #17567 (21 findings over 18h) and #17771 (17 over 15h) are the outliers.
- 2026-11-17: added `daily_digest.py`; `analyse(path, since)` now charges only the part of each gap inside the window (category still decided on the full gap), and `qodo_findings.rounds()` is shared. First run: 5 stalls flagged (all model turns over 30 min; raw lines not read, so some may be background wakes), PRs #17720 (5 rounds) and #17771 (7) flagged. Stall flags will be noisy until sleep is told apart from a hung call.
