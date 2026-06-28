---
name: fix-bot-comments
description: Verify, fix, and resolve automated bot review comments on a GitHub PR (Cursor Bugbot, ChatGPT Codex connector, CodeRabbit, etc.). Independently confirms each bot claim against the actual code before fixing — never trusts the bot — then classifies each as real / not-worth-fixing / stale, fixes the real ones, verifies, pushes, replies per comment, and resolves the threads. Use when the user asks to "check/verify/fix the bot comments on this PR", pastes a PR URL with bot review comments, or asks whether a PR's automated review findings are real.
user_invocable: true
---

# fix-bot-comments

Triage automated review-bot comments on a PR. **The core discipline: verify every claim against the real code before acting. Bots produce confident false positives — treat each comment as a hypothesis to confirm or refute, not an instruction.**

## When to use

- "Are the bot comments on this PR real? If so, fix them and push."
- A PR URL is shared with comments from `cursor[bot]`, `chatgpt-codex-connector[bot]`, `coderabbitai[bot]`, `github-actions[bot]`, etc.
- "Resolve the Bugbot findings."

## Inputs

A PR number or URL. Derive `OWNER`, `REPO`, `PR` (e.g. `Fyxer-AI/web-app` #`10071`). If only a diff anchor URL is given, the PR number is in the path (`/pull/<PR>/`).

## Phase 1 — Gather PR + all bot comments

```bash
gh pr view <PR> --repo <OWNER>/<REPO> --json title,headRefName,baseRefName,state,url,body
# Inline review comments (where the bots usually post), with comment IDs + file:line:
gh api repos/<OWNER>/<REPO>/pulls/<PR>/comments --paginate \
  -q '.[] | "ID:\(.id)\nUSER:\(.user.login)\nPATH:\(.path):\(.line)\nBODY:\(.body)\n---"'
# Top-level issue comments (some bots post summaries here):
gh api repos/<OWNER>/<REPO>/issues/<PR>/comments --paginate \
  -q '.[] | "USER:\(.user.login)\nBODY:\(.body[0:800])\n---"'
```

Keep each comment's **numeric ID**, **author**, and **path:line** — you need the ID to reply/resolve. Bot comments are signed (e.g. "Reviewed by Cursor Bugbot"). Ignore the `Fix in Cursor/Web` link blobs.

## Phase 2 — Verify each claim (do NOT skip)

For every bot comment, independently confirm whether it is real:

1. Read the **diff** for the cited file: `git fetch origin <headRef>` then `git diff origin/<baseRef>...origin/<headRef> -- <path>`.
2. Read the **surrounding + supporting code** the claim depends on — the functions it names, callers, callees, types, and any framework seam (e.g. "the model only receives X" → find where X is assembled and confirm what's passed). A claim about runtime behavior must be traced to the code that produces that behavior.
3. Decide and write a one-line verdict per comment:
   - **Real** — reproduced from the code; explain the issue and *why it affects the product/feature*.
   - **Not worth fixing** — technically a nit, intentional, or the cost outweighs the benefit; say why.
   - **Stale** — already fixed in a later commit, or refers to code no longer present.
   - **Wrong** — the bot misread the code; cite the evidence that refutes it.

Watch for claims that **interact**: one bot may want behavior broadened while another wants it narrowed — make sure your fix satisfies both, or note the tension.

State the verdicts to the user before (or alongside) fixing.

## Phase 3 — Set up a safe workspace

If the PR branch differs from the current branch, **do not switch branches in a shared worktree** (other agents may be on it). Create a dedicated sibling worktree:

```bash
git worktree add <repo-parent>/<short-slug> <headRef>
```

If the worktree has no `node_modules`, install (pnpm shares a store, usually fast): `pnpm install --prefer-offline`.

## Phase 4 — Fix the real issues

- Apply the **minimal** change that resolves the confirmed issue; match surrounding style and the repo's coding standards.
- Add or extend a **regression test** that fails without the fix and passes with it — one per distinct issue.
- Skip the not-worth-fixing / stale / wrong ones (you'll explain those in Phase 6).

## Phase 5 — Verify

Run the project's checks for the changed area, e.g. for `Fyxer-AI/web-app` functions:

```bash
npx jest <changed test paths>            # targeted unit tests
pnpm tools:check                         # if registry/CI-validation code changed
pnpm --filter functions lint             # 0 errors (pre-existing warnings in other files are fine)
npx prettier --check <changed files>     # CI gates on "lint produced file changes"
```

Do **not** run `tsc --noEmit` manually in web-app worktrees (it pulls in broken wider-repo code and hangs/OOMs); the pre-commit hook runs a scoped typecheck. Verify types by reading the diff.

## Phase 6 — Commit, push, respond

Commit (conventional prefix; web-app: `fix:`/`chore:`) ending with:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

Push to the PR branch. Then **reply to each bot comment** and **resolve its thread**.

Reply to an inline review comment (use the comment's numeric ID):

```bash
gh api repos/<OWNER>/<REPO>/pulls/<PR>/comments/<COMMENT_ID>/replies \
  -f body='Real issue — fixed in <short-sha>. <one-line what was wrong> <one-line the fix + the regression test name>.'
```

For comments judged not-worth-fixing / stale / wrong, reply with that verdict and the evidence instead of a fix.

Resolve the threads via GraphQL (map comment IDs → thread node IDs, then resolve):

```bash
gh api graphql -f query='
{ repository(owner:"<OWNER>", name:"<REPO>") { pullRequest(number:<PR>) {
  reviewThreads(first:50) { nodes { id isResolved comments(first:1){ nodes { databaseId } } } } } } }'
# For each thread whose first comment databaseId matches a comment you handled:
gh api graphql -f query='mutation { resolveReviewThread(input:{threadId:"<THREAD_NODE_ID>"}) { thread { isResolved } } }'
```

Only resolve threads you actually addressed or explained. Don't resolve a thread you're leaving open for the human.

## Phase 7 — Clean up + report

- Remove the temporary worktree if you created one: `git worktree remove <path>` (only after the push succeeds).
- Report to the user: per-comment verdict, what was fixed (with commit SHA + file:line), what was deliberately left, and confirmation that replies were posted and threads resolved.

## Principles

- **Verify, don't trust.** A bot's confidence is not evidence. Reproduce from the code or refute it.
- **Minimal, tested fixes.** Each fix gets a regression test; don't expand scope beyond the confirmed issue.
- **Preserve the PR's invariants.** If the PR claims e.g. "coverage can only grow / no passing case newly fails," confirm your fix keeps that true.
- **Be honest about non-issues.** Saying "this isn't worth fixing because…" with evidence is a valid, valuable outcome.
