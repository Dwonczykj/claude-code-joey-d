---
name: line-by-line-review
description: >
  Two-pass line-by-line review of a PR or diff. PASS 1: walk the diff top to bottom
  explaining each change to the human (what it does, why it's there); whenever an issue
  is spotted, fix it inline, commit the fix, then re-explain the corrected code. PASS 2:
  after all code is explained and all fixes committed, spawn one read-only subagent per
  changed file to re-explain that file's final state — tracing the dependency tree (callers,
  callees, types, config) wherever a change's correctness depends on other code — then
  combine the subagents' answers into a single second, post-fix line-by-line review for the
  human. Use when the user asks to "review this PR/diff line by line", "explain each part of
  the diff and fix issues as you go", "fix then re-review", or wants a deep
  understand-and-verify walkthrough rather than a quick checklist review.
---

# Line-by-line review (fix-inline, then subagent re-synthesis)

A review that optimizes for the human *understanding* the diff and for the diff being
*correct*. Two passes:

1. **Pass 1 — explain + fix inline.** Walk the whole diff, explaining each change. The moment
   you find a real problem, fix it, commit it, and re-explain the corrected version. By the
   end of Pass 1 the branch is green and every change has been explained at least once.
2. **Pass 2 — per-file subagent re-explanation → synthesis.** Fan out one read-only subagent
   per changed file to re-explain each file's *final* state with dependency-tree context, then
   merge their reports into one clean, post-fix line-by-line review for the human.

Do not skip Pass 2 — it is the point of the skill. Pass 1 explanations are written while you
are still discovering and changing the code; Pass 2 is the authoritative review of the code as
it will actually merge.

## When to use vs other review skills

Use this when the user wants to *understand* the diff and have it *fixed* in one flow. For a
fast checklist (`/pr-review`), terse lead-engineer interrogation (`/pr-peer-review`), or an
auto-applying quality sweep (`/code-review`, `/simplify`, `/diff-review`), prefer those.

## Inputs & scope

Figure out the target before starting:

- **PR number / URL** → `gh pr view <n> --json …`, `gh pr diff <n>`, base = the PR's base branch.
- **A branch** → diff vs its base (ask or infer; web-app default base is `staging`).
- **Working tree** → `git diff` (and staged) vs the base branch.

Establish the base once and compute the net diff with the three-dot form so you review only
this branch's changes:

```
git diff --stat <base>...HEAD
git diff <base>...HEAD            # the authoritative diff for the review
git log --oneline <base>..HEAD    # commits, to understand intent
```

If the diff is large, persist it and read it from the file rather than re-running `git diff`
repeatedly.

## Pass 1 — explain + fix inline

Go through the diff in **logical order** (foundation/plumbing first, then consumers, then
tests), not necessarily file-alphabetical. For each change:

1. **Explain** in plain language: what it does, why it's there, and how it connects to the rest
   of the change. Reference `file.ts:line`.
2. **Judge correctness as you go.** Actively look for: behavioral divergence from what was
   replaced, broken/edge-case paths, type holes, unused/dead imports, missing returns, leaked
   scope, parity gaps between "old" and "new" code, and anything that contradicts the PR's
   stated intent.
3. **If you find a real issue → fix it now.**
   - Make the minimal correct edit.
   - Verify it (run the narrowest relevant tests; lint/format the touched files; honor any
     repo rule about how to typecheck — e.g. some repos forbid running `tsc` directly and
     expect you to verify types by reading. Respect `commit-hang-guard` and
     `lint-in-ignored-worktree` if present).
   - Commit it (conventional commit message; one logical fix per commit is fine, or batch
     tightly-related fixes). End commit messages with the repo's required trailer.
   - **Re-explain the corrected code** so the human sees the fixed version, not the broken one.
4. Maintain a running **issues table**: `severity | issue | file:line | status (fixed/​open)`.

Distinguish *issues you fix* (correctness, build, parity, dead code) from *judgment calls*
(cosmetic inconsistencies, optional cleanups, scope-expanding refactors). For judgment calls,
surface them and ask the human via `AskUserQuestion` rather than unilaterally applying — unless
they've said "fix everything".

At the end of Pass 1: branch builds/tests/lints clean, issues table is complete, and every hunk
has been explained.

## Pass 2 — per-file subagent re-explanation, then synthesize

Once Pass 1 is done **and all fixes are committed** (the subagents must read the corrected code):

1. **List the final changed files** vs base (`git diff --name-only <base>...HEAD`), including
   files you touched while fixing.
2. **Fan out one read-only subagent per file, in a single message** so they run concurrently.
   Use a read-only agent type (e.g. `Explore`, or `general-purpose` told not to edit). Each
   subagent's brief:

   > Explain the final state of `<file>` as changed in this branch vs `<base>`.
   > - Run `git diff <base>...HEAD -- <file>` and read the file as it is now.
   > - For each hunk: what changed and why it's there in plain language.
   > - **Dependency tree (only where it's needed to justify a change):** when a change's
   >   correctness depends on other code, trace it — the function/​type/​constant it calls or
   >   implements, who calls *this* code, the interface/schema it must satisfy, any config/CI
   >   gate it must pass. Read those other files as needed and state the relevant signatures so
   >   the change can be judged without guessing. Skip the tree for self-contained changes.
   > - Flag anything that still looks wrong, risky, or inconsistent (do NOT edit — report only).
   > - Return structured text: per-hunk explanation, the dependency facts you verified, and a
   >   short risk note. Your output is consumed by the lead reviewer, not shown directly to a
   >   human.

   Give each subagent the base ref, the file path, and the PR's stated intent. Spawn them all
   at once; one Agent call per file.

3. **Synthesize.** Collect every subagent report and merge into **one** second, post-fix
   line-by-line review for the human, ordered the same logical way as Pass 1. The synthesis:
   - explains each file's final changes with the dependency context the subagents verified
     (inlined where it aids understanding — don't make the human chase it);
   - resolves overlaps/contradictions between subagent reports (cross-file changes get one
     coherent narrative, not N partial ones);
   - re-states the issues found in Pass 1 with their final status;
   - lists any *new* concerns the subagents surfaced — and if any are real, **fix + commit +
     re-explain that part**, then update the synthesis (the human should never read a review of
     code you know is wrong);
   - ends with an explicit safety verdict (is it behavior-equivalent / safe to merge?) and the
     CI/test status.

## Finishing

- Do not push during the review unless the user has said to. If they want to approve first,
  hold the push and present the synthesized review, then push on their go-ahead and (if useful)
  watch CI to green.
- Keep the final output skimmable: a short verdict + issues table up top, the per-file
  line-by-line narrative below.

## Guardrails

- The subagents are for **explanation and verification only** — all fixing happens in Pass 1 in
  the main agent, so the tree they read is already correct.
- Never present an explanation of code you know is broken; fix first, then explain the fix.
- Prefer the smallest correct change; don't smuggle refactors into a review.
- Faithfully report test/lint/build outcomes — if something is skipped or still failing, say so.
