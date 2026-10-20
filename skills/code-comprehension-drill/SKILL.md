---
name: code-comprehension-drill
description: Run a timed code comprehension interview drill. Generates an unfamiliar 200-500 line multi-file codebase with hidden bugs, plays the AI assistant, then grades the user on code reading, debugging and AI fluency. Use when the user says "code comprehension drill", "bug-planting drill", "mock code comprehension interview", "/code-comprehension-drill", or wants to practise the Google-style code comprehension round.
---

# Code comprehension drill

Mock of a 60 minute "read, debug, extend, optimise" interview round. You build the codebase, play the AI assistant, and grade afterwards.

## 1. Set up (no more than one question)

Defaults: TypeScript, medium difficulty, a domain the user has not seen (pick one: rate limiter, job queue, LRU cache with TTL, event bus, text diff, inventory ledger, scheduler, config merger). Only ask if the user gave nothing and the language is genuinely unclear. Read `~/code-drills/log.md` if it exists and aim the bugs at the user's weakest axis from past drills.

## 2. Generate the codebase

Make `~/code-drills/<YYYY-MM-DD>-<slug>/` containing:

- 3 to 4 source files, 200 to 500 lines total, realistic names and light comments. Written like normal working code, not like a puzzle. No comments that hint at bugs.
- `TASKS.md` (the only thing the user is told to read first), with three phases:
  1. Find and fix the bugs (do not say how many).
  2. Add one small feature that fits the existing design.
  3. Fix a performance problem.
- A tiny `run.md` with the command to run the code or its smoke test, if there is one. Tests must pass on the buggy code for paths the bugs do not touch, so they do not give the bugs away.
- `.answer-key.md` holding the bugs. **Never print, quote or summarise its contents until the debrief.**

Plant:
- 4 to 6 real bugs, mixed from: off-by-one, wrong operator or comparison, shared mutable state or aliasing, async ordering or missing await, null or empty input, wrong default, swallowed error, stale cache, unit mismatch.
- At least one subtle bug that needs a trace through two files to see.
- 1 performance problem for phase 3 (for example an O(n^2) scan hidden in a helper called in a loop).
- 1 red herring: code that looks wrong but is correct. Record it in the key.

Verify yourself before handing over: every bug in the key exists at the stated line, and the red herring really is correct. Fix the key, not just the code, if they disagree.

## 2b. From a PR (when the user gives a PR link)

Use real code instead of generating a codebase. The user's real work must stay untouched.

- Never push. Never touch an existing branch, the primary checkout, or its index or working tree. Never use `git checkout` or `git switch` in an existing worktree.
- The branch name must be `joeydwonczyk/test-drill-pr<N>-<YYYYMMDD>`. The `joeydwonczyk/test-` prefix is already used by real work (for example `test-PRE-3286-...`), so the `drill-` infix keeps these separable. Check `git branch --list` for a clash first.
- Build it with `git fetch origin pull/<N>/head` (writes FETCH_HEAD only), then `git worktree add --no-checkout -b <branch> <sibling dir named drill-pr<N>> <sha>`, then `git config branch.<branch>.pushRemote no-push-drill-branch` so a plain `git push` fails, then check the branch out in that worktree.
- Plant 4 to 6 bugs in the non-test source files the PR changed, by editing the worktree. Prefer bugs that need a second file to see, and omission bugs (a new helper that is never used at the call site). Leave tests unchanged. Keep one red herring.
- Hide them in history: `git reset --soft <merge-base with origin/staging>`, `git add` the changed source dirs (the soft reset leaves the index holding the unbugged PR, so staging is required), then commit once with `--no-verify`. Confirm `git show HEAD:<file>` contains the bug and `git status` is clean. The user reviews `git diff <base> HEAD`.
- Tell the user not to open the PR page or read its description. The drill folder holds `TASKS.md` and `.answer-key.md` as in step 2.
- Add real, unplanted weaknesses noted in the PR description to the key as bonus items that are not scored as misses.
- Do not run `tsc` or any typecheck in the web-app repo. Verify each bug by reading.

## 3. Run the round

Tell the user the folder path, that the clock is 60 minutes, and that you are the AI assistant in the side panel. Say the assistant can be wrong, as a real one can. Then run `date` and record the start time when they say "start".

While they work, answer as a capable but fallible assistant:
- Answer what they ask, at the precision they ask it. Vague prompts get vague answers. Narrow prompts get useful ones.
- Do not volunteer bugs or point at the key. Do not fix their code unless they ask for a specific edit.
- Make exactly one claim during the session that is plausible and wrong (a false statement about behaviour or a bad suggested fix). Log it in the key under "AI trap", with the turn it appeared in.
- Note silently, for grading, whether they stated a theory before asking you, and whether they checked your answers.

On "done" (or at 60 minutes), run `date` again for elapsed time. Ask them for a two minute spoken-style walk through of what the code does and why they changed what they changed. This is graded.

## 4. Debrief

Read the key now. Report:

- **Bugs:** a table of each bug: found and fixed, found not fixed, or missed, with the one-line reason it was hard. List any edits they made that were wrong or unneeded, and whether they fell for the red herring.
- **AI trap:** whether they caught it.
- **Scores, 1 to 5 each**, with one sentence of evidence per score:
  - Code reading (did their summaries match what the code does)
  - Debugging (theory before tool, narrowed before changing)
  - AI fluency (prompt precision, checking answers, catching the trap)
  - Communication (was the walk-through exact, or did it say "does some processing")
- **Next drill focus:** the lowest score, and one concrete habit to change.

Append one line to `~/code-drills/log.md`: date, domain, language, elapsed time, bugs found over planted, the four scores. Create the file with a header row if it does not exist.

## Rules

- Never leak the key early, even when the user is stuck. Offer a nudge at the level of "look at how X flows into Y", at their request, and note that it cost them in grading.
- Keep generated code ordinary. The drill is hard because it is unfamiliar, not because it is tricky.
- Do not grade on speed alone. Two correct fixes with a clear explanation beat five guesses.
