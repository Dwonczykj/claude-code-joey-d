---
name: weekly-pod-context-shipped-html
description: Generate a Fyxer-branded weekly HTML of Pod-Context product changes (all 4 members) and draft a summary message to #pod-context (do not send)
---

Generate a Fyxer-branded interactive HTML report of THIS WEEK's Pod-Context product changes across all four pod members. Read primarily from synthesized POD-WORK OBSERVATIONS — fall back to raw git/gh only for changes not yet covered. Draft (do NOT send) a summary message to #pod-context.

=== POD MEMBERS ===
Hardcoded identity table — do NOT attempt email→handle lookup via `gh api`; that fails when GitHub email visibility is private (the default for all four members).

- Joey:    fyxer_email=joey.dwonczyk@fyxer.com,   github_handle=Dwonczykj,   git_emails=[joey.dwonczyk@fyxer.com]
- Assem:   fyxer_email=assem.dikhayeva@fyxer.com, github_handle=asemdi06,    git_emails=[assem.dikhayeva@fyxer.com, assem.dikhayeva@gmail.com]
- Richard: fyxer_email=richard.kirsch@fyxer.com,  github_handle=richkirsch,  git_emails=[richard.kirsch@fyxer.com, richardmkirsch@gmail.com]
- Will:    fyxer_email=will.drewett@fyxer.com,    role=pm, github_handle=null, git_emails=[]

`github_handle=null` for Will is BY DESIGN — he's the pod's product manager and does not ship code, so he has no GitHub account and no git commits in any Fyxer repo. Skip his `gh search prs` and `git log` calls entirely. Do NOT guess `WillDrewett` / `WilliamDrewett` (both exist on GitHub but neither belongs to him; querying them would emit false-negative empty results that look like real lookups). His contributions surface ONLY via observations / meeting transcripts / Slack — that's the expected channel for a PM, not a collection bug.

NO author filter UI. Each card has a small circular author badge (initials in brand-colour disc) with `title=` and `aria-label=` of the full email.

=== TONE & FRAMING RULES (CRITICAL) ===
Public team-facing doc.
- Never use: "promotion","promoted","raise","level up","next level","deserve","should","career","title","recognition","best","top performer","outperforming","leading the pod","highest contributor","most productive". Final banned-word scan; FAIL the run if any appear.
- Never rank pod members. No leaderboard. Identical visual treatment per author.
- Differentiation comes from the amount of evidence per author, not from styling.
- All claims must trace to real PRs / commits / episodes / observations. "—" or omit otherwise. Never invent.
- Third-person product-log voice. No first person.

