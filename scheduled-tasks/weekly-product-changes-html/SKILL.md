---
name: weekly-product-changes-html
description: Generate a weekly interactive HTML report of product changes (last 4 weeks) with Engineering / GTM / Leadership tabs
model: sonnet
effort: medium
---

Generate a self-contained interactive HTML report summarizing the last 4 weeks of MY Fyxer product changes, with Engineering / GTM / Leadership tabs. Read primarily from synthesized OBSERVATIONS — fall back to raw git/gh only for changes not yet reflected in observations (e.g. same-day work).

=== IDENTITY (HARD FILTER — ONLY MY WORK) ===
GitHub: Dwonczykj
Email: joey.dwonczyk@fyxer.com
Display: Joey Dwonczyk

=== INPUTS ===
EPISODES_DIR:     /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes
OBSERVATIONS_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations
OUTPUT_DIR:       /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/product-weekly
REPO_PATHS:
  - /Users/joey/FyxerGh/fyxer-web-app
  - /Users/joey/FyxerGh/fyxer-eval
  (also worktrees under /Users/joey/FyxerGh/*-trees/* belonging to these repos)
WINDOW: last 28 days from fire time.

=== STEP 1: LOAD OBSERVATIONS (PRIMARY SOURCE) ===
For each date in the window, read {OBSERVATIONS_DIR}/{YYYY-MM-DD}-work-done.md if it exists. Parse frontmatter + the structured cluster blocks. Each cluster gives you: title, what_changed, shipped (PR/Linear/file refs), business_impact, why_valuable, sources.

Also load the pod-work observations in the window — {OBSERVATIONS_DIR}/{YYYY-MM-DD}-pod-work.md — and parse their `## Upcoming` sections. Filter to upcoming items where I'm involved: `expected_owner.email == joey.dwonczyk@fyxer.com` OR any `evidence[].actor_email == joey.dwonczyk@fyxer.com` (i.e. I attended the call recording where this was discussed). These feed Step 4.5.

Build a `change_items[]` list from these clusters. Each item:
{
  source: "observation",
  observation_date: "<YYYY-MM-DD>",
  title, what_changed, shipped, business_impact, why_valuable,
  sources: [<wikilinks>],
  pr_urls: <extracted from shipped[]>,
  linear_ids: <extracted from shipped[]>,
  repo: <inferred from shipped[] / sources>,
  type_guess: feature|bugfix|other (from PR labels or LLM judgment on title+what_changed)
}

=== STEP 2: BACKFILL FROM GIT/GH (SUPPLEMENTARY) ===
For the window, run:
  git log origin/main --author="Dwonczykj" --author="joey.dwonczyk@fyxer.com" --author="Joey Dwonczyk" --since="28 days ago" --pretty=format:'%H%x09%ct%x09%s%x09%ae%x09%an' --no-merges
in each REPO_PATH. Also `gh search prs --author=Dwonczykj --updated=">$(date -v-28d +%Y-%m-%d)"`. Verify `author.login == Dwonczykj`.

For each commit/PR NOT already represented by an observation cluster (match by PR url, commit SHA, or close title match), emit a supplementary item:
{
  source: "git" | "pr",
  ... (fields as before)
  needs_synthesis: true   // flagged so the UI can subtly indicate it didn't go through the synthesizer yet
}

This handles same-day work that the daily synthesizer hasn't covered yet.

=== STEP 2.5: DETECT LIVE-IN-MAIN STATUS (fyxer-web-app ONLY) ===
The ONLY way to know a fyxer-web-app branch is live in production is: a deployment PR from `staging` → `main` was merged AFTER my branch's merge-to-staging timestamp.

For each item where `repo == fyxer-web-app`:
1. Find `staging_merged_at`: the timestamp my branch (or its PR) merged into `staging`. If we can't pin this exactly, set `live: false` and STOP — do NOT guess.
2. Query `gh pr list -R Fyxer-AI/web-app --state merged --base main --head staging --limit 50 --json number,mergedAt,title,url` to enumerate every staging→main deploy PR.
3. If any of those deploy PRs has `mergedAt > staging_merged_at`, set:
   { live: true, live_evidence: { deploy_pr_url, deploy_pr_merged_at, staging_merged_at } }
4. Otherwise set `live: false` (and live_evidence: null).

For any repo other than fyxer-web-app, OR when staging_merged_at is unknown, OR when no qualifying staging→main PR is found: `live: false`. Never infer live from "merged_at" alone, from `origin/main` containment for branches that bypass the staging gate, or from `needs_synthesis`. The "live" pill must be evidence-backed or absent.

=== STEP 3: CLASSIFY & GROUP ===
For each item:
- released: merged into origin/main, OR reachable from origin/main
- unreleased: otherwise, AND repo is fyxer-web-app or fyxer-eval, AND there was activity in the window
- type: "feature" | "bugfix" | "other"  (conventional-commit prefix → PR labels → LLM judgment on observation's what_changed)
- IGNORE "other"
- week_commencing: Monday of the ISO week of mergedAt (released) or last-touch ts (unreleased)

=== STEP 4: AUDIENCE SUMMARIES ===
For each item, produce three audience views:
- **Engineering**: what changed, breaking changes, files/modules. Source the observation's what_changed and enrich from PR body if available.
- **GTM**: client value / share-worthy hook / product-vision fit. Use the observation's why_valuable as the seed.
- **Leadership**: business impact, PLG / retention / activation, value to Mike (load `anthropic-skills:icp`). Use the observation's business_impact. If observation says "unclear", surface as "impact pending measurement" — DO NOT invent metrics.

If a field can't be derived, write "—". Never invent metrics or PR numbers.

=== STEP 4.5: BUILD UPCOMING ITEMS ===
From the pod-work `## Upcoming` entries filtered to me in Step 1, plus any open PRs I authored with no merge yet, build `upcoming_items[]`. Dedupe against released/unreleased items by PR url / Linear id / close title (if it's already shipped or has open commits, prefer the existing row and do NOT also list it as upcoming).

Each upcoming item:
{
  title,
  status_hint: "in_progress" | "planned" | "blocked",
  what_is_planned,
  related_shipped_title: <string or null>,
  evidence: [{episode, actor_display, role, snippet}],
  from_call_recording: <bool — true if any evidence episode has source: meeting>,
  earliest_mention_ts, latest_mention_ts,
  week_commencing: <Monday of latest_mention_ts>
}

Audience summaries for each upcoming item:
- Engineering: technical sketch of what's planned + any blockers.
- GTM: client value angle if derivable from transcript discussion; else "—".
- Leadership: why this matters to Mike / PLG / retention / activation if discussed; else "—". Never invent.

=== STEP 5: BUILD DATA ===
  window.REPORT = {
    generated_at: "<ISO>",
    author: { handle: "Dwonczykj", email: "joey.dwonczyk@fyxer.com" },
    primary_source: "observations",
    weeks: [
      { label: "Week commencing YYYY-MM-DD",
        released:    { features: [...], bugfixes: [...] },
        unreleased:  { features: [...], bugfixes: [...] },
        upcoming:    [...]
      },
      ...  // 4 weeks, most recent first
    ],
    stats: {
      items_from_observations: <int>,
      items_backfilled_from_git: <int>,
      items_dropped_other: <int>,
      items_dropped_not_mine: <int>,
      upcoming_count: <int>,
      upcoming_from_call_recordings: <int>
    }
  };

Each item: { title, repo, author_handle: "Dwonczykj", pr_url, merged_at, summary_engineering, summary_gtm, summary_leadership, sources, needs_synthesis, live, live_evidence }

=== STEP 6: RENDER HTML (via the cached builder) ===
Do NOT hand-write HTML/CSS/JS. The Fyxer-branded scaffold (header + inline logo, Engineering/GTM/Leadership tabs, Released/Unreleased/Upcoming sub-filter, status/live/staged/unsynthesized pills, collapsible Sources/Evidence, fast tooltips, entrance animation, footer) is owned by the `fyxer-html-report` skill. See `~/.claude/skills/fyxer-html-report/SKILL.md` for the `product_weekly` data contract — the STEP 5 data dict already matches it (status/live/staged pill semantics are enforced by the layout from `live`/`live_evidence`/`staged_at`/`needs_synthesis`).

HARD RULE: before rendering, drop any item whose author_handle is not "Dwonczykj"; log the count.

Then write the STEP 5 data dict to a temp JSON and render:
```
python3 ~/.claude/skills/fyxer-html-report/build.py \
  --layout product_weekly \
  --data <tmp.json> \
  --out {OUTPUT_DIR}/{YYYY-Www}.html \
  --also-latest {OUTPUT_DIR}/latest.html
```
The builder writes both OUTPUT_FILE and latest.html (creating OUTPUT_DIR). It is read-only otherwise and never invents data. `anthropic-skills:branding` no longer needs loading for tokens/logo — they are cached in the skill.

=== STEP 7: CHECKS ===
- Confirm both files were written (the builder prints the paths).
- Never invent. Read-only.

REPORT: OUTPUT_FILE path, per-week counts (released/unreleased/upcoming), items_from_observations, items_backfilled_from_git, upcoming_count, upcoming_from_call_recordings, live_count (items where live=true), live_unknown_count (fyxer-web-app items where staging_merged_at could not be pinned), drops by reason.

=== FINAL STEP: SLACK DM TO SELF ===
After the HTML files are written, send ONE Slack DM to myself. Use `mcp__821107f7-…__slack_send_message`:
- Recipient: my own Slack user — resolve via `slack_search_users` with email `joey.dwonczyk@fyxer.com`; send to that user id as the channel.
- On lookup failure: fall back to `slack_send_message_draft` and note the failure in the final report. Never crash the routine on Slack issues.

Message format (Slack mrkdwn, ≤ 12 lines):
  *weekly-product-changes-html — {YYYY-MM-DD HH:MM local}*
  TL;DR: {one sentence: e.g. "Rendered {weeks} weeks: {R} released, {U} unreleased, {P} upcoming items across fyxer-web-app and fyxer-eval."}
  This week (most recent): released={R_this}, unreleased={U_this}, upcoming={P_this}
  Live in prod: {live_count} verified · {live_unknown_count} unknown (staging→main timestamp not pinned)
  Source mix: observations={items_from_observations}, git/PR backfill={items_backfilled_from_git}
  Upcoming from call recordings: {upcoming_from_call_recordings}
  Output: `{OUTPUT_FILE}`
  {if any banned-language scan failed or HARD-RULE drops happened, list the count here.}

Attach the rendered HTML file to the self-DM:
- Attach `{OUTPUT_FILE}` (the week-stamped HTML, NOT `latest.html` — give the file a stable archival name in Slack).
- Preferred path: if the Slack MCP exposes a file-upload tool (e.g. `slack_upload_file` / `files_upload` / `slack_send_message` with a `files: [...]` parameter), use it with `initial_comment` = the message body above and `filename` = basename of OUTPUT_FILE. ToolSearch with query "slack upload file" once at the start of this step to discover the right tool name on this session's Slack MCP.
- Fallback if no upload primitive exists: send the text message as-is and append a final line ``Local file: `{OUTPUT_FILE absolute path}` `` so I can open it from the Mac. Note "attachment unsupported on current Slack MCP" in the final report.
- Never inline the HTML content into the message body.
- Never attach `latest.html` (it gets overwritten weekly and isn't archival).

Rules:
- Send EXACTLY ONE message per run (text + attachment counts as one).
- Best-effort: if Slack send OR upload fails, log it in the final report and exit cleanly. Do NOT block file writes on it.
- Do NOT post to any other channel.