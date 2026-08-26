---
name: pr-feature-bullets
description: List what a PR implements as short, non-sentence bullet points grouped by concern, derived from the diff rather than the commit messages. Use when the user asks "what does this PR do", "list the features in PR X", "summarise this PR as bullets", "add an implemented list to the PR description", or "/pr-feature-bullets".
---

# PR feature bullets

Produce a scannable inventory of what a PR actually changes. Optimised for a reviewer deciding where to look, and for pasting into a PR description.

## Resolve the PR

- Explicit number or URL → use it.
- Nothing given → `gh pr view --json number,baseRefName,headRefName` for the current branch.
- No PR yet → diff the current branch against its intended base and say the PR doesn't exist yet.

## Derive from the diff, not the commit log

Commit messages describe intent at the time of writing. They go stale when later commits in the same PR reverse or reshape an earlier one — common on a branch that has been through review.

```bash
gh pr diff <number>
gh pr view <number> --json baseRefName --jq .baseRefName   # then: git diff --stat <base>..<head>
```

Read the diff. Use commits only to understand *why* something changed, never as the source of *what* changed.

For a stacked PR, diff against its actual base branch, not `staging`, or you will attribute the parent's work to this PR.

## Grouping

Group by concern, not by file. Concerns emerge from the diff — do not force a fixed taxonomy. Common ones:

- the trigger or entry point that moved or changed
- new self-contained capability
- data model / schema
- concurrency, locking, dedup
- what was removed
- what deliberately stayed the same

Bold group headers. 2-6 bullets each. If a group has one bullet, fold it into another.

## Bullet style

- Non-sentence fragments. No leading article, no trailing full stop.
- Identifiers in backticks: functions, constants, collections, fields, flags.
- `→` for a move, a transition, or a consequence.
- Include the value when a number or literal changed: `` `X = 300` removed ``, not "removed the threshold".
- One fact per bullet. Split rather than joining with "and".
- Parenthetical for the *why* only when the bullet is otherwise unreadable, e.g. `(not detached — gen-2 CPU throttling)`.

Avoid: "Added support for…", "Refactored…", "Improved…", "Various…". Say the concrete thing.

## Caveats section

Add a short `## Caveats` group when any of these are true. Do not invent one to look thorough.

- untested against real data or a real environment
- a value chosen without evidence
- a behavioural change in blast radius, e.g. a feature going from never running to running for everyone
- a known coupling or assumption left in deliberately

These are the bullets a reviewer most needs and the ones most often omitted. Never drop a caveat to make the list read better.

## Output

Default: print the bullets in chat.

If asked to put them in the PR description, `gh pr edit <number> --body` with the **full** new body — `--body` replaces, it does not append. Read the current body first (`gh pr view <number> --json body --jq .body`) and preserve what is there, inserting the bullets under an `## Implemented` heading. Keep any existing trailer such as a Linear link or a generation footer at the bottom.

## Example

```
**Trigger**
- Tone synthesis moved off `handleEmailBackfillCompleted` → `setupEmailConnection`
- First email connection per member only
- Awaited, concurrent with `fetchUserIndustry` (not detached — gen-2 CPU throttling)

**Concurrency / dedup**
- Claim moved `EmailConnectionSetupStatus` (per-connection) → `Membership` (per-member)
- Single-document transaction — closes the double-send race

**Removed**
- `TONE_SYNTHESIS_MIN_EMAIL_COUNT = 300` (backfill proxy)
```
