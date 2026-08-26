---
name: add-to-moodboard
description: File a product idea as its own note in a "Product Ideas Moodboard" directory in the Obsidian vault, checking existing ideas for overlap/relation first. Use whenever Joey has a product idea he wants to jot down for later, or says "add to moodboard", "/add-to-moodboard", "moodboard this".
user_invocable: true
arguments: "[idea text]"
---

# /add-to-moodboard

Thin wrapper around `/note capture` conventions (frontmatter, wikilinks, log), but each idea gets its own file so it can carry real context, and every new idea is checked against existing ones before filing.

Vault: `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes`
Directory: `{vault}/Product Ideas Moodboard/`
Index: `{vault}/Product Ideas Moodboard/_index.md`

## Flow

1. If the directory or `_index.md` doesn't exist yet, create the directory and an `_index.md` with just a `# Product Ideas Moodboard` heading.
2. Read `_index.md` for the list of existing ideas and their one-liners. Grep the directory for keyword overlap with the new idea too — the index one-liner alone can miss a real match.
3. Decide how the new idea relates to what's there:
   - **Duplicate / same idea restated** — don't create a new file. Append a dated line under that file's `## Updates` section instead (create the section if missing), and say which idea it merged into.
   - **Related but distinct** — create a new file (step 4) and add each to the other's `related:` frontmatter and a `## Related` bullet, both directions.
   - **Unrelated** — create a new file (step 4), no related links.
4. Create `{vault}/Product Ideas Moodboard/{Idea Title}.md` (plain English, title case, derived from the idea text):
   ```yaml
   ---
   title: Idea Title
   date: YYYY-MM-DD
   type: idea
   tags: [product-idea]
   product_area: <which part of the product this touches, e.g. "chat", "labelling", "web dashboard">
   scope: <one line — rough size/blast radius, e.g. "small: one UI tweak" or "large: new backend service">
   status: raw
   related: ["[[Other Idea]]"]   # omit key entirely if none
   ---
   ```
   Body:
   ```markdown
   # {Idea Title}

   ## Context
   {Why this came up — what triggered it, what problem it responds to.}

   ## Description
   {The idea itself, in Joey's words, tidied not rewritten.}

   ## Related
   - [[Other Idea]] — how it relates
   ```
   Omit `## Related` if there's nothing to link.
5. Update `_index.md`: add or update one line —
   `- [[Idea Title]] — {product_area}, {one-line summary} ({status})`
6. Append one line to `_wiki/log.md`: `## [YYYY-MM-DD] moodboard | {idea title}`

## Notes

- One file per idea is the point — each carries context, product area, scope, and status on its own, unlike a single running list.
- `status` starts as `raw`. Update it in place (`raw` → `exploring` → `shipped`/`dropped`) if Joey later revisits an idea rather than filing a new one.
- Don't go looking for relations outside this directory (existing vault notes, project pages) — that's `/note lint`'s job. Only cross-check within the moodboard.
- Low-stakes and reversible — don't ask for confirmation before filing. Do surface the merge/relation decision made in step 3 so Joey can correct it.
