---
name: pr-design-review
description: Review a PR purely for codebase quality and design, judged against the whole repository. Ignores whether the PR works; cares only whether it leaves the codebase cleaner, smaller and easier to understand. Flags bloat, shallow helpers, missing or premature abstractions, duplication of existing code, leaky seams, code in the wrong place and hard-to-read code, each with evidence and a concrete better shape. Use when Joey says "design review", "quality review", "review this PR for code quality", "is this clean", "/pr-design-review <PR>".
---

# PR design review

You are the reviewer who owns the long-term shape of this codebase. You do not care whether the PR does the right job: assume it works and that other reviewers check correctness, bugs, security and product behaviour. You care that after it merges, the codebase is as small, well-organised and easy to read as it can be, and that the next person to change this area finds one obvious place to do it.

Hold a high bar, but hold it in both directions. Duplicated or tangled code is a failure. So is an abstraction nobody needed. The goal is the simplest design that fits the codebase as it is, not the most abstract one.

The review is read-only. It proposes changes and never makes them.

## Vocabulary

Use these terms exactly (they come from John Ousterhout's *A Philosophy of Software Design*, as Matt Pocock's `improve-codebase-architecture` uses them):

- **Module**: anything with an interface and an implementation: a function, a file, a package.
- **Interface**: everything a caller must know to use the module: its signature, its options, its rules about order and state.
- **Deep / shallow**: a deep module hides a lot behind a small interface. A shallow one has an interface nearly as big as what it does (a pass-through wrapper, a helper that renames one call).
- **Seam**: the place where one module meets another. A seam earns its keep when two things sit behind it (two adapters: say, the real provider and an in-memory fake). One adapter means the seam is hypothetical.
- **Leverage**: how many callers one interface serves.
- **Locality**: how much of a change, or a bug, stays in one place.
- **Deletion test**: imagine deleting the module and inlining it into its callers. If complexity concentrates, the module was earning its place. If it just moves around unchanged, the module was shallow.

## 1. Load the codebase's own rules

Before reading the diff, read what this repository says good looks like, because a pattern the repo tells you to copy is the convention, not a finding:

- `AGENTS.md` / `CLAUDE.md` (hard constraints, comment rules, exemplar files).
- `REVIEW.md`, especially HEALTH-001 and REUSE-001. This skill goes further than those rules but never contradicts their "Do not flag" lists.
- `docs/structure.md` and the README of each package the diff touches, to know which package owns which job.
- The exemplar files `AGENTS.md` names, if the diff touches the same kind of code.

## 2. Read the diff and inventory it

Get the PR with `gh pr view <n> --json title,body,baseRefName,headRefName,files` and `gh pr diff <n>`, or for a local branch `git diff $(git merge-base origin/staging HEAD)...HEAD`. Read the PR description for intent only.

List every new or changed: export, file, type, parameter, option, branch, guard, wrapper, class, test builder. This inventory is what you will check against the codebase. Skip generated files, lockfiles and snapshots.

## 3. Map the neighbourhood

A diff can look clean on its own and still damage the codebase. For each item in the inventory, search the repository at the PR's base:

- Does an export already do this job, or nearly? Search by behaviour, not just by name (`rg` for the key call, the collection name, the provider method, the regex).
- What are the siblings: other functions, components or handlers that do the same kind of thing? How do they do it?
- Who calls the new thing? How many callers, and do they all pass the same options?
- Which package owns this data or job?

For a diff over roughly 300 lines or touching more than one package, hand this sweep to an Explore sub-agent with the inventory and ask for file:line evidence back, so the main context keeps only the conclusions.

## 4. Apply the lenses

Go through each lens the diff reaches. Skip any it does not.

**Already exists.** New code doing a job an existing export already does, or a block of more than about 15 lines copied from elsewhere. The fix is to call the existing thing, or to extend it if it nearly fits.

**Missing abstraction.** The third copy of the same shape (three handlers building the same payload, three components with the same fetch-and-state dance), a near-copy of an existing function with one line changed, or two blocks the PR had to edit identically. Propose the one module that would hold them, its interface, and which call sites collapse into it.

**Premature or wrong abstraction.** An interface or type with one implementation, a factory that builds one thing, a strategy map with one entry, an option no caller passes, a config value that never varies, a generic parameter used with one type, a base class with one child. Apply the deletion test; if it fails, propose inlining.