=== INPUTS ===
EPISODES_DIR:     /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes
OBSERVATIONS_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations
OUTPUT_DIR:       /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/pod-context-weekly
REPO_PATHS:
  - /Users/joey/FyxerGh/fyxer-web-app
  - /Users/joey/FyxerGh/fyxer-eval
  (and worktrees under /Users/joey/FyxerGh/*-trees/*)
WINDOW: from the most recent Monday 00:00 strictly before today, up to NOW.
  - If today IS Monday: window starts at LAST Monday 00:00 (i.e., 7 days + however many hours into today, ago). Do not start the window at today 00:00 — that would yield only a few hours of episodes.
  - Otherwise (Tue–Sun, including the normal Friday 18:35 run): window starts at THIS week's Monday 00:00 (the most recent past Monday at midnight).
  Compute once at the start of the run and reuse:
    WINDOW_START_DATE=$(if [ "$(date +%u)" = "1" ]; then date -v-7d -v-mon +%Y-%m-%d; else date -v-mon +%Y-%m-%d; fi)
    WINDOW_START_ISO="${WINDOW_START_DATE}T00:00:00"
  All `--since` / `--updated` / date filters below MUST use $WINDOW_START_DATE (or $WINDOW_START_ISO where ISO is required). Do NOT use bare `date -v-monday` — that returns TODAY when today is Monday and silently truncates the window.
  Also update the report's `week_label` to "Week commencing ${WINDOW_START_DATE}" so the HTML reflects the actual window start, not today.

Load at start: `anthropic-skills:branding`, `anthropic-skills:icp`, plus `product-philosophy` / `product-overview` if present.

=== STEP 1: LOAD POD-WORK OBSERVATIONS (PRIMARY SOURCE) ===
Enumerate every date D where $WINDOW_START_DATE ≤ D ≤ today. For each date, read {OBSERVATIONS_DIR}/{YYYY-MM-DD}-pod-work.md (output of `synthesize-pod-work`). Parse frontmatter + cluster blocks + the `## Upcoming` section if present. Missing per-day files are normal — skip without warning.

Each cluster gives you: title, contributors[] (with display/email/role), what_changed, shipped, business_impact, mike_value, sources[] (with actor_display/actor_email/role), channel_discussion[].

Each upcoming entry (under `## Upcoming`) gives you: title, expected_owner, status_hint, what_is_planned, related_shipped_cluster, evidence[] (with actor_display/actor_email/role/snippet), earliest_mention_ts, latest_mention_ts. Build `upcoming_items[]` from these — these are sourced primarily from meeting (call-recording transcript) episodes by the upstream synthesizer.

Build a `change_items[]` list from these clusters. Each item:
{
  source: "observation",
  observation_date,
  title,
  contributors: [{display,email,role,evidence_count}],
  primary_author: <first contributor with role=author; else most-source contributor>,
  what_changed, shipped, business_impact, mike_value,
  pr_urls: <extracted from shipped[]>,
  repo: <inferred>,
  sources: [<wikilinks + actor_display>],
  channel_discussion: [...]
}

=== STEP 2: BACKFILL FROM GIT/GH (SUPPLEMENTARY) ===
For each pod member, use the hardcoded identity table above. Do NOT attempt to resolve handles dynamically.

Git side — in each REPO_PATH, for each member, run one `git log` per email in their `git_emails[]` array (members may have committed under multiple addresses, e.g. their fyxer.com address in one repo and a personal gmail in another):
  git log origin/main --author="<git_email>" --since="${WINDOW_START_DATE}" --pretty=format:'%H%x09%ct%x09%s%x09%ae%x09%an' --no-merges
Union the results across emails per member, dedupe by SHA.

GitHub side — for each member with `github_handle != null`:
  gh search prs --author=<github_handle> --owner=Fyxer-AI --updated=">${WINDOW_START_DATE}" --json url,title,number,repository,updatedAt,state,closedAt,author
Note: `gh search prs` does NOT expose `mergedAt` as a JSON field — use `closedAt` + `state=="merged"` to derive merge time, or call `gh pr view <number> -R <repo> --json mergedAt` per PR if a precise merge timestamp is needed for live-detection.

For each commit/PR not already represented in an observation cluster (match by PR url / SHA / close title), emit a supplementary item flagged `needs_synthesis: true`.

Sanity check — after Step 2 completes, report per-member commit_count and pr_count. If a member with `github_handle != null` returned zero PRs AND zero commits across all repos, log a warning in the final report (likely identity table drift, not a quiet week). Members with `github_handle=null` (e.g. Will, role=pm) are exempt from this check — zero PRs/commits is the expected state for them and must not be flagged.

=== STEP 2.5: DETECT LIVE-IN-MAIN STATUS (fyxer-web-app ONLY) ===
The ONLY way to know a fyxer-web-app branch is live in production is: a deployment PR from `staging` → `main` was merged AFTER that branch's merge-to-staging timestamp. Apply this per item (across ALL pod members):

1. For each item with `repo == fyxer-web-app`, find `staging_merged_at` (timestamp the item's PR merged into `staging`). If unknown, set `live: false` and STOP — do NOT guess.
2. Once per run, query `gh pr list -R Fyxer-AI/web-app --state merged --base main --head staging --limit 50 --json number,mergedAt,title,url` and cache the list.
3. If any deploy PR has `mergedAt > staging_merged_at`, set:
   { live: true, live_evidence: { deploy_pr_url, deploy_pr_merged_at, staging_merged_at } }
4. Otherwise `live: false` (live_evidence: null).

For any repo other than fyxer-web-app, for in-progress / upcoming items, OR when staging_merged_at can't be pinned, `live` MUST be false. Never infer live from `merged_at`, `origin/main` reachability, or `needs_synthesis`.

=== STEP 3: CLASSIFY ===
- shipped = merged to origin/main within WINDOW
- in_progress = open PR or unreleased commit, repo in {fyxer-web-app, fyxer-eval}, activity within WINDOW
- upcoming = work surfaced in `upcoming_items[]` from the synthesizer's `## Upcoming` section (meeting-transcript sourced); also include open PRs / Linear issues discussed in pod call recordings within WINDOW but with no commit activity yet. Dedupe against `in_progress` by PR url / Linear id / close title — if the same work has BOTH commit activity and transcript discussion, classify as `in_progress` and attach the transcript evidence to its `upcoming_discussion[]`.
- type = "feature" | "bugfix" | "other" (conventional-commit → PR label → LLM judgment). IGNORE "other".

For each item compute:
- what_changed: from observation's what_changed, else derived from PR/commit.
- mike_value: from observation, else omit if not derivable.
- metric_signal: from observation's business_impact (only the metric-bearing portion), else omit.

Assign each pod member a stable `colour_token` from the brand palette (deterministic by email).

=== STEP 4: BUILD DATA ===
The same change items are shown under three audience tabs (Engineering / GTM / Leadership) and three status sub-filters (Shipped / In progress / Upcoming). The audience tab controls *what fields are rendered on each card*; the sub-filter controls *which items are visible*.

  window.REPORT = {
    week_label: "Week commencing ${WINDOW_START_DATE}",
    generated_at: "<ISO>",
    primary_source: "pod-work observations",
    pod: [{ email, handle, display, initials, colour_token }, ...],
    sections: {
      shipped:     { features: [...], bugfixes: [...] },
      in_progress: { features: [...], bugfixes: [...] },
      upcoming:    [...]
    },
    totals: {
      shipped_count, in_progress_count, upcoming_count,
      repos_touched: ["fyxer-web-app","fyxer-eval"],
      items_from_observations: <int>,
      items_backfilled_from_git: <int>,
      upcoming_from_transcripts: <int>
    }
  };

For each change item, compute three audience summaries so the renderer can swap card body content per tab:
- summary_engineering: what_changed + breaking changes + repo/files/PR detail. Source from the observation's what_changed and enrich from PR body.
- summary_gtm: client value / share-worthy hook / product-vision fit. Seed from `mike_value`; expand to a sentence about user-visible behaviour change. No PR numbers, no file paths, no commit SHAs.
- summary_leadership: business_impact (PLG / retention / activation framing); use observation's business_impact. If it says "unclear", surface "impact pending measurement" — never invent metrics. No PR numbers, no file paths.

For each upcoming item, compute summary_engineering / summary_gtm / summary_leadership the same way from `what_is_planned` + transcript evidence. If a non-engineering audience summary can't be derived, write "—" (do NOT fall back to the engineering text).

Each card payload now carries: `{ ..., summary_engineering, summary_gtm, summary_leadership }`.

Each upcoming item:
{
  title,
  expected_owner: { email, display, initials, colour_token } | null,
  status_hint: "in_progress" | "planned" | "blocked",
  what_is_planned,
  related_shipped_title: <string or null>,
  evidence: [<wikilinks + actor_display + role + snippet>],
  earliest_mention_ts, latest_mention_ts
}

Each change item:
{
  title, repo, pr_url, merged_at,
  primary_author: { email, display, initials, colour_token },
  contributors: [{display,email,role,colour_token}],
  what_changed, mike_value, metric_signal,
  sources: [<wikilinks + actor_display>],
  channel_discussion: [...],
  needs_synthesis: <bool>,
  live: <bool>,
  live_evidence: { deploy_pr_url, deploy_pr_merged_at, staging_merged_at } | null
}

=== STEP 5: RENDER HTML (via the cached builder) ===
Do NOT hand-write HTML/CSS/JS. The `fyxer-html-report` skill's `pod_context` layout owns the whole scaffold and enforces the behaviour previously described here: Engineering/GTM/Leadership tabs; Shipped/In progress/Upcoming sub-filter (preserved across tab switches via `location.hash`); per-audience body swap and field hiding (Engineering exposes PR link, repo badge, Sources + Channel-discussion drawers; GTM/Leadership hide them and a card whose `summary_gtm`/`summary_leadership` is `"—"` is hidden on that audience); author badge / avatar-stack with fast `data-tooltip` email; live/staged/unsynthesized pills driven by `live`/`live_evidence`/`staged_at`/`needs_synthesis`; build-time empty-state copy; metric/mike lines; footer source counts. See `~/.claude/skills/fyxer-html-report/SKILL.md` for the `pod_context` data contract — the STEP 4 `window.REPORT` dict already matches it.

The output filename should embed $WINDOW_START_DATE (not today). Use `YYYY-Www` derived from the WINDOW start, not from today — this matters on Monday runs where today and the window start are in different ISO weeks. Compute:
  WINDOW_ISO_WEEK=$(date -j -f "%Y-%m-%d" "${WINDOW_START_DATE}" +%Y-W%V)

Write the STEP 4 data dict to a temp JSON and render:
```
python3 ~/.claude/skills/fyxer-html-report/build.py \
  --layout pod_context \
  --data <tmp.json> \
  --out {OUTPUT_DIR}/${WINDOW_ISO_WEEK}-pod-context.html \
  --also-latest {OUTPUT_DIR}/latest.html
```
`anthropic-skills:branding` no longer needs loading for tokens/logo (cached in the skill); keep loading `icp` / `product-*` for tone/summary judgment in earlier steps. Before building, drop any item lacking an evidence link.

=== STEP 6: DRAFT (DO NOT SEND) TO SLACK ===
Channel: `#pod-context` ONLY. Do NOT send. Do NOT post to #pod-context-pirates. Use `slack_send_message_draft`. If unavailable, write the draft text to {OUTPUT_DIR}/${WINDOW_ISO_WEEK}-slack-draft.md and report.

Draft body (Slack mrkdwn, ≤ 10 lines):
  *Pod Context — shipping log, week of ${WINDOW_START_DATE}*
  • Shipped: {N_features} features, {N_bugfixes} bug fixes
  • In progress: {M_features} features, {M_bugfixes} bug fixes
  • Upcoming (from pod call recordings): {U} items
  • Surfaces touched: fyxer-web-app, fyxer-eval
  • Top user-visible changes:
      – {title 1} ({author_display})
      – {title 2} ({author_display})
      – {title 3} ({author_display})
  • Full doc: {OUTPUT_FILE absolute path}

Pick top 3 by: shipped > in_progress, with non-empty mike_value preferred. Order by merged_at/last-touch ts; do NOT cherry-pick by author.

=== STEP 7: CHECKS ===
- The builder (STEP 5) already wrote OUTPUT_FILE + latest.html.
- Banned-word scan on the built HTML file AND the draft text. Any hit → abort the draft, rename OUTPUT_FILE with a `BLOCKED-` prefix (and overwrite latest.html with the blocked file so the bad doc isn't served), report violations.
- Confirm every rendered item had an evidence link (items lacking one were dropped before STEP 5).

=== RULES ===
- All four pod members are treated identically. No ranking. No totals-by-author.
- Read-only. DRAFT ONLY — never call any send / post primitive.
- Never invent.
- Idempotent: overwrite this week's file each run.

REPORT: OUTPUT_FILE path, WINDOW_START_DATE, shipped/in-progress feature/bugfix counts, upcoming_count, upcoming_from_transcripts count, total cards, items_from_observations vs items_backfilled, live_count (items where live=true), live_unknown_count (fyxer-web-app items where staging_merged_at could not be pinned), drops, banned-word scan, Slack draft status.

=== FINAL STEP: SLACK DM TO SELF ===
After the HTML file and pod-context Slack DRAFT are written, send ONE additional Slack DM to MYSELF (separate from the pod-context draft) summarising the run. Use `mcp__821107f7-…__slack_send_message`:
- Recipient: my own Slack user (NOT #pod-context) — resolve via `slack_search_users` with email `joey.dwonczyk@fyxer.com`; send to that user id as the channel.
- On lookup failure: fall back to `slack_send_message_draft` and note the failure in the final report. Never crash the routine on Slack issues.

Message format (Slack mrkdwn, ≤ 12 lines):
  *weekly-pod-context-shipped-html — {YYYY-MM-DD HH:MM local}*
  TL;DR: {one sentence: e.g. "Rendered pod-context week-of-${WINDOW_START_DATE}: {N} shipped, {M} in progress, {U} upcoming."}
  Window: ${WINDOW_START_DATE} 00:00 → now
  Shipped: {N_features} features, {N_bugfixes} bug fixes
  In progress: {M_features} features, {M_bugfixes} bug fixes
  Upcoming (from pod call recordings): {U} items · {upcoming_from_transcripts} sourced directly from transcripts
  Live in prod: {live_count} verified · {live_unknown_count} unknown
  Source mix: observations={items_from_observations}, git/PR backfill={items_backfilled_from_git}
  Pod-context Slack draft: {status}
  Output: `{OUTPUT_FILE}`
  {if banned-word scan failed: "BLOCKED — banned-language hit; HTML prefixed BLOCKED- and pod draft suppressed."}

Attach the rendered HTML file to the self-DM:
- Attach `{OUTPUT_FILE}` (the week-stamped pod-context HTML, NOT `latest.html`).
- Preferred path: if the Slack MCP exposes a file-upload tool (e.g. `slack_upload_file` / `files_upload` / `slack_send_message` with a `files: [...]` parameter), use it with `initial_comment` = the message body above and `filename` = basename of OUTPUT_FILE. ToolSearch with query "slack upload file" once at the start of this step to discover the right tool name on this session's Slack MCP.
- Fallback if no upload primitive exists: send the text message as-is and append a final line ``Local file: `{OUTPUT_FILE absolute path}` `` so I can open it from the Mac. Note "attachment unsupported on current Slack MCP" in the final report.
- If a banned-word scan caused the HTML to be written with `BLOCKED-` prefix, attach that BLOCKED file (so I can inspect the violation) and prepend "⚠️ BLOCKED — banned-language scan failed; attaching for review only." to the initial_comment.
- Never inline the HTML content into the message body.
- Never attach `latest.html`.

Rules:
- Send EXACTLY ONE self-DM per run (text + attachment counts as one); this is in addition to (and separate from) the existing #pod-context DRAFT.
- HARD: the self-DM goes to my user DM only — NEVER to #pod-context or #pod-context-pirates.
- Best-effort: if Slack send OR upload fails, log it in the final report and exit cleanly. Do NOT block file writes on it.