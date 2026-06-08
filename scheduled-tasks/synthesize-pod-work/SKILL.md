---
name: synthesize-pod-work
description: Synthesize the last 24h of pod-wide episodes (all 4 pod members + pod channels) into a daily Pod-Work observation with per-author attribution
---

Synthesize the last 24 hours of pod-wide episodes into a single Pod-Work observation file with per-author attribution preserved at every level.

=== POD MEMBERS ===
- Joey:    fyxer_email=joey.dwonczyk@fyxer.com,   github_handle=Dwonczykj,   git_emails=[joey.dwonczyk@fyxer.com],                                       display="Joey"
- Assem:   fyxer_email=assem.dikhayeva@fyxer.com, github_handle=asemdi06,    git_emails=[assem.dikhayeva@fyxer.com, assem.dikhayeva@gmail.com],          display="Assem"
- Richard: fyxer_email=richard.kirsch@fyxer.com,  github_handle=richkirsch,  git_emails=[richard.kirsch@fyxer.com, richardmkirsch@gmail.com],           display="Richard"
- Will:    fyxer_email=will.drewett@fyxer.com,    role=pm, github_handle=null, git_emails=[],                                                            display="Will"

Will is the pod's product manager — no GitHub account and no git commits by design. His pod-authored episodes come from Slack / meetings / Notion / Linear, never from `source: git` or `source: github-pr`. Don't treat his empty git_emails / null handle as drift.

`pod_emails` = union of every `fyxer_email` + every entry in `git_emails[]`. `pod_handles` = every non-null `github_handle`. Use BOTH sets when partitioning episodes — Assem and Richard frequently commit under personal gmail addresses, so an `actor_email`-only filter against fyxer.com addresses silently drops their git episodes.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes
OBSERVATIONS_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations

Upstream git/PR episode collectors (run earlier in the same hour):
- `collect-git-episodes` — Joey only (his personal collector; hardcoded actor_handle=Dwonczykj).
- `collect-pod-git-episodes` — Assem + Richard. Emits `pod_member` in frontmatter directly. Will is intentionally NOT collected anywhere (PM, no git footprint).
Both collectors write into the same EPISODES_DIR and use compatible frontmatter shapes.

=== STEP 1: LOAD EPISODES ===
List files in EPISODES_DIR with `ts` (or `ts_start`) in the last 24h.

Partition by author:
- POD_AUTHORED: any episode whose `actor_email` ∈ pod_emails OR `actor_handle` ∈ pod_handles OR (frontmatter already carries a `pod_member` field — trust it; `collect-pod-git-episodes` sets this explicitly). For each, attach a normalised `pod_member` field from the mapping above (skip if already present). Meeting episodes (`source: meeting`) are inherently POD_AUTHORED because the `meeting-to-wiki` routine only writes meetings I attended; additionally any other pod member listed in `pod_attendees` counts as a co-author of that episode.
- POD_CHANNEL: episodes with `source: slack-channel` (collect-pod-channel-episodes output) — these are shared channel context, author can be pod or non-pod.
- IGNORE: everything else.

=== STEP 2: CLUSTER ACROSS POD ===
Cluster POD_AUTHORED into pod work-episodes. Signals for grouping:
- Same Linear issue id
- Same PR# or repo+branch
- Same Slack thread (across regular and channel sources)
- Same `calendar_event_id` / `call_recording_id` (meeting episodes — co-attendees become co-contributors via `pod_attendees`)
- Cross-references between pod members (one member's PR mentioned in another's commit/comment)
- Close-in-time + same product surface

A cluster may have a single author OR multiple authors (e.g. a PR Joey opened that Assem reviewed). Preserve all contributing authors.

For each cluster infer:
- title (short noun phrase)
- contributors: array of {pod_member, role: "author"|"reviewer"|"commenter"|"discussant"|"attendee", evidence_count}
  - For meeting episodes: the episode's `actor` is an "attendee", and every email in `pod_attendees` that maps to a pod member is also an "attendee". Do not infer a finer role from the summary unless an action item is explicitly assigned to that person (in which case use "author" for that contributor on that cluster).
