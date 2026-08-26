---
name: synthesize-relationships
description: Synthesize person relationships from the day's episodes into per-person observation files with provenance, dedup, evolving prose, and researched durable bios
model: sonnet
effort: medium
---

Synthesize person-relationship observations from the day's episodes into one markdown file per person, with full provenance, identifier-based deduplication, an evolving prose synthesis of how I know each person, and a durable per-person bio researched from web (Exa) + full Gmail/Slack history + episodes + hand-edited seed.

=== IDENTITY ===
Me: Joey Dwonczyk
Email: joey.dwonczyk@fyxer.com
GitHub: Dwonczykj
Never create a relationship file for myself. Mentions of me in episodes are ignored.

=== PATHS ===
EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes
OBSERVATIONS_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations
RELS_DIR: {OBSERVATIONS_DIR}/relationships
INDEX_FILE: {RELS_DIR}/_index.json
PENDING_DIR: {RELS_DIR}/_pending_merges
RESOLVED_DIR: {RELS_DIR}/_pending_merges/_resolved
LOG_FILE: {RELS_DIR}/_log.md
STATE_FILE: /Users/joey/.claude/scheduled-tasks/collect-and-synthesize-desk/state/synthesize-relationships.txt

Create RELS_DIR, PENDING_DIR, RESOLVED_DIR if they don't exist.

=== STEP 0: WINDOW DETERMINATION ===
Read STATE_FILE. If present and valid ISO 8601, set `window_start` to that timestamp. Otherwise default to (fire_time − 24h), and on Mondays default to (fire_time − 72h). Clamp window_start to a minimum of (fire_time − 14 days) and note the clamp in the run report. Set `window_end` = fire_time. Use this window throughout.

At END, only on a fully successful run, overwrite STATE_FILE with window_end (ISO 8601 with offset). On any error, leave STATE_FILE alone.

=== STEP 1: LOAD EPISODES ===
List EPISODES_DIR. For each file, parse YAML frontmatter. Keep episodes whose `ts` (or `ts_start` when present) falls in [window_start, window_end). Read the body too — meeting summaries, slack messages, and gmail bodies are where person mentions live.

=== STEP 2: APPLY RESOLVED MERGES (if any) ===
Look in RESOLVED_DIR for any merge files added since last run (mtime > previous STATE_FILE value, or all files if STATE_FILE is absent). Each resolved file has either:
- `verdict: merge` → merge candidate_b into candidate_a: append b's identifiers/aliases/episodes to a, add b's slug to a's `merged_from`, then delete b's slug file.
- `verdict: distinct` → record the pair in a `known_distinct` array inside INDEX_FILE so the routine never re-queues them.
Move processed files to RESOLVED_DIR/_done/{date}/ to keep the resolved folder small.

=== STEP 3: EXTRACT MENTIONS PER EPISODE ===
For each in-window episode, extract every distinct person mentioned. A mention is a structured record:

  {
    raw_name: "Kameron Tanselli" | "Kam" | "@kam.tanselli" | null,
    emails: ["..."],            # parsed from To/Cc/From/body
    github_username: "..." | null,  # from PR author, commit author, mentions
    slack_user_id: "U0..." | null,  # stable workspace id
    slack_handle: "@..." | null,    # display handle
    linkedin_handle: "..." | null,
    role_hint: "..." | null,        # title/role if visible in signature/profile
    company_hint: "..." | null,     # employer if visible
    episode_basename: "...",        # filename without .md
    episode_ts: "<ISO 8601>",
    co_mentions: [other raw_names in same episode]
  }

Extraction sources per episode source type:
- `gmail`: From/To/Cc/Bcc headers + body signatures. Drop my own address.
- `slack` / `slack-channel`: message author (user_id + display_name) + any @mentions in text + DM participants.
- `git`: commit author email/name, PR author, reviewers, anyone @-mentioned in PR description/comments.
- `linear`: assignee, creator, commenters.
- `notion`: page authors, editors, mentioned users.
- `meeting`: attendees list, speaker names in transcript snippets.
- `apple-notes`, `screenshot`, `claude-code`, `codex-cli`: names appearing in the body. Be conservative — only extract a mention if a name is clearly a person (capitalized full names, or a name next to an email/handle). Skip product names, place names, generic first-names without disambiguation.

