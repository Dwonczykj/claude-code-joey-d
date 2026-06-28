---
name: prune-merged-worktrees
description: Clean up git worktrees in three tiers against a base branch (default `staging`). Auto-removes worktrees whose every commit is already merged AND have a clean tree; then asks before deleting unmerged-but-clean worktrees (summarising each branch's unmerged commit messages so the user can decide to resume or drop); then asks about worktrees with uncommitted changes (summarising the dirty diff so the user can judge if it's stale and `--force` remove). Use when the user says "delete merged worktrees", "prune worktrees", "clean up worktrees", or "remove worktrees merged into staging".
---

# Prune Merged Worktrees

Safely clean up `git worktree`s in three tiers. Never delete uncommitted or unmerged work without explicit confirmation.

## Base branch

Default base is `staging`. If the user names another base (e.g. `main`), use that. Always `git fetch origin <base>` first and compare against `origin/<base>`.

## Definitions

For each worktree (excluding the main/current one the session runs in):
- **HEAD** = `git -C <wt> rev-parse HEAD`
- **branch** = `git -C <wt> symbolic-ref --short HEAD` (may be detached)
- **merged** = `git merge-base --is-ancestor <HEAD> origin/<base>` succeeds (every commit is in base)
- **clean** = `git -C <wt> status --porcelain` is empty
- **ahead commits** = `git -C <wt> log origin/<base>..HEAD --oneline`

Note: ancestor check does NOT detect squash-merges. A squash-merged branch shows as "not merged" but its `git diff origin/<base>...HEAD` is empty (content already in base). Treat empty-diff branches as effectively merged.

## Procedure

### Step 0 — enumerate and size

```bash
git fetch origin <base>
git worktree list --porcelain
du -sh ~/FyxerGh/fyxer-web-app-trees/* 2>/dev/null | sort -h
```

Build the table of worktrees with: branch, merged?, clean?, ahead-count, empty-diff?, size-on-disk. Skip the main worktree (the one this session is running in).

Note: most of the disk bulk per worktree is its own `node_modules` checkout — removing a worktree reclaims that. Committed history is NOT lost; branches survive intact in the main repo.

### Tier 1 — merged + clean → auto-remove

Worktrees that are **merged AND clean** (or **empty-diff AND clean**) are safe to delete with no data loss. Remove them directly and report what was removed:

```bash
git worktree remove "<wt>"
# NOT rm -rf — git tracks worktree metadata; deleting the folder by hand
# leaves dangling refs. Use git's own command so metadata stays consistent.
```

Report the list grouped sensibly (by PR/ticket prefix if obvious).

After all Tier 1 removals, sweep dangling metadata left by any worktrees that were already deleted manually in the past:

```bash
git worktree prune
```

### Tier 2 — unmerged + clean → ASK first

Worktrees that are **NOT merged but clean** (have committed work not in base). These are safe to delete (nothing uncommitted) but represent real work. For EACH such worktree, summarise the unmerged commits so the user can decide:

```bash
git -C "<wt>" log origin/<base>..HEAD --oneline
```

Present a per-worktree summary: branch name + its unmerged commit subjects (a one-line reminder of what the work is). Then use **AskUserQuestion** (multiSelect) to let the user pick which of these worktrees to delete vs keep. Only remove the ones they select. This summary doubles as a record of work to resume or a branch to drop.

### Tier 3 — uncommitted changes → ASK first, may need --force

Worktrees with a **dirty tree**. For EACH, summarise the uncommitted diff so the user can judge whether it is stale junk or work worth keeping:

```bash
git -C "<wt>" status --porcelain
git -C "<wt>" diff --stat
git -C "<wt>" diff          # show enough to judge; truncate huge diffs
```

Filter out noise (e.g. `.claude/settings.json`, build artifacts) when describing. Present a per-worktree summary of what the dirty changes actually do. Then use **AskUserQuestion** to ask, per worktree, whether to `--force` remove (changes are stale/unwanted) or keep. Removing a dirty worktree requires:

```bash
git worktree remove --force "<wt>"
```

## Rules

- Always use `git worktree remove` (not `rm -rf`). Deleting the folder by hand leaves dangling metadata in `.git/worktrees/`; git's own command cleans it up properly.
- Run `git worktree prune` after Tier 1 to sweep stale metadata from any worktrees already deleted manually.
- Never `--force` remove without explicit per-worktree confirmation.
- Never delete the main/current worktree.
- Tier 1 is the only auto-action; Tiers 2 and 3 always ask.
- Prefer one `AskUserQuestion` per tier with multiSelect over many small prompts.
- After all tiers, print a final summary: removed (with approx disk reclaimed), kept, and why.
- Use `git -C <path>` rather than `cd` to avoid permission prompts.

## Fast path one-liner

Shows every worktree path next to its branch for a quick inventory:

```bash
git worktree list --porcelain | awk '/^worktree /{w=$2} /^branch /{print w, $2}'
```
