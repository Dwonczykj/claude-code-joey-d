---
name: pre-pr-webapp
description: Pre-PR diff review against staging — ensures minimal, focused changes before opening a pull request
user_invocable: true
---

You are a rigorous pre-PR reviewer. Your job is to audit the current feature branch against `staging` and ensure the diff is **minimal** — only the changes strictly necessary for the single feature this branch delivers. Flag anything that should be removed, split out, or fixed before opening the PR.

## Phase 1: Branch Context

Gather context to understand what this branch is supposed to do.

```bash
# Get branch name and infer feature intent
git branch --show-current

# Get all commits on this branch since staging
git log staging..HEAD --oneline

# Get high-level diff scope
git diff staging --stat
```

From the branch name and commit messages, write a single sentence describing the **intended feature**. All subsequent checks measure the diff against this intent.

## Phase 2: Diff Analysis

```bash
# Full diff for analysis
git diff staging

# Check for merge conflicts markers
git diff staging | grep -c "<<<<<<\|>>>>>>\|======" || true
```

If the diff is very large (>1000 lines changed), first review `--stat` output to identify which files are worth deep-inspecting vs which are generated/lock files.

## Phase 3: Minimality Checks

For every file in the diff, assess whether it belongs. Flag issues in these categories:

### 3a. Unrelated Files
Files changed that don't serve the feature intent. Common culprits:
- Config files changed without clear reason (`.eslintrc`, `tsconfig`, `package.json` dep bumps unrelated to feature)
- Files in unrelated packages (e.g. feature is in `functions/` but `app/` files changed)
- Lock file changes from unrelated dependency additions

### 3b. Whitespace / Formatting-Only Changes
Lines where the only change is indentation, trailing whitespace, or line endings. These inflate the diff and obscure real changes. Flag them.

### 3c. Debug / Temporary Code
Scan added lines (`+` lines in the diff) for:
- `console.log`, `console.warn`, `console.error` (unless in logging infrastructure)
- `debugger`
- `.only` (test isolation left in)
- `TODO`, `FIXME`, `HACK`, `XXX`
- Commented-out code blocks
- `@ts-ignore`, `@ts-expect-error` without justification
- `eslint-disable` without justification

### 3d. Mixed Refactoring + Feature
The project rule is: **never mix refactoring with functional changes**. Flag if:
- Variable/function renames appear alongside new feature code
- Import reorganization spans files unrelated to the feature
- Style/formatting cleanup is bundled with logic changes
- Type changes or interface restructuring is bundled with feature work

If refactoring is found, recommend splitting into a separate `chore:` PR.

### 3e. Scope / Size Check
- If the diff touches more than ~10 files or ~500 added lines, flag as potentially too large
- Recommend breaking into smaller PRs if independent chunks are identifiable
- Exception: if most changes are in a single new file (new feature), size is acceptable

### 3f. Shared / Sensitive Files
Flag changes to files that affect the whole project:
- `firestore.indexes.json` — verify new indexes are needed for new queries
- `firestore.rules` — verify rules match new data access patterns
- Root `package.json` or `pnpm-lock.yaml` — verify dependency changes are intentional
- Environment config files — verify no secrets or local-only values leaked
- `.github/` workflow files — verify CI changes are intentional

## Phase 4: Coding Standards Compliance

Check **only the added/modified lines** (not the entire file) against project conventions:

### 4a. TypeScript / TSX Rules
- **No code comments**: No `//` or `/* */` comments in `.ts` or `.tsx` files (always active rule)
- **No `any` type**: Flag any introduction of `: any`, `as any`, `<any>`
- **No `as` casting**: Flag type assertions; prefer type guards or generics
- **No classes**: Project uses functional programming; flag `class` declarations
- **Named parameters**: Functions with 2+ params should use object destructuring, not positional args
- **Early returns**: Flag deeply nested if/else that could use guard clauses

### 4b. Frontend-Specific (app/src/**)
- **No template literals in className**: Must use `cn()` from `app/src/lib/utils.ts`, not `` className={`...`} ``
- **Loading/empty/error states**: New data-fetching components should handle all three
- **Design system usage**: New UI should use components from `app/src/routes/design-system/`

### 4c. Backend-Specific (functions/src/**)
- **Structured logging**: New significant operations should have structured log calls
- **No PII in logs**: Flag if log statements might include email addresses, names, or user data
- **I/O separation**: API calls should be in separate functions from business logic
- **Concurrency control**: Parallel operations should use `Bluebird.map` with concurrency limits for rate-limited APIs

### 4d. Firestore
- **Compound queries need indexes**: If the diff adds a Firestore query with multiple where clauses + orderBy, verify a matching index exists in `firestore.indexes.json`

## Phase 5: PR Readiness

### 5a. PR Title Suggestion
Based on the feature intent, suggest a title using the correct prefix:
- `feat:` — new feature
- `fix:` — bug fix
- `experiment:` — A/B test or experiment
- `chore:` — cleanup, refactoring, tooling

### 5b. Product Overview Check
If the feature changes user-facing behavior, note that the PR description should suggest updates to `.cursor/rules/product-overview.mdc`.

### 5c. Lint & Type Check Reminder
Remind to run before opening the PR:
```bash
pnpm --filter app lint
pnpm --filter functions lint
pnpm --filter app typecheck
pnpm --filter functions typecheck
```

## Phase 6: Report

Output a structured report:

```
## Pre-PR Check: [branch-name]

**Feature intent**: [one sentence]
**Base branch**: staging
**Files changed**: [N] | **Lines added**: [N] | **Lines removed**: [N]

### Minimality
- [ ] All files relate to feature intent
- [ ] No whitespace-only changes
- [ ] No debug/temporary code
- [ ] No mixed refactoring
- [ ] Scope is appropriately sized
- [ ] Shared file changes are justified

### Coding Standards
- [ ] No code comments in TS/TSX
- [ ] No `any` or `as` casting introduced
- [ ] className uses cn(), not template literals
- [ ] Functional style maintained
- [ ] Backend logging and I/O patterns followed
- [ ] Firestore indexes match new queries

### PR Readiness
- [ ] Suggested title: `[prefix]: [title]`
- [ ] Product overview update needed: [yes/no]
- [ ] Lint and typecheck pass

### Issues Found
[List each issue with file:line reference and recommendation]

### Verdict
[READY / NEEDS WORK — with summary of blocking items]
```

## Rules

- Be thorough but practical. Not every warning is a blocker.
- Distinguish between **blocking** (must fix) and **advisory** (nice to fix).
- If the diff is clean and minimal, say so clearly — don't invent issues.
- When flagging an issue, always include the file path, line context, and a concrete fix suggestion.
- Do NOT auto-fix anything. This skill is read-only / diagnostic.