- shipped: list of [[PR#]], [[Linear-ID]], [[file paths]]
- what_changed: 1-2 sentences, factual, NEUTRAL (no language that ranks contributors)
- business_impact: 1 sentence, or "unclear" if not derivable
- mike_value: 1 sentence on ICP value if derivable, else omit
- sources: array of {episode: [[basename]], actor_display, actor_email, role}

=== STEP 3: ATTACH POD-CHANNEL DISCUSSIONS ===
For each cluster, find related POD_CHANNEL episodes (PR/issue/file/handle mentions, same thread, time-adjacent). Attach as `channel_discussion`: array of {episode, channel, author_display, author_email, snippet, ts}.

POD_CHANNEL episodes with no plausible link to any cluster but that contain product-relevant content (PR links, decision language, "shipped"/"deployed"/"broke"/"fixed" verbs) become standalone clusters titled "Pod-channel discussion: {topic}" with contributors derived from message authors.

=== STEP 3.5: EXTRACT UPCOMING WORK (FROM CALL RECORDING TRANSCRIPTS) ===
Scan meeting episodes (`source: meeting`) — these carry call-recording transcripts and summaries — for work that is in flight or planned but not yet shipped. Also reuse POD_CHANNEL episodes for the same signal.

Forward-looking signals to extract:
- Future-tense / planning verbs: "we'll", "going to", "next week", "next sprint", "planning to", "after this lands", "blocked on", "follow-up", "kicking off", "still need to", "want to ship"
- Explicit action items / TODOs called out in the transcript summary
- Open PRs or Linear issues discussed but not yet merged/closed
- Decisions to start a new piece of work, even if no PR exists yet

Build a separate `upcoming_items[]` list (NOT merged into Clusters). Each upcoming item:
{
  title: <short noun phrase>,
  expected_owner: <pod_member if assigned in transcript, else "unassigned">,
  what_is_planned: 1-2 neutral sentences,
  status_hint: "in_progress" | "planned" | "blocked",
  related_shipped_cluster: <title of a Clusters entry if this upcoming work continues from a shipped one, else null>,
  evidence: [{episode: [[basename]], actor_display, actor_email, role, snippet}],   // ≥1 required
  earliest_mention_ts: <ISO>,
  latest_mention_ts: <ISO>
}

Hard rules:
- Every upcoming item MUST have ≥1 evidence entry quoting a real episode. No invention.
- Do NOT include items already shipped this window (cross-check against Clusters' `shipped` field).
- Neutral language only — no ranking, no commitments on behalf of pod members beyond what the transcript shows.
- Deduplicate by Linear-id / PR# / close title match.

=== STEP 4: WRITE THE OBSERVATION ===
File: {OBSERVATIONS_DIR}/{YYYY-MM-DD}-pod-work.md (today's date, local). Overwrite if exists.

Frontmatter:
---
type: observation
kind: pod-work
pod: ["joey.dwonczyk@fyxer.com","assem.dikhayeva@fyxer.com","richard.kirsch@fyxer.com","will.drewett@fyxer.com"]
window_start: <ISO 8601, 24h ago>
window_end: <ISO 8601, now>
generated_at: <ISO 8601 now>
episode_count_authored: <int>
episode_count_channels: <int>
cluster_count: <int>
upcoming_count: <int>
contributors_seen: [<distinct pod display names with at least one source this day>]
---

Body:
# Pod work — {YYYY-MM-DD}

## Summary
2-3 neutral bullets describing pod-wide outputs. Never rank members.

## Clusters
For each cluster:
### {title}
- **Contributors:** {comma-separated `{display} ({role})` from contributors[]}
- **What changed:** {what_changed}
- **Shipped:** {shipped list}
- **Business impact:** {business_impact}
- **For Mike:** {mike_value} (omit if not derivable)
- **Sources:** {sources, one per line as `[[episode]] — {display} ({role})`}
- **Channel discussion:** {channel_discussion, one per line as `[[episode]] (#{channel}, {display}) — "snippet"`} (omit section if empty)

## Upcoming
For each entry in `upcoming_items[]` (omit section entirely if empty):
### {title}
- **Expected owner:** {expected_owner}
- **Status:** {status_hint}
- **What's planned:** {what_is_planned}
- **Continues from:** {related_shipped_cluster} (omit if null)
- **First mentioned:** {earliest_mention_ts} · **Last mentioned:** {latest_mention_ts}
- **Evidence:** {evidence, one per line as `[[episode]] — {actor_display} ({role}): "snippet"`}

## Provenance
Authored episodes: {N}. Channel episodes considered: {M}. Clusters: {K}. Upcoming items: {U}.
Sources by pod member: Joey={a}, Assem={b}, Richard={c}, Will={d}.

=== RULES ===
- This synthesizer is POD-WIDE — it does NOT filter to me. Every pod member's contributions are first-class.
- Every cluster preserves per-source authorship (display + email + role). The downstream HTML routines depend on this.
- Tone: NEUTRAL and factual. Do NOT include any language that ranks pod members or implies relative impact. The contribution data carries the signal on its own.
- Never invent PR#, commit SHA, or Linear ID.
- If both EPISODES_DIR partitions are empty, write a stub with `cluster_count: 0` and exit.
- Only writes to OBSERVATIONS_DIR.

REPORT: path written, authored episode count, channel episode count, cluster count, upcoming_count, contributors_seen list.

=== FINAL STEP: SLACK DM TO SELF ===
After the observation file is written (or the stub on empty-window path), send ONE Slack DM to myself. Use `mcp__821107f7-…__slack_send_message`:
- Recipient: my own Slack user — resolve via `slack_search_users` with email `joey.dwonczyk@fyxer.com`; send to that user id as the channel.
- On lookup failure: fall back to `slack_send_message_draft` and note the failure in the final report. Never crash the routine on Slack issues.

Message format (Slack mrkdwn, ≤ 10 lines):
  *synthesize-pod-work — {YYYY-MM-DD HH:MM local}*
  TL;DR: {one sentence: e.g. "Wrote {K} clusters and {U} upcoming items from {N} authored + {M} channel episodes."}
  Window: {window_start} → {window_end}
  Contributors seen: {Joey={a}, Assem={b}, Richard={c}, Will={d}}
  Output: {observation file path}
  {if cluster_count == 0 AND upcoming_count == 0: "Empty window — stub written."}

Rules:
- Send EXACTLY ONE message per run.
- Best-effort: if Slack send fails, log it in the final report and exit cleanly. Do NOT block the observation write on it.
- Do NOT post to any other channel.