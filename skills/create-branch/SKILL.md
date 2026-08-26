---
name: create-branch
description: Create a git branch following Joey's naming convention `joeydwonczyk/<type>-<LINEAR-CODE>-<title>`. Use when the user asks to create a branch, start work on a Linear issue, cut a branch for a ticket, or says "/create-branch", "make me a branch", "branch off staging for PRE-1234".
---

# create-branch

Create a branch named:

```
joeydwonczyk/<type>-<LINEAR-CODE>-<kebab-title>
```

## Parts

- **`type`** — conventional-commit type: `feat`, `fix`, `chore`, `refactor`, `experiment`, `docs`, `test`. Pick from what the work actually is; if the user gave a Linear issue, infer from its title/labels (bug → `fix`, feature → `feat`, cleanup/menial → `chore`).
- **`LINEAR-CODE`** — the Linear identifier, uppercase, e.g. `PRE-2884`. Omit this segment entirely (no double dash) if there is no issue.
- **`kebab-title`** — lowercase kebab-case, 3–6 words, describing the change not the trigger. Strip the Linear code if it appears in the issue title.

Examples:

```
joeydwonczyk/fix-PRE-2884-outlook-source-weblink
joeydwonczyk/feat-PRE-3086-person-relationship-subcollection
joeydwonczyk/chore-drop-dead-ml-fields
```

## Steps

1. **Work out the parts.** If the user gave a bare `PRE-1234`, fetch the issue title with the Linear MCP (`mcp__ac8e4a0b-1ec5-4ab5-8b10-e46579796632__get_issue`) rather than guessing. If they gave a description and no issue, skip the code segment. Ask only if the type is genuinely ambiguous — otherwise pick and say what you picked.

2. **Pick the base branch** by repo:
   - `Fyxer-AI/web-app` → `staging`
   - `Fyxer-AI/eval` → `main`
   - anything else → `staging` if it exists, else the default branch

3. **Cut it from a fresh base**, without disturbing uncommitted work:

```bash
git fetch origin && git switch -c joeydwonczyk/<type>-<CODE>-<title> origin/<base>
```

If the working tree is dirty, stop and ask before doing anything that would move those changes. Never stash or discard without being told to.

4. **Report** the branch name and its base in one line.

## Notes

- The web-app main worktree is shared with other agents that auto-stash and switch branches. If the user wants to run this branch locally, use the `setup-worktree-webapp` skill instead of switching branches in place.
- Do not push. Pushing and opening the PR is the `create-pr` skill's job.
