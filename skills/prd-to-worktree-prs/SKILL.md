---
name: prd-to-worktree-prs
description: Turn a Linear PRD into minimal-diff sub-task PRs implemented by sub-agents in separate worktrees. Use when given a Linear issue/PRD link and asked to break a feature into small PRs, plan sub-tasks, spec the work, or spawn agents to deliver it off origin/staging.
---

# PRD → minimal-diff sub-task PRs

Read a Linear PRD, divide the feature into the smallest possible PRs, write a spec
for each, get the user to approve each spec, then spawn sub-agents (in separate
worktrees) to implement them in the right order.

## Workflow

1. **Worktree.** Confirm you're in (or create) a worktree branched off `origin/staging`.
   If already in a worktree, say so and continue — don't create a nested one.

2. **Read the PRD.** Fetch the Linear issue via the Linear MCP `get_issue` (id like
   `PRE-2786`, parsed from the link). Read the full description — goals, non-goals,
   any author-proposed PR breakdown, codebase-context file list, open questions.

3. **Ground the plan in the code.** Spawn read-only `Explore` agents (parallel, one per
   layer — e.g. backend/endpoint, resolution/logic, client) to read the exact files the
   PRD references. Report shapes with `file:line`. Verify the PRD's assumptions against
   what's actually there before trusting its breakdown.

4. **Find the dependency graph + coupling traps.** Before finalizing PRs:
   - What must merge first? (shared types, schemas, enums).
   - **Compile-time coupling:** adding to a shared union/enum forces every exhaustive
     `switch` (`assertNever`) to be updated in the *same* PR or the package won't
     typecheck. Don't split a change the type system won't let you split.
   - Which PRs touch disjoint files (→ can run in parallel) vs overlap (→ sequence them).

5. **Divide into minimal PRs.** Goals, in priority order:
   - Smallest diff that ships something coherent and compiles on its own.
   - Fewest files changed; **reuse existing helpers/patterns** over new abstractions.
   - Mirror the nearest existing implementation rather than inventing one.
   - Each PR independently reviewable; note new vs edited files and an approximate count.

6. **Ask clarifying questions.** Only genuine forks the user must decide (product
   behavior, branch strategy, scope edges) — use `AskUserQuestion`, recommended option
   first. State derivable assumptions inline instead of asking. If the PRD says open
   questions are resolved, trust it.

7. **Write specs — one per PR.** Present inline for review. Each spec:
   - Branch base (off `staging`, or stacked on a prior PR's branch when dependent).
   - Files: new vs edited, exact change per file with `file:line` anchors.
   - Reuse callouts (which existing function/pattern is mirrored).
   - Acceptance criteria (targeted `pnpm --filter <pkg> typecheck`/`lint`, observable behavior).
   - **Discovery items:** anything the implementer must find first; tell them to flag
     back rather than invent.

8. **Approval gate.** Get the user to approve **each** spec before any code is written.
   Do not spawn implementation agents until specs are approved.

9. **Spawn agents to deliver.** Order by the dependency graph:
   - Sequential when one PR's branch is the base for the next (stacked).
   - Concurrent when PRs touch disjoint files — send them in one message, multiple
     `Agent` calls, each with `isolation: "worktree"`.
   - Staged: foundation PR first; once its branch exists, fan out the dependents.
   - Give each agent the full approved spec, its branch base, and the acceptance criteria.

10. **Gate before opening, don't open straight from step 9.** A build agent finishing
    does not mean the diff is ready — run `pre-pr-gate`'s three Codex passes (contract vs
    spec, code-quality/DRY/concurrency, test-mock scrutiny) or the equivalent loop in
    `solve-in-worktrees` Phase 4-5 against each worktree before pushing and opening the
    PR. Skipping this step is how a build agent's own mocked tests hide a real bug all
    the way to the PR.

## Conventions (Fyxer)

- Base branch is `staging`; PR titles `feat:` / `fix:` / `chore:` / `experiment:`.
- Don't run repo-wide `tsc --noEmit` — verify types by reading the diff and running
  focused `pnpm --filter <pkg> typecheck`.
- Linting from a worktree under `.claude/` silently skips files — see the
  `lint-in-ignored-worktree` guidance before trusting a clean `pnpm lint`.
- Follow `coding-standards` / `backend-standards` / `frontend-standards`: minimal code,
  reuse `@fyxer-ai/shared` helpers, no comments.
