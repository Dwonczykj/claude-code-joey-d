---
name: persist-plan-doc
description: Persist a planning, design, or architecture doc to the gitignored docs-private tree instead of committing it to the repo. Use whenever the user asks to "draft a plan", "save this plan", "write a design doc", "persist this to docs-private", or wants a plan file kept out of the repo. Never write plans into the web-app repo working tree.
---

# Persist a plan doc (never commit plans to the repo)

Joey keeps plans, design notes, and architecture docs OUT of the web-app repo.
They live in a sibling private tree, not under version control with the code.

## Where plans go

Root: `/Users/joey/FyxerGh/fyxer-web-app-trees/fyxer-web-app-docs-private/`

Organise into well-named directories and sub-directories by topic/feature, e.g.
`fyxer-web-app-docs-private/agentic-labelling-architecture/`. Reuse an existing
topic directory if one fits; only create a new one for a genuinely new topic.

## Rules

- Never write plan/design/architecture markdown into
  `/Users/joey/FyxerGh/fyxer-web-app-trees/fyxer-web-app/` (the repo). That tree
  is for code and repo-tracked docs only.
- Filenames: kebab-case, specific enough to find later without opening it, e.g.
  `phase-1-eligible-labels-two-pr-split.md`, not `plan.md`.
- Start every plan file with a short header block: `Status` (draft/locked),
  `Date` (absolute), and what it `Relates to` (PR #, Linear ticket, design doc).
- If the topic directory does not exist yet, `mkdir -p` it first.

## Steps

1. Pick or create the topic sub-directory under docs-private.
2. Write the plan as a markdown file with the header block above.
3. Tell the user the full path. Do not `git add` or commit it.