Skip mentions that match my identity (joey.dwonczyk@fyxer.com, @Dwonczykj, "Joey Dwonczyk").

=== STEP 4: RESOLVE EACH MENTION TO A SLUG ===
Read INDEX_FILE if present, else start with an empty index. Index schema:
  {
    by_email: { "<email>": "<slug>" },
    by_github: { "<username>": "<slug>" },
    by_slack_id: { "U...": "<slug>" },
    by_slack_handle: { "@...": "<slug>" },
    by_linkedin: { "<handle>": "<slug>" },
    by_alias_normalized: { "<lowercased-name>": "<slug>" },
    slugs: { "<slug>": { display_name, last_interaction, strength } },
    known_distinct: [ ["slug-a","slug-b"], ... ]
  }

Identifier strength order (strong → weak): slack_user_id, github_username, email, linkedin_handle, alias_normalized (lowercased+trimmed raw_name).

For each mention:
- Hard-identifier hit (any of slack_user_id, github_username, email, linkedin_handle present and found in index): merge into that slug. If the mention carries a NEW hard identifier not yet on that slug, add it to the slug's identifiers AND to the index.
- Hard-identifier miss but hard identifier IS present: this is a new person — create a new slug file (see Step 5).
- No hard identifier, only raw_name:
    - Exact alias match in by_alias_normalized → attach to that slug (low-confidence; mark in run report).
    - No alias match → DO NOT create a new slug from name-only. Instead, write a pending mention to {PENDING_DIR}/_unresolved_names_{window_end_date}.md as a bullet `- name: "..." episode: [[basename]] co_mentions: [...]`. This avoids creating duplicate ghosts.
- Two or more existing slugs match different identifiers on the same mention: queue a merge candidate (see Step 6) and pick one slug (the one with the strongest matching identifier) for the current episode link.

Slug generation for new persons: lowercase the display name, ASCII-fold, replace runs of non-alphanumerics with `-`, strip leading/trailing `-`. If collision with an existing slug for a different identifier set, suffix `-2`, `-3`, etc.

=== STEP 5: WRITE / UPDATE PERSON FILES ===
File path: {RELS_DIR}/<slug>.md

If file does not exist, create it with this exact structure (preserving the SYNTHESIS markers — they bound the routine-owned prose block):

  ---
  type: relationship
  slug: <slug>
  display_name: <best display name observed>
  aliases: []
  identifiers:
    emails: []
    github: null
    slack: []
    linkedin: null
    phone: null
  company: null
  role: null
  how_i_know_them: null
  tags: []
  strength: 1
  first_interaction: <episode_ts>
  last_interaction: <episode_ts>
  created: <YYYY-MM-DD>
  updated: <YYYY-MM-DD>
  merged_from: []
  co_occurred_with: []
  synthesis_last_run: null
  synthesis_episode_count: 0
  bio_source: none
  bio_last_generated: null
  bio_last_tweaked: null
  ---

  # <display_name>

  <!-- BIO:HUMAN — hand-edited seed facts. Routine reads these as input but NEVER overwrites them. -->
  _(none)_

  <!-- BIO:START — managed by routine. source: none · last_generated: null. Edits here will be overwritten. -->
  _(awaiting bio generation)_
  <!-- BIO:END -->

  <!-- SYNTHESIS:START — managed by relationships routine, edits will be overwritten -->
  ## How I know them & what they're up to

  _(awaiting synthesis)_
  <!-- SYNTHESIS:END -->

  ## Episodes

  ## Co-occurrences

  ## Notes
  <!-- hand-edited scratchpad, routine never touches -->

For both new and existing files, update them as follows (always preserving the BIO:HUMAN block, the routine-owned BIO:START/END block — only Step 7.5 writes it — and the Notes block):

