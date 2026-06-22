---
name: create-pr
description: Create a pull request with the correct base branch and assignment based on the repository (Fyxer-AI/web-app → staging, Fyxer-AI/eval → main, else → staging). Assigns to Dwonczykj. For web-app, asks about the deploy-qa label. Use when the user asks to create a PR, open a pull request, or push a branch for review.
user_invocable: true
---

# create-pr

Create a pull request targeting the correct base branch for this repository.

## Phase 1: Gather context in parallel

Run all of these at once:

```bash
gh repo view --json nameWithOwner --jq .nameWithOwner
git branch --show-current
git status --short
git log --oneline -10
```

## Phase 2: Determine base branch and settings

| Repo | Base branch | Assign |
|------|-------------|--------|
| `Fyxer-AI/web-app` | `staging` | `Dwonczykj` |
| `Fyxer-AI/eval` | `main` | `Dwonczykj` |
| anything else | `staging` | `Dwonczykj` |

## Phase 3: Verify the branch has commits ahead of base

```bash
git log <base-branch>..HEAD --oneline
git diff <base-branch> --stat
```

If there are no commits ahead of the base branch, stop and tell the user there is nothing to PR.

If there are uncommitted changes, warn the user and ask if they want to commit them first before continuing.

## Phase 4: Link to a Linear issue (Context Pod)

1. Invoke `/linear-list-my-context-pod-issues` to fetch open issues assigned to the user in Context Pod Q2 2026. Show the list inline.
2. Use `AskUserQuestion` to ask:

   > "Is this PR linked to an existing Context Pod Linear issue, or should I create a new one?"

   Options: **Pick existing** / **Create new** / **Skip — no Linear issue**

3. If **Pick existing**: ask the user to provide the issue identifier (e.g. `PRE-123`). Call `mcp__ac8e4a0b-1ec5-4ab5-8b10-e46579796632__get_issue` with that identifier to resolve the URL. Store the identifier + URL for use in the PR body.

4. If **Create new**: invoke `/linear-create-context-pod-issue`. The title/description should be derived from the commits and diff already gathered. Use the returned identifier + URL in the PR body.

5. If **Skip**: continue without a Linear reference.

## Phase 5: Draft the PR title and body

Read the commits and diff to write:

- **Title**: conventional-commit style matching the project convention (`feat:`, `fix:`, `chore:`, `experiment:`). Under 70 chars. No apostrophes.
- **Body**: use this template (include the Linear line only if a Linear issue was resolved in Phase 4):

```
## Summary
- <bullet 1>
- <bullet 2>
- <bullet 3 if needed>

## Test plan
- [ ] <test step 1>
- [ ] <test step 2>

Linear: <PRE-123 url>   ← omit this line if no Linear issue

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Keep the summary to 1–3 bullets covering what changed and why. Keep the test plan to concrete, checkable steps.

## Phase 6: Push and create the PR

First push the branch if it isn't already on the remote:

```bash
git push -u origin <current-branch>   # only if not already pushed
```

Then create the PR:

```bash
gh pr create \
  --base <base-branch> \
  --assignee Dwonczykj \
  --title "<title>" \
  --body "$(cat <<'EOF'
<body>
EOF
)"
```

## Phase 7: deploy-qa label (web-app only)

If the repo is `Fyxer-AI/web-app`, use `AskUserQuestion` to ask:

> "Do you want to add the `deploy-qa` label to this PR? This triggers a QA deploy."

Options: **Yes, add it** / **No, skip it**

If yes:
```bash
gh pr edit --add-label "deploy-qa"
```

## Phase 8: Report back

Return the PR URL so the user can click through to it.

If the repo is `Fyxer-AI/web-app` and the label was added, confirm that too.

## Rules

- Never force-push or reset. If the push fails due to divergence, surface the error and stop.
- Never commit on the user's behalf — if uncommitted changes exist, warn and wait.
- If `gh pr create` fails because a PR already exists for this branch, surface the existing PR URL instead of erroring.
- Do NOT run lint or typecheck — that is the user's responsibility before invoking this skill.
