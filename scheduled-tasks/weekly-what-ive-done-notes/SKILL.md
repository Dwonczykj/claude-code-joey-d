---
name: weekly-what-ive-done-notes
description: Review my week from notes, record what I worked on and its business value, then log any new impact or no-impact items and DM me what was added
model: sonnet
effort: medium
---

This is a routine that runs every Monday morning.
Look at all the notes I have updated last week to infer all the work I have done this week and all the areas of my focus filtered to the work related to my work at Fyxer only. Add the review to my Wiki under completed-work/[year-yyyy]/[month-mmm]/[dd] with this calculated from Monday last week 7 days ago.
The review should be sendable using the structure and formatting from the slack-update skill.

## Final step: impact log check

Finish the routine by checking the work from exactly the 168 hours before this run started (run `date -u` and compute the window start as run time minus 168 hours; state both timestamps in the DMs). Many weeks will add nothing to either log, and that is fine while work is still being built. Never pad an entry to fill a week.

1. Read both logs first with the `read-impact-log` and `read-no-impact-log` skills. This refreshes the vault snapshots and shows what is already logged, so nothing gets logged twice. Also read the memory file `/Users/joey/.claude/projects/-Users-joey-FyxerGh-fyxer-web-app-trees-fyxer-web-app/memory/project_impact_log_jul_sep_2026_triage.md` for items already on hold with a re-check date, and skip those unless their date has passed.

2. List candidate work in the window from: the completed-work review written above; my merged PRs (`gh pr list --repo Fyxer-AI/web-app --author Dwonczykj --state merged --search "merged:>=<window start date>" --limit 200 --json number,title,mergedAt`, then keep only those merged inside the exact window); and the vault log at `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_wiki/log.md`. Group PRs into initiative-level candidates (one entry per initiative, never one per PR). Drop routine chores and small fixes that were never meant to have standalone impact. Work that is unmerged, internal-only, or shipped too recently to read any metric is "still building": do not log it, just list it in the DMs.

3. For each remaining candidate, run the `pull-impact-evidence` skill in a sub-agent (Agent tool, model opus), one sub-agent per candidate, in parallel. Each writes its report to `/Users/joey/FyxerGh/fyxer-web-app-trees/fyxer-web-app/docs-private/<slug>-evidence-pull.md` and ends with a recommendation: impact log, no-impact log, or hold with a re-check date. Pass the skill's own rules through: prod is read-only, never load local dev or staging credential files, never send prod data to any model or provider, no PII in outputs, read `/Users/joey/FyxerGh/data-platform` before writing BigQuery, verify every claim against source, control for cohort and lifecycle, and label figures MEASURED or PROJECTED.

4. Write what clears the bar, following the report's recommendation. I pre-authorise these writes for this routine only, so skip the skills' "confirm with Joey before writing" step:
   - `update-impact-log` for items with a hard number or a strong strategic case. Follow the skill's style rules: about 60 to 90 words, no PR links, Lesson only if non-obvious, projected figures labelled "Projected" in their own sentence with the check date, money worded so a senior reader can't misread it. Match the voice of the existing entries.
   - `update-no-impact-log` for items that shipped but were flat, unadopted, dead-ended or pure maintenance, with the real numbers and any Slack evidence.
   - Items the report says to hold: do not log; create an Apple Reminder for the re-check date using the `create-apple-reminder` skill, with a body that can be pasted into Claude Code.
   Read each page back after writing to confirm the text landed.

5. DM me on Slack (send to my own user id `U08G4A2GR89`; DMing yourself uses the user id as the channel). Send the Impact Log DM and the No-Impact Log DM as two separate messages, each only if that log got new entries, each listing the entries added (title plus the Impact or Outcome line) and the Notion link (Impact Log https://app.notion.com/p/39c244dd67558154abdbd4dff308effe, No-Impact Log https://app.notion.com/p/3e4244dd6755815d9690edb73d814744). Add a "Still building" line and any new hold reminders to whichever DM you send. If neither log got anything, send one short DM saying so, with the window and the "Still building" list. Plain sentences, no em-dashes. Never post anywhere other than my own DM.