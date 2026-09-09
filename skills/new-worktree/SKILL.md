---
name: new-worktree
description: Create a branch (via create-branch's naming convention, based on origin/staging if it exists else main/master/a branch you choose), spin up a dedicated sibling git worktree for it, and set the worktree's standing goal — open a PR back to that base branch (via create-pr) once the work is done. Use when the user asks to start work in a new worktree, wants an isolated branch+worktree for a fresh task, or says "/new-worktree", "new worktree for X", "spin up a worktree".
---

# new-worktree

Creates a branch and a dedicated sibling worktree for it, then hands off with one standing goal: **when the work in this worktree is done, open a PR into the base branch** (via `create-pr`).

## Step 1: Determine the base branch

```bash
git fetch origin --quiet
git ls-remote --exit-code --heads origin staging >/dev/null 2>&1 && echo has-staging || echo no-staging
```

- If `origin/staging` exists → base = `staging`.
- Otherwise ask via `AskUserQuestion`:
  - Question: "No `staging` branch on origin. Which branch should the worktree be based on?"
  - Options: `main (Recommended)`, `master` — the built-in "Other" choice covers any other branch name the user types.
  - base = whatever the user picks or types.

## Step 2: Create the branch

Follow the `create-branch` skill's naming convention — `joeydwonczyk/<type>-<LINEAR-CODE>-<kebab-title>` — but override its own base-branch lookup (its step 2, which derives base by repo) with the base from Step 1. Work out `type`/`LINEAR-CODE`/`kebab-title` the same way that skill does.

```bash
git fetch origin && git switch -c joeydwonczyk/<type>-<CODE>-<title> origin/<base>
```

If the working tree is dirty, stop and ask before doing anything that would move those changes. Never stash or discard without being told to.

## Step 3: Create the worktree

Sibling worktrees live next to the repo root, under `<repo-parent>/<repo>-trees/` (matches the existing layout, e.g. `/Users/joey/FyxerGh/fyxer-web-app-trees/`):

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
PARENT=$(dirname "$REPO_ROOT")
git worktree add "$PARENT/<kebab-title>" joeydwonczyk/<type>-<CODE>-<title>
```

If the repo is `Fyxer-AI/web-app`, continue with `setup-worktree-webapp`'s steps 2–6 (copy `.env.local`/`.secret.local` files, `pnpm i`, build functions, free emulator ports) so the worktree is actually runnable — don't stop at a bare `git worktree add`. For any other repo, just install deps (`pnpm i` / `npm i`, whichever the repo uses).

## Step 4: Set the worktree's goal

Report the worktree path, branch, and base, and state the one instruction that governs the rest of the work there:

> Goal: once the work in this worktree is complete, run `/create-pr` to open a PR from `joeydwonczyk/<type>-<CODE>-<title>` into `<base>`.

Do not open the PR now — there is no work yet. This is a standing instruction for whoever (or whichever agent) finishes the work in that worktree, not an action to take immediately.

## Notes

- Never push, and never create the PR as part of this skill — `create-pr` does that later, once the work is actually done.
- Reuse `create-branch`'s naming convention and `setup-worktree-webapp`'s environment bootstrap rather than reimplementing either here.
