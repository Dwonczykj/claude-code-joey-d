---
name: cursor-pr
description: Open a Fyxer-AI/web-app PR's branch in a new Cursor window, reusing or creating its git worktree. Use when asked to "open this PR in cursor", "open PR 1234 in a new cursor window", or "/cursor-pr <link-or-number>".
---

Run the `cpr` function from the zsh_scripts repo with the PR link or number.

```bash
zsh -c 'source ~/zsh_scripts/git-worktree.sh && source ~/zsh_scripts/cpr.sh && cpr "<pr-link-or-number>"'
```

It finds the PR's head branch with `gh`, reuses that branch's worktree if one exists (otherwise fetches the branch and creates a sibling worktree, copying env files), then runs `cursor -n <path>`.

Same-repo PRs only; a fork PR fails at the fetch. Report the worktree path and whether it was reused or created.
