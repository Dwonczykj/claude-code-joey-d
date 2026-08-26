---
name: check-open-prs
description: Sweep every open PR you have in Fyxer-AI/web-app and print grouped markdown tables — one table per feature/stack, ordered most-stale-first — with PR link+title, root Linear issue, a one-sentence "value to product now" call, human reviewers, unresolved bot-comment count, non-test file count, and what it's stacked on. Use when the user says "check my open PRs", "/check-open-prs", "what open PRs do I have", "show my PRs grouped by feature before I chase reviews".
---

# Check Open PRs

Terminal-markdown only. Repo `Fyxer-AI/web-app`, author `@me`, **state open** (every open PR, no time window). Reuses the `gh`/GraphQL/Linear plumbing from `pr-tree-review` — read that skill's Step 2 for the exact bot-thread and check queries. No Excalidraw here.

## Step 1 — list every open PR

```bash
gh pr list --repo Fyxer-AI/web-app --author "@me" --state open --limit 100 \
  --json number,title,url,headRefName,baseRefName,createdAt,updatedAt,isDraft
```

`baseRefName` gives the stack base: if a PR's base is another open PR's `headRefName` (not `staging`/`main`), it is **stacked on** that PR. Default stacked-on is `staging`.

## Step 2 — per-PR facts

For each PR gather:

- **Human reviewers** — who has actually reviewed, with their verdict, bots excluded:
  ```bash
  gh pr view <PR> --repo Fyxer-AI/web-app --json latestReviews \
    --jq '[.latestReviews[]|"\(.author.login) (\(.state))"]|join(", ")'
  ```
  Drop bot logins (`cursor`, `cursor[bot]`, `chatgpt-codex-connector`, `qodo-code-review`, `coderabbitai`, `coderabbitai[bot]`, `Copilot`, `github-actions`). If none left, write `—`.
- **Unresolved bot comments** — count unresolved review threads whose first comment is a bot (same per-PR GraphQL as `pr-tree-review` Step 2; the batched query 504s). Report the count with bot names in parentheses, e.g. `3 (cursor, codex)`.
- **Non-test file count** — files in the diff excluding tests/stories:
  ```bash
  gh pr view <PR> --repo Fyxer-AI/web-app --json files \
    --jq '[.files[].path|select(test("\\.(test|spec)\\.|__tests__|/tests?/|\\.stories\\.")|not)]|length'
  ```
- **Root Linear issue** — the PR branch (`headRefName`) usually holds `PRE-XXXX`; else grep the PR body. Resolve with Linear MCP `get_issue`, then **follow `parent` upward until there is no parent** — that root issue is what goes in the table (the user wants the overarching feature, not a sub-issue). Show `PRE-XXXX — <root title>` linked to `https://linear.app/fyxer/issue/PRE-XXXX`. If the sub-issue differs from the root, that's fine — only the root is shown.
- **Value now** — one sentence: is this still worth shipping for the product today? Ground it in `.claude/rules/product-philosophy.md` and `icp.md` (reliability for Mike, take work away, serves revenue) plus the root issue's intent. Flag staleness explicitly when you see it ("root issue looks superseded — confirm still wanted"). One sentence, no hedging padding.

## Step 3 — group into features

Cluster the open PRs into feature groups:

- A **stack** (PRs chained via `baseRefName`) is one group.
- PRs sharing a **root Linear issue** (or the same spec / parent feature) are one group even if not directly stacked.
- **PRs older than 7 days** almost always belong to a stack or feature group — actively cluster these; only leave a PR as its own single-row group when it genuinely stands alone.
- A recent standalone PR is its own one-row group.

Name each group after its feature (root Linear issue title, or spec/umbrella name if several roots share one).

## Step 4 — print the tables

**Order groups chronologically ascending by the group's oldest PR `createdAt` — most stale group first.** Each group gets its own `###` heading and its own table.

```markdown
### <Feature name> — <oldest PR date>

| PR | Root Linear | Value now | Reviewers | Unresolved bot comments | Non-test files | Stacked on |
|----|-------------|-----------|-----------|------------------------|----------------|------------|
| [#11179 Title](url) | [PRE-3202 — Root title](linear-url) | One sentence. | Dwonczykj (approved) | 3 (cursor, codex) | 7 | [#11163](url) |
```

- PR cell = hyperlinked `#NNNN Title` (this is the link-to-PR-plus-title column).
- Within a group, list PRs in **stack order** (base first, then what stacks on it), not creation order.
- Stacked on = the base PR hyperlinked, or `staging`.

After all tables, add two short lines: which groups look **stale / possibly no longer relevant** (from the Value calls), and which PRs are **clean and ready** (0 unresolved bots + a human approval).

## Conventions

Read-only — never push, comment, or merge. Hyperlink every PR and Linear issue. Run the per-PR queries one PR at a time (batched GraphQL 504s). If a PR has no discoverable `PRE-XXXX`, say so in the Root Linear cell rather than guessing.