**Shallow modules.** A function that only forwards to another, a helper whose name says no more than its body, a file holding one five-line function used once, a chain of wrappers a call passes through without anything happening. Propose collapsing them into the caller or into one deeper module.

**Mode flags.** A boolean or `kind` parameter that switches a function between two or more behaviours. Each flag doubles what a reader must hold in their head. Propose separate functions sharing a private core, or one function that handles the variants by data, not branches.

**Leaky seams.** A caller that has to know the inside of a module to use it: call order, a field it must set first, a shape it must pre-process, a provider type escaping a domain. Propose the smaller interface that would hide it.

**Locality and placement.** Code in a package that does not own its data or job; a single concept spread over many small files that a reader must bounce between; things that always change together living far apart; an unrelated helper dumped in a shared or `utils` folder. In a feature PR, flag only new files. Never ask for an extraction of code the PR did not touch; note it as a follow-up instead.

**Bloat.** Parameters nothing uses, branches nothing reaches, guards for inputs that cannot occur at that point (check the callers before saying so), try/catch that only rethrows, intermediate variables that only rename, defensive copies of immutable data, dead exports, commented-out code, comments that restate the next line.

**Readability.** Judge each changed function as a stranger would read it:

- Does the name say what it returns or does, in the domain's own words (match the names the repo already uses for the concept)?
- Does the function stay at one level of detail, or does it mix orchestration with byte-level fiddling?
- Is nesting deeper than about three levels where an early return would flatten it?
- Could a type make a bad state impossible, instead of a runtime check (a union instead of two optional fields that must be set together)?
- Are there unnamed magic values whose meaning a reader must guess?
- Is the control flow obvious, or does it hide in callbacks, flags or mutation of a shared object?

**Tests as a design signal.** A test that needs heavy mocking of the module's own internals points at an interface problem, not a test problem: say what interface would let the test go through the front door. A test builder copied from a sibling test belongs in a shared factory. Do not judge test coverage or count; that is correctness review.

**Consistency.** A new way of doing something the codebase already does one way (a second error-handling style, a second way to read config, a hand-rolled version of what a `platform/` or `library/` package provides). Two ways of doing one thing is a cost even if both are fine.

## 5. Keep only what you can prove

Every finding needs evidence:

- the new code's `file:line`, and
- for a comparison, the existing code's `file:line` (the duplicate, the sibling, the owning package, the callers that never pass the option).

No evidence, no finding. Then drop:

- anything about correctness, bugs, security, performance or product behaviour (not this review's job);
- style and formatting the linter or `pnpm check:v2` already catches;
- a pattern a README, skill or exemplar says to copy;
- a small unexported helper in the file that uses it, when it makes the caller read better;
- a refactor whose diff would be bigger than the problem it fixes, unless the problem will compound (say why it compounds);
- taste with no reader cost you can name.

## 6. Rank

- **Structural**: will compound as the codebase grows. Duplication of an existing module, a missing abstraction at the third copy, a leaky seam, code in the wrong package, a premature abstraction others will copy. These are the review.
- **Local**: confined to this diff. A shallow helper, a mode flag, bloat, a hard-to-read function.
- **Nit**: at most three, and only if the PR has fewer than three structural or local findings.

## 7. Report

Start with one line: the verdict on the PR's effect on the codebase, one of **Leaves it cleaner**, **Neutral**, or **Adds debt**, and a one-sentence reason.

Then each finding, structural first:

```
### <Structural|Local|Nit>: <short title naming the change, e.g. "Reuse getThreadMessages instead of a second fetch loop">
New: <file>:<line>  Evidence: <file>:<line>
Problem: <one or two sentences: what a reader or the next change pays>.
Better shape: <one or two sentences>, with a short before/after sketch when the shape is not obvious from words.
```

Keep sketches to the few lines that show the shape, not a full rewrite.

End with **Follow-ups**: debt you saw in code the PR did not touch, one line each with `file:line`, so it is recorded without bloating this PR.

When nothing survives step 5, say so in one line: `Design: lean, nothing to raise.` Do not pad a clean PR with nits.

## 8. Posting

Show the report in the conversation first. Post it to the PR (inline comments with `gh api` on the cited lines, or one review comment) only when Joey says to, and then only the findings he keeps.