A) Frontmatter:
  - Merge any new identifiers (emails, github, slack ids/handles, linkedin) into the arrays — deduplicate, never remove existing entries.
  - Update `display_name` only if currently `null` or if a new mention provides a fuller name (e.g., current is "Kam", new is "Kameron Tanselli" — prefer the longer form). Move the previous display_name into `aliases` if it differs.
  - Add any new raw_name to `aliases` (deduped, case-preserved).
  - Update `company` and `role` only if currently null and a hint is present. Never overwrite existing values — those may be hand-edited.
  - Update `last_interaction` to the max(current, new episode_ts). Update `first_interaction` to the min.
  - Bump `updated` to today (YYYY-MM-DD).
  - Recompute `strength` (1-5) from the last 90 days of episode entries: 1 (1-2 eps), 2 (3-7), 3 (8-20), 4 (21-50), 5 (51+).

B) `## Episodes` section: append one bullet per new in-window episode, in chronological order. Format:
  `- <ISO 8601 short, e.g. 2026-06-03T07:36> — [[<episode_basename>]] — <one-line context (source type + 4-12 words on what role this person played)>`
  IDEMPOTENCY: before appending, scan the section for the exact `[[<episode_basename>]]` substring; if present, skip. Never reorder or delete existing entries.

C) `## Co-occurrences` section: fully regenerate from the union of all episode bullets in the file. For each episode link, look up its frontmatter `co_mentions` (computed from the index — i.e. who else in our relationship set was mentioned in that episode). Count and rank. Write top 10 as `- [[<slug>]] (Nx)`. Also write a top-5 mirror into the frontmatter `co_occurred_with` array as `[{slug, count}]`.

=== STEP 6: HANDLE AMBIGUOUS MERGES ===
When a mention matches two different existing slugs by different identifiers (e.g., the email maps to slug A but the github maps to slug B), and the pair is not in `known_distinct`, write a file to {PENDING_DIR}/<YYYY-MM-DD>-merge-<slugA>-vs-<slugB>.md:

  ---
  type: pending_merge
  candidate_a: <slugA>
  candidate_b: <slugB>
  evidence:
    - episode: <episode_basename>
      reason: "<why this looks like the same person>"
  confidence: <0.0-1.0>
  created: <YYYY-MM-DD>
  ---

  Resolve by setting `verdict: merge` or `verdict: distinct` in frontmatter and moving this file into _resolved/. The next run will apply it.

Do NOT auto-execute the merge in this run, even at high confidence. The routine only merges via Step 2.

=== STEP 7: PROSE SYNTHESIS BLOCK ===
For each person file touched in this run (or any file where last_interaction is within the window), decide whether to rewrite the SYNTHESIS block. Rewrite IFF any of:
- Episodes added since `synthesis_last_run` ≥ 3.
- (fire_time − synthesis_last_run) ≥ 14 days AND at least 1 episode added.
- A new hard identifier was added (email, github, slack id, linkedin).
- A merge from Step 2 just absorbed another slug into this one.

When rewriting, generate four short sections, each ≤4 sentences, omitting any section with insufficient evidence:

  **How we know each other.** When/where we first overlapped, what context the relationship is in (colleague, customer, friend, founder I met, etc.) — derived from earliest episodes and `how_i_know_them` if set.

  **What they've been doing (work).** Most recent work-related signals from episodes: company, role, projects mentioned, PRs reviewed, threads discussed.

  **What they've been doing (personal).** Only state facts directly attested in an episode body (e.g. mentioned a house move, a holiday, an injury). If nothing attested, OMIT this section entirely. Do not infer mood or vibe.

  **Recent trajectory.** Cadence facts only — frequency of interaction in the last 30/90 days, time since last contact, whether activity is rising/falling. No speculation about why.

Wrap the block exactly between `<!-- SYNTHESIS:START -->` and `<!-- SYNTHESIS:END -->` markers. Prepend `_Last synthesized <YYYY-MM-DD> from N episodes (<first_interaction> → <last_interaction>)._` as the first line inside the markers. Append a footnote-style provenance link `[ep:<episode_basename>]` after each factual claim where possible.

Then update frontmatter: `synthesis_last_run: <ISO 8601>`, `synthesis_episode_count: <total episode bullets in file>`.

