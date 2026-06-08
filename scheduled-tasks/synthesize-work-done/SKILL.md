---
name: synthesize-work-done
description: Synthesize the last 24h of episodes into one Work-Done observation with provenance
---

Synthesize the last 24 hours of episodes into a single "Work-Done" observation file for MY work, with full provenance and pod-context references where they support my work.

=== IDENTITY ===
Me: Joey Dwonczyk
Email: joey.dwonczyk@fyxer.com
GitHub: Dwonczykj

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes
OBSERVATIONS_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations
WIKI_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_wiki

=== STEP 1: LOAD EPISODES ===
List all files in EPISODES_DIR whose frontmatter `ts` (or `ts_start`) is within the last 24h. Read each, parse frontmatter + body.

Partition them:
- MINE: episodes where (`actor_email == joey.dwonczyk@fyxer.com`) OR (`actor_handle == Dwonczykj`) OR `source` ∈ {`claude-code`, `codex-cli`, `apple-notes`, `meeting`} (inherently mine — both coding-agent sources are local to my machine; `claude-code` is Anthropic's Claude Code and `codex-cli` is OpenAI's Codex CLI; `meeting` episodes are written by the `meeting-to-wiki` routine which is scoped to my recordings).
- POD_CONTEXT: episodes with `source: slack-channel` (from collect-pod-channel-episodes — these are shared pod channel context, all authors).
- OTHERS: everything else — ignore for this observation.

=== STEP 2: CLUSTER MY WORK ===
Cluster MINE into work-episodes by shared signal: same Linear issue id, same PR number, same repo+branch, same Slack thread, same `calendar_event_id` / `call_recording_id`, overlapping entity links, or close-in-time + same project. One cluster = one piece of my work. Meeting episodes can either form their own cluster (a discussion that produced its own outcomes) or attach to an existing cluster when the meeting was clearly about an in-flight PR/Linear/file already represented.

For each cluster infer:
- title (short noun phrase)
- duration_hours (max ts − min ts across the cluster, capped at 8h per cluster)
- shipped: list of [[PR#]], [[Linear-ID]], [[file paths]] references derived from the episodes
- what_changed: 1-2 sentences on what was actually done
- business_impact: 1 sentence, or "unclear — needs follow-up" if not derivable. Do NOT invent.
- why_valuable: 1 sentence, or "unclear" if not derivable
- sources: array of objects {episode: [[basename]], actor: "joey"} for each source episode. Always include actor in source entries (forward-compatible with multi-author future).

=== STEP 3: ATTACH POD-CONTEXT REFERENCES ===
For each MY cluster, scan POD_CONTEXT episodes for ones that plausibly relate to the cluster:
- Mentions of a PR# / Linear ID / file path / branch already in the cluster
- Mentions of @joey or my handle in a message timed near the cluster
- Same thread as a cluster-source Slack message

Attach matching POD_CONTEXT entries to the cluster as `pod_context_refs`: array of objects {episode, channel, author, author_email, snippet} so author attribution survives. Do not include POD_CONTEXT episodes that have no plausible link to any of my clusters in this section.

=== STEP 4: WRITE THE OBSERVATION ===
File: {OBSERVATIONS_DIR}/{YYYY-MM-DD}-work-done.md (today's date, local). Overwrite if exists.

Frontmatter:
---
type: observation
kind: work-done
actor: joey
actor_email: joey.dwonczyk@fyxer.com
window_start: <ISO 8601, 24h ago>
window_end: <ISO 8601, now>
generated_at: <ISO 8601 now>
episode_count_mine: <int>
episode_count_pod_context_attached: <int>
cluster_count: <int>
total_duration_hours: <float>
---

Body:
# Work done — {YYYY-MM-DD}

## Summary
2-3 bullets: highest-level outcomes.

## Clusters
For each cluster:
### {title}
- **Duration:** {duration_hours}h
- **What changed:** {what_changed}
- **Shipped:** {shipped list}
- **Business impact:** {business_impact}
- **Why valuable:** {why_valuable}
- **Sources (mine):** {sources wikilinks; each `[[episode]] (joey)`}
- **Pod-channel references:** {pod_context_refs, one per line as `[[episode]] (Author) — "snippet"`} (omit section if empty)

## Provenance
Total mine: {N}. By type: claude={x}, codex={x2}, slack={y}, gmail={z}, linear={a}, notion={b}, git={c}, apple-notes={d}, meeting={e}.
Pod-channel context attached: {M} from #pod-context={p1}, #pod-context-pirates={p2}.

=== RULES ===
- Only `_observations/` is written. Never touch EPISODES_DIR or WIKI_DIR.
- Every cluster claim ("what_changed", "shipped", "business_impact", "why_valuable") must trace to at least one MY episode in sources. If unable, write "unclear".
- Pod-channel references attach to existing clusters only — they never create a cluster on their own (the pod-work synthesizer handles broader pod clustering).
- Source entries ALWAYS include actor; "joey" for mine, full display/email for pod references.
- If zero MY episodes in the window, write a stub observation with `episode_count_mine: 0` and body "no episodes in window".
- Never invent IDs.

REPORT: path written, mine episode count, pod-context attached count, cluster count.