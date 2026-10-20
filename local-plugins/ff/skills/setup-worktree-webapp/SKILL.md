---
name: setup-worktree-webapp
description: Set up a dedicated git worktree of the Fyxer web-app so a branch can run locally, using the repo's own worktree scripts (create the worktree, pnpm worktree:setup, check auth, hand over the worktree:functions and worktree:app commands). Use when the user wants to run or test a web-app branch locally in an isolated worktree, or says "set up a worktree for <branch>", "run this branch locally", "spin up a local env", "/setup-worktree-webapp".
---

# Set up a web-app worktree for local run

Creates a **dedicated worktree** (under the `worktreeRoot` option, else beside the main checkout) so a branch can run locally without touching the main checkout, which other agents may switch out from under you. The repo's `pnpm worktree:*` scripts copy the env files, install, build, and give each worktree its own free port slot, so several worktrees can run at once. `docs/local-development.md` ("Linked worktrees") is the source of truth; follow it where it and this skill disagree.

## Inputs
- **branch** (required) — from `$ARGUMENTS`, e.g. `<prefix>/streaming-vis-chat`.
- **worktree name** (optional) — short dir name; default to a slug of the branch.

## Paths

Run this from inside any worktree of the repo, then reuse `$NEW` in the steps below:
```bash
TREES_ROOT=$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/resolveWorktreeRoot.sh" '${user_config.worktreeRoot}')  # worktreeRoot option, else beside the main checkout
NEW="$TREES_ROOT/<name>"                                                     # the new worktree to create
```

## Steps

1. **Create the worktree** (from any existing worktree of the repo):
   - `git worktree add "$NEW" <branch>`
   - If the branch is only on origin: `git worktree add "$NEW" -b <branch> origin/<branch>`
   - If git says the branch is already checked out elsewhere, reuse that worktree instead.

2. **Set it up:** `cd "$NEW" && pnpm worktree:setup`. It copies `app/.env.local`, `functions/.env.local` and `functions/.secret.local` from the primary checkout, then installs and builds under the machine-wide lock, so a second setup waits for the first. If it reports a required env file missing, stop: the user gets it from 1Password as `docs/local-development.md` describes.

3. **Verify auth — do NOT run `pnpm auth` in a non-interactive session.** `pnpm auth` = `firebase login --reauth && gcloud auth application-default login`, which is interactive browser OAuth and fails with "Cannot run login in non-interactive mode" (the `--reauth` forces a fresh login). Instead check cached creds:
   ```bash
   firebase login:list
   gcloud auth list --filter=status:ACTIVE --format="value(account)"
   gcloud auth application-default print-access-token >/dev/null 2>&1 && echo "ADC valid" || echo "ADC missing"
   ```
   If all show valid creds for the user, the servers run without re-auth. If any are missing/expired, tell the user to run `pnpm auth` themselves in an interactive terminal.

4. **Hand the user the two dev-server commands** (run in separate terminals, or via `run_in_background`):
   ```bash
   cd "$NEW" && pnpm worktree:functions   # emulators on the first free port slot; prints the URLs
   cd "$NEW" && pnpm worktree:app         # Vite on the same slot; prints the app URL
   ```
   Use the URLs they print. Ports differ per worktree, so never assume 5173 or 4000.

5. **Before removing the worktree**, run `cd "$NEW" && pnpm worktree:stop`. It stops this worktree's emulators (exporting their data) and its Vite server.

## Gotchas
- Cloud Tasks, the Gmail listener and the Microsoft tunnel are off in worktree mode. Use the primary checkout for flows that need them.
- The local Firebase emulator **buffers SSE**, so dashboard chat appears one-shot (no incremental streaming) locally even when the code streams fine deployed — not a bug.
- To confirm the emulators booted without a foreground `sleep`, start a background `until` loop polling the emulator UI URL that `worktree:functions` printed.
- Do feature work and long-running servers in this dedicated worktree, never in the main checkout.