NEVER touch the BIO:HUMAN block, the BIO:START/END block (owned by Step 7.5), or content below `## Notes` (preserves user scratchpad). This step only rewrites content between `<!-- SYNTHESIS:START -->` and `<!-- SYNTHESIS:END -->`.

=== STEP 7.5: BIO MAINTENANCE ===
The BIO is a durable identity + relationship-arc description of the person, distinct from the rolling SYNTHESIS block (which is recent activity). It lives in the routine-owned BIO:START/END region. The BIO:HUMAN region above it is hand-edited seed — the routine reads it as a high-priority input but NEVER writes to it.

MIGRATION (first touch of a legacy file): if a file still carries the old `<!-- BIO: hand-edited. Routine never touches. -->` marker and lacks BIO:HUMAN/BIO:START markers, convert it once: move any text between that old marker and `<!-- SYNTHESIS:START` into a new BIO:HUMAN block (use `_(none)_` if that text is empty or the `_(no bio yet)_` placeholder), then insert an empty BIO:START/END block below it (`_(awaiting bio generation)_`). Add `bio_source: none`, `bio_last_generated: null`, `bio_last_tweaked: null` to frontmatter if absent.

ELIGIBILITY: a person is bio-eligible IFF `strength >= 2` (≥3 episodes in the last 90 days) OR their BIO:HUMAN block is non-empty (you have signalled they matter).

SELECTION (cap 5 full regens per run): from bio-eligible people, build the work queue in priority order:
  1. Empty bios — `bio_source == none` or the BIO:START block is still the `_(awaiting bio generation)_` placeholder.
  2. Full-regen due — `bio_source == auto` AND `bio_last_generated` is ≥30 days before fire_time.
Take at most 5. Skip `bio_source: auto` bios whose `bio_last_generated` is <30 days old (they may still get a cheap tweak — see below). Anyone past the cap waits for a future run; record the queued count in the log.

SOFT BUDGET: a full-regen gather is heavy (multiple external searches). If this run has already been going >20 minutes when you reach a not-yet-started full regen, stop starting new full regens, queue the remainder, and note it in the log. Cheap tweaks may still proceed.

FULL REGEN (each selected person, ≤5) — gather read-only context:
  - `slack_read_user_profile` on their slack_user_id for canonical name + title, when available.
  - Exa web search anchored on display_name + company + role + linkedin handle; fetch the top corroborating result(s).
  - Gmail `search_threads` by each known email — all-time, capped to the ~50 newest threads; read enough to extract durable facts. SKIP this pull when the person's ONLY known emails are on the internal domain (the domain of my own email — fyxer.com): internal colleagues' comms live in Slack/GitHub, so the inbox adds little, and the budget is better spent on contacts with an external-domain email. Note the skip in the provenance line as `0 email threads (internal-only, skipped)`.
  - Slack search by slack_handle / slack_user_id — all-time, capped to the ~50 newest messages.
  - Every episode bullet already linked in the file.
  - The BIO:HUMAN seed.
  WRONG-PERSON GUARD: fold in a web fact ONLY when the source is corroborated by company, role, or linkedin. If identity cannot be corroborated, build the bio from email + slack + episodes + human-seed only and add the note `_(no public profile confirmed)_`. Never attribute a web fact to the person on name alone.
  WRITE: replace the BIO:START/END contents with an identity + relationship-arc prose bio (≤~10 sentences) covering: who they are (background, career, public/professional profile); how Joey knows them at an enduring level; and the overall arc of the relationship. BIO:HUMAN facts take precedence on any conflict. Cite every web claim with a source link and every relationship claim with `[ep:<basename>]`. First line inside the markers: `_Bio generated <YYYY-MM-DD> · sources: web(<domains>), <N> email threads, <M> slack msgs, <K> episodes · human-seed: yes|no._` Update the BIO:START comment to `source: auto · last_generated: <date>`. Set frontmatter `bio_source: auto`, `bio_last_generated: <YYYY-MM-DD>`.
  FRONTMATTER BACKFILL (corroborated identities only): if the web/profile identity passed the wrong-person guard, also fill NULL frontmatter fields from it — set `role` if currently null (the verified job title), set `company` if currently null, and add the corroborated LinkedIn handle to `identifiers.linkedin` if null (it will flow into the index on the Step 8 rebuild). NEVER overwrite a non-null value — those may be hand-edited.

