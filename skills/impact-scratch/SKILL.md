---
name: impact-scratch
description: Record at-the-time context that may later feed Joey's Impact Log (numbers, quotes, links, projections, before and after) into the Impact Scratchpad in his Obsidian vault, or review open entries at a retro. Use when Joey says "/impact-scratch", "scratch this for impact", "note this for my retro", "log this for my impact log later", or "impact-scratch review".
user_invocable: true
arguments: "[what happened | review]"
---

# impact-scratch

The scratchpad lives in the vault at `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/Impact Scratchpad/`, one file per month (`YYYY-MM.md`). `README.md` there explains the layout. This skill only writes to the scratchpad. It never writes to Notion or the Impact Log; that is `update-impact-log`, run at the retro.

## Record (default)

1. Get the date and time with `date "+%Y-%m-%d %H:%M"`. The file is `YYYY-MM.md` for that month.
2. If the file does not exist, create it with this header, then add `- [[YYYY-MM]]` to the Months list in `README.md`:
   ```yaml
   ---
   tags: [fyxer-ai, impact, retro]
   type: impact-scratchpad
   month: YYYY-MM
   ---
   ```
   followed by `# Impact Scratchpad, <Mon YYYY>` and a link back to `[[Impact Scratchpad/README|README]]`.
3. Append one entry at the bottom (read the file first, never reorder or edit earlier entries):
   ```
   ## YYYY-MM-DD - <short title, with Linear id if there is one>
   status: open
   - **What:** one or two sentences on what happened or shipped.
   - **Evidence:** numbers, quotes (name who said it), links (Slack, PR, Linear, GrowthBook, dashboards). Label every figure measured or projected; for a projection give the method and the key assumption.
   - **Why it might matter:** the business metric or company goal, if any.
   - **Check on:** a date to re-measure, if one makes sense.
   ```
4. Fill it from what Joey said and from this conversation. Use real figures from the session only; never invent or round up a number. Keep Joey's own wording for anything he said verbatim. Flag unverified inputs (e.g. "5.5k a day unchecked"). Weak, negative or no-impact signals are worth recording, flagged as such. Aim for under 120 words.
5. Don't ask questions unless there is nothing to record. Reply with one line: the file and the entry title.

## Review (`/impact-scratch review`)

1. Read every `YYYY-MM.md` in the folder and collect entries with `status: open`.
2. List them oldest first: title, date, the headline number (labelled measured or projected), any `Check on` date that has passed, and whether a parked draft entry is ready (from `impact-draft-note`). For an entry with one, start `update-impact-log` from that draft.
3. Stop there. Joey picks what clears the bar. For each pick, hand it to `update-impact-log` (or `update-no-impact-log`), and only after he says which, set the entry's status to `logged` (add the Impact Log entry title), `no-impact` or `dropped`.
