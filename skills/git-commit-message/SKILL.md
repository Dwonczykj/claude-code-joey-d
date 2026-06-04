---
name: git-commit-message
description: Generate a git commit message for the current staged/unstaged changes, grouped by top-level repo directory and feature, with per-file bullets noting what was added, removed, or changed plus the line diff size. Use when the user asks to write a commit message, draft a commit, or run /commit-style workflows.
---

# git-commit-message

Generate a commit message for the current diff in the user's preferred format.

## When to use

The user asked you to write a git commit message, draft a commit, or commit changes. Do NOT run `git commit` yourself unless the user explicitly asked you to commit — this skill produces the message text.

## Formatting rules (hard requirements)

- **Never use the `'` (apostrophe) character anywhere in the message.** The user pastes messages into `git commit -m '...'`, so an apostrophe breaks the shell quote. Rewrite phrasing to avoid it (use "do not" instead of "dont", "user" instead of "users" when possessive, etc.). Double-check the final output for apostrophes before returning.
- Do not include backticks unless necessary — they are safe in single-quoted shells but rarely needed.
- Output the commit message as plain text, ready to paste between single quotes.

## Structure

1. **Title line** — conventional-commit style: `feat: ...`, `fix: ...`, `chore: ...`, `experiment: ...`, `refactor: ...`, `docs: ...`. Short, under ~70 chars. No apostrophe.
2. **Blank line.**
3. **Body** — grouped two levels deep:
   - `## <top-level directory>` heading for each top-level directory the diff touches (e.g. `## functions`, `## app`, `## scripts`).
   - `### <feature or area>` sub-heading under each directory, grouping related file changes by the feature or concern they serve.
   - Under each sub-heading, one `- ` bullet per changed file. Each bullet states:
     - the file path (relative to the top-level dir or repo root, your call — be consistent),
     - what was **introduced** (if anything),
     - what was **removed** (if anything),
     - what was otherwise **changed**,
     - the **line diff size** as `(+X / -Y)`.

If a file only adds, only removes, or only changes, omit the empty parts — do not write "introduced: nothing".

## How to gather the data

Run these in parallel:

- `git status` — see untracked + modified files.
- `git diff --stat` and `git diff --stat --cached` — get per-file `(+X / -Y)` line counts. Combine staged and unstaged unless the user specifies one.
- `git diff` and `git diff --cached` — read the actual changes so you can describe what was introduced/removed/changed per file.
- `git log -n 5 --oneline` — match the repo's existing commit style for the title prefix.

Group files into `### <feature>` sub-headings by reading the diff and inferring intent — files touching the same component, endpoint, prompt, schema, etc. belong together. If a directory has only one logical change, a single sub-heading is fine.

## Example output shape

```
feat: improve chat retrieval prompts and add attachment search tool

## functions
### Chat retrieval prompts
- src/features/chat/prompts/sharedPromptSections.ts — updated guidance on when to call SEARCH_EMAILS vs SEARCH_EMAIL_ATTACHMENTS (+24 / -8)

### Chat tools
- src/features/chat/tools/definitions.ts — introduced SEARCH_EMAIL_ATTACHMENTS tool definition (+18 / -0)
- src/features/chat/tools/searchEmails.ts — changed result ranking to prefer recent threads, removed dead fallback branch (+12 / -19)

## app
### Settings page polish
- src/pages/Settings/Integrations.tsx — changed loading state to match design system, removed legacy spinner import (+6 / -11)
```

## Final check

Before returning the message:

1. Scan for `'` — if any slipped in, rewrite that line.
2. Confirm every changed file from `git diff --stat` appears under exactly one heading.
3. Confirm the title prefix matches the repo convention seen in `git log`.

Return only the commit message text. Do not wrap it in extra commentary unless the user asked for explanation.