CHEAP TWEAK (no external calls; for `bio_source == auto` people NOT selected for full regen): if an in-window episode attests a MATERIAL change — a job / role / company change, a significant new project, or an attested personal life event — rewrite the BIO:START/END prose in place to incorporate only that new fact (with its `[ep:...]` cite), preserving the rest. Bump `bio_last_tweaked: <YYYY-MM-DD>`. Do NOT change `bio_last_generated` (the 30-day full-regen clock keeps running). Anything not material → no tweak; it stays visible in SYNTHESIS only.

DEGRADE GRACEFULLY: if a connector (Exa, Gmail, Slack) is unavailable this run, proceed with whatever sources are available, note which were skipped in the bio provenance line, and still set `bio_last_generated` so the cadence advances. Never fail the run because an external search failed.

Atomic write as with all person files. This step touches ONLY the BIO:START/END region — never BIO:HUMAN, SYNTHESIS, Episodes, Co-occurrences, or Notes.

=== STEP 8: REBUILD _index.json ===
After all person files are updated, rebuild INDEX_FILE from scratch by reading the frontmatter of every `*.md` file in RELS_DIR (excluding files starting with `_`). Populate by_email, by_github, by_slack_id, by_slack_handle, by_linkedin, by_alias_normalized, and slugs. Preserve `known_distinct` from the previous index. Write atomically (write to a tmp file then rename).

=== STEP 9: APPEND TO _log.md ===
Append a section to LOG_FILE:

  ## <ISO 8601 fire_time>
  - window: <window_start> → <window_end>
  - episodes scanned: <N>
  - mentions extracted: <M>
  - persons created: <a>
  - persons updated: <b>
  - merges queued: <c>
  - merges resolved this run: <d>
  - unresolved name-only mentions: <e>
  - synthesis blocks rewritten: <f>
  - bios generated (full regen): <g>
  - bios tweaked: <h>
  - bios queued (over cap / budget): <i>
  - clamp applied: <yes/no>

=== STEP 10: STATE FILE ===
On full success only, overwrite STATE_FILE with window_end (ISO 8601 with offset). If any step errored, do not write STATE_FILE.

=== RULES ===
- Only write inside OBSERVATIONS_DIR (specifically RELS_DIR, LOG_FILE, and STATE_FILE). Never touch EPISODES_DIR or any other path.
- All file writes are atomic: write to `<path>.tmp` then rename, so a crash mid-write never corrupts a person file.
- Idempotent within a window: re-running this routine with the same window must produce the same final state (no duplicate episode bullets, no duplicate identifiers).
- Never invent identifiers. Only record what appears verbatim in an episode.
- Never auto-merge persons; merges are gated on a resolved pending-merge file.
- The BIO:HUMAN block is hand-edited seed: read it as a high-priority bio input, never write to it. The routine owns only the BIO:START/END block.
- Bio full regens are read-only on the outside world (Exa, Gmail, Slack are reads) — the only writes remain inside OBSERVATIONS_DIR. Full regen runs at most every 30 days per person, max 5 per run, gated on `strength >= 2` OR a non-empty BIO:HUMAN block.
- If RELS_DIR is missing, create it and treat the index as empty. If zero in-window episodes, still run bio maintenance (empty/overdue bios may exist), then write a log entry and exit cleanly with STATE_FILE updated.
- Do not run typecheck, lint, or tests. Do not commit anything.

=== REPORT ===
At the end, print:
- path to RELS_DIR
- counts: episodes scanned, mentions extracted, persons created, persons updated, merges queued, unresolved names, synthesis rewrites, bios generated, bios tweaked, bios queued
- the window used and whether STATE_FILE was updated
- a one-line list of newly-created slugs
- a one-line list of any pending merges that need my review
- a one-line list of slugs whose bio was generated or tweaked this run
