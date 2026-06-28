---
name: test-local-fyxer
description: Prepare the local Fyxer web-app environment (auth, install, build, dev servers) and then delegate a browser test of a specific feature to the `test-local` subagent. Use when the user asks to "test this locally", "run the test-local agent", "check if it works for my user", or verify a web-app change end-to-end in the running app on this machine.
---

# Test a Fyxer web-app feature locally

This skill brings the local environment up to date, makes sure the dev servers are running, then hands a concrete test spec to the `test-local` subagent (which drives Playwright and only observes — it does not build or start servers).

Work from the **fyxer-web-app worktree you are currently in**. All `pnpm` commands run from the repo root of that worktree.

## Inputs to gather first

Before running, make sure you know:
- **Feature under test** — what changed and what user-visible behaviour to verify.
- **Test user email** — the emulator account to sign in with (the user usually names it, e.g. `joey.dwonczyk.fyxer@gmail.com`).
- **Routes** — the specific routes the test should visit (e.g. `/org/:orgId/dashboard`, an email-thread chat surface).
- **Success criteria** — what "passing" looks like.

If any of these is missing and not obvious from the conversation, ask before proceeding.

## Step 1 — Prerequisites (idempotent; skip what you already did this session)

Run these from the worktree repo root. **Skip any step you have already run on this branch in the current session** — do not repeat `pnpm i` or a build you just completed.

1. `pnpm auth` — `firebase login --reauth && gcloud auth application-default login`.
   This is **interactive** (opens a browser for Firebase + gcloud). Run it in the foreground; if it needs the user to complete a browser login, tell them and wait. Skip only if auth is known-fresh.
2. `pnpm i` — install/refresh dependencies. Skip if you just ran it on this branch with no dependency changes since.
3. Build the packages the change touches, in dependency order:
   - If `shared/` changed: `pnpm --filter shared build`.
   - If `functions/` changed: `pnpm --filter functions build`.
   Skip a build you have just completed for the same changes. (The frontend runs through Vite via `app:dev` and does not need a separate build.)

## Step 2 — Ensure dev servers are running

The `test-local` agent reports `BLOCKED` if these are not up. Start each **in the background** if not already running:
- Frontend: `pnpm app:dev` (serves http://localhost:5173).
- Emulators + functions: `pnpm functions:dev`.

After starting, wait until http://localhost:5173 responds and the functions emulator is up before delegating. If they were already running from an earlier step, do not start duplicates.

## Step 3 — Delegate to the `test-local` subagent

Spawn the `test-local` agent (via the Agent tool, `subagent_type: "test-local"`) with a spec containing:
- **What changed**: the modified files and the nature of the change.
- **What to test**: the flow/interactions to verify.
- **Test user**: the email to sign in with at the emulator account picker (instruct it to pick that existing account, not create a new one, unless the test is about sign-up/onboarding).
- **Routes to visit**: the explicit routes.
- **Success criteria**: what passing looks like.

Remind the agent (it already knows, but reinforce): screenshots go only to `.playwright-mcp/`, and it must not edit code or touch real email/calendar integrations.

## Step 4 — Relay results

Report the agent's PASS / FAIL / BLOCKED verdict, the key observations, and any console/network issues. If BLOCKED on servers or auth, fix the prerequisite and re-delegate rather than reporting failure.
