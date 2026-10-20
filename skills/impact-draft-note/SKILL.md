---
name: impact-draft-note
description: Park a drafted Impact Log entry, with its evidence, caveats and placement, in the Impact Scratchpad so it can be used when Impact Log entries are drafted later at a retro, instead of writing it to Notion now. Use when Joey says "record it in the impact notes", "park this draft", "save it for when we draft impact log entries", "/impact-draft-note", or holds back a drafted entry from Notion.
user_invocable: true
arguments: "[the work, or the draft from this session, to park]"
---

# impact-draft-note

Writes only to the Impact Scratchpad (`/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/Impact Scratchpad/YYYY-MM.md`). Never writes to Notion; that is `update-impact-log`, run at the retro after `impact-scratch review`.

## Flow

1. **Find the scratch entry.** Read this month's file. If this session already appended an entry for the same work (same title or Linear id), add to that entry. Otherwise run the `impact-scratch` Record steps first to create one, filled from this session.
2. **Get the draft.** If a draft entry was shown to Joey in this session, use it verbatim, including any edits he asked for. Otherwise draft one now by `update-impact-log` step 2 and its Notes (format, 60 to 90 words, measured and projected figures in separate sentences, no PR links, no em-dashes). Don't run `read-impact-log` for this; a fetch is only needed if placement depends on the current page and it hasn't been fetched this session.
3. **Append one bullet to the end of that entry.** Add it only after the entry's last line, and never change existing lines:
   ```
   - **Draft Impact Log entry:** drafted in session on YYYY-MM-DD, not written to Notion. <what to recheck and when>. <anything Joey said to leave out, and why>. Placement: <section, and whether it is an addendum to an existing entry>.
     > ### <Mon Year> - <Title>
     > **Delivered:** ...
     > **Impact:** ...
     > **Lesson:** ...
   ```
   Keep Joey's exclusions in his terms (for example "leave out the non-automated lane: no usable before-period data"), so the retro doesn't add it back.
4. If the entry already has a draft bullet and the draft changed, append a new bullet headed `Revised draft (YYYY-MM-DD)` under it. Don't edit the old one.
5. Reply in one line: the file, the entry title, and that nothing went to Notion.
