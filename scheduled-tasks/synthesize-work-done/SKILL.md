---
name: synthesize-work-done
description: Synthesize the last 24h of episodes into one Work-Done observation with provenance
---

Synthesize all episodes from the last 24 hours into a single "Work-Done" observation file with full provenance back to source episodes.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes
OBSERVATIONS_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations
WIKI_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_wiki

STEP 1 — Load episodes:
List all files in EPISODES_DIR whose frontmatter `ts` (or `ts_start`) is within the last 24h. Read each, parse frontmatter + body.

STEP 2 — Cluster into work-episodes:
Group episodes by shared signal: same Linear issue id, same PR number, same repo+branch, same Slack thread, overlapping entity links, or close-in-time + same project. One cluster = one piece of work.

STEP 3 — For each cluster, infer:
- title (short noun phrase)
- duration_hours: (max ts − min ts) across the cluster, capped at 8h per cluster
- shipped: list of [[PR#]], [[Linear-ID]], [[file paths]] references derived from the episodes
- what_changed: 1-2 sentences on what was actually done (code merged, doc shipped, decision made, analysis run)
- business_impact: 1 sentence, or "unclear — needs follow-up" if you cannot infer it from the episodes. Do NOT invent impact.
- why_valuable: 1 sentence linking to the broader project/goal, or "unclear" if not derivable.
- sources: array of [[episode-file-basename]] wikilinks — one per source episode in the cluster.

STEP 4 — Write the observation:
File: {OBSERVATIONS_DIR}/{YYYY-MM-DD}-work-done.md (today's date, local).
If the file already exists, overwrite it (this is the canonical synthesis for the day).

Frontmatter:
---
type: observation
kind: work-done
window_start: <ISO 8601, 24h ago>
window_end: <ISO 8601, now>
generated_at: <ISO 8601 now>
episode_count: <int>
cluster_count: <int>
total_duration_hours: <float, summed across clusters>
---

Body structure:
# Work done — {YYYY-MM-DD}

## Summary
2-3 bullet lines: highest-level outcomes of the day.

## Clusters
For each cluster:
### {title}
- **Duration:** {duration_hours}h
- **What changed:** {what_changed}
- **Shipped:** {shipped list}
- **Business impact:** {business_impact}
- **Why valuable:** {why_valuable}
- **Sources:** {sources wikilinks, comma-separated}

## Provenance
Total episodes consumed: {N}. Sources by type: claude={x}, slack={y}, gmail={z}, linear={a}, notion={b}, git={c}.

Rules:
- Do not edit any file in EPISODES_DIR or WIKI_DIR. Only write to OBSERVATIONS_DIR.
- Every claim in "what_changed", "shipped", "business_impact", "why_valuable" must trace to at least one [[episode]] in sources. If you cannot trace it, write "unclear" instead.
- If EPISODES_DIR has zero files in the window, write a stub observation with `episode_count: 0` and body "no episodes in window" — still create the file.
- Never invent Linear IDs, PR numbers, or commit SHAs. Only reference ones that appear in actual episode frontmatter.

Report: path to the written observation file, episode_count, cluster_count.