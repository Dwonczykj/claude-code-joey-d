---
name: screenshot-to-notes
description: Process daily CleanShot screenshots into Obsidian wiki notes (72h lookback on Mondays, 24h otherwise)
---

You are processing Joey's daily screenshots into his Obsidian wiki. Follow these steps exactly:

## 1. Determine lookback window

Run a Bash command to check the current day of the week. If today is Monday (day 1), set the lookback to 72 hours. Otherwise, set it to 24 hours.

## 2. Find recent image files

Search for image files modified within the lookback window in:
```
/Users/joey/Library/Mobile Documents/com~apple~CloudDocs/CleanShotProExports
```

Use `find` with `-mmin` (e.g. `-mmin -1440` for 24h, `-mmin -4320` for 72h) to locate files matching these extensions: `.png`, `.jpg`, `.jpeg`, `.webp`, `.heic`, `.svg`

**Skip entirely:** `.mp4`, `.mov`, `.gif`, `.DS_Store`, and any non-image files.

If no files are found, report "No new screenshots found" and stop.

## 3. Process each image

For each image file found:

### a. Read the image
Use the Read tool on the image file path. Claude's multimodal capability will interpret the visual content.

### b. Determine a title
From the image content (visible text, UI elements, diagrams), determine a short, descriptive title in plain English title case. For example: "BigQuery Cost Dashboard April 2026" or "Slack Thread About Deploy Pipeline".

### c. Copy image to vault
Copy the image file into the Obsidian vault at:
```
/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes
```
Use `cp -n` to avoid overwriting existing files.

### d. Create the note
Create a new markdown file in the vault root named `{Title}.md` with this structure:

```markdown
---
tags: [relevant, tags, based-on-content]
date: YYYY-MM-DD
type: clip
source_image: "/Users/joey/Library/Mobile Documents/com~apple~CloudDocs/CleanShotProExports/{original filename}"
clipped: YYYY-MM-DD
related: ["[[Related Note]]"]
---

# {Title}

> Clipped from image: `{filename}` on {date}

![[{filename}]]

{Description of what the image shows — UI state, dashboard data, conversation, code, diagram, etc.}

{All extracted text, formatted cleanly — tables as markdown tables, lists as bullet points, code as fenced blocks}
```

Add `[[wikilinks]]` to any related existing vault notes you can identify from the content.

### e. Keep a running list
Track all created notes for the batch update at the end.

## 4. Batch update wiki files

After processing all images:

### Update `_wiki/index.md`
Read the existing index at:
```
/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_wiki/index.md
```
Add each new note under the most appropriate category. If no category fits, add to "Technical" or create a new one.

### Update `_wiki/log.md`
Append a new entry to:
```
/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_wiki/log.md
```
Format:
```markdown
## [YYYY-MM-DD] clip | Daily screenshot capture ({N} images)
- Created: [[Note 1]], [[Note 2]], ...
- Updated index: {categories touched}
```

## 5. Summary

Output a summary listing:
- Number of images found and processed
- Titles of all notes created
- Any errors or skipped files

## Constraints
- Never delete or rename existing files
- Use `cp -n` when copying images (no overwrite)
- Keep note content concise and practical
- Match Joey's writing style: direct, bullet points, no filler
- Do not add comments to any code
- If the vault wiki files (_wiki/index.md, _wiki/log.md) don't exist yet, skip those updates rather than creating them from scratch