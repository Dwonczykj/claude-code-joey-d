---
name: collect-pod-git-episodes
description: Collect pod-engineer (Assem, Richard) git commits and PR activity since the previous successful run into Obsidian _episodes/
---

Collect git commits and PR activity by Assem and Richard (the two engineering pod peers — NOT Joey, NOT Will) since the previous successful run, across local Fyxer repos. Write one episode file per commit/PR event into the Obsidian vault.

This routine is the pod-peer analogue of `collect-git-episodes` (which is hardcoded to Joey only). Together the two routines populate the engineering side of `synthesize-pod-work`'s pod-authored episode partition. Joey runs in `collect-git-episodes`; Will is the product manager (no GitHub account, no git activity by design) and is not collected anywhere.

=== POD-PEER IDENTITY TABLE (HARD FILTER — ONLY THESE TWO) ===
Iterate exactly these two members. For each emitted episode, the matched author's pod_member is recorded in frontmatter; cross-author leakage between the two is forbidden (an Assem-authored commit must never produce a Richard-attributed episode and vice versa).

- pod_member=assem,   display="Assem",   github_handle=asemdi06,   git_emails=[assem.dikhayeva@fyxer.com, assem.dikhayeva@gmail.com]
- pod_member=richard, display="Richard", github_handle=richkirsch, git_emails=[richard.kirsch@fyxer.com, richardmkirsch@gmail.com]

Reject any commit/PR whose author email is not in the union of those `git_emails[]` AND whose GitHub `author.login` is not in {asemdi06, richkirsch}. Joey's commits (Dwonczykj / joey.dwonczyk@fyxer.com) and Will's anything MUST be dropped — Joey is covered by `collect-git-episodes`, Will has no git footprint.

=== WINDOW DETERMINATION (do this BEFORE any collection) ===
- STATE_FILE: /Users/joey/.claude/scheduled-tasks/collect-pod-git-episodes/last-successful-run.txt
- At start, read STATE_FILE. If it exists and contains a valid ISO 8601 timestamp, set `window_start` to that timestamp. Otherwise default `window_start` to (fire_time − 24h), but on Mondays default to (fire_time − 72h) to cover the weekend.
- Clamp: if `window_start` is older than (fire_time − 14 days), set it to (fire_time − 14 days) and note the clamp in the final report.
- Collection window = [window_start, fire_time]. Use this window throughout in place of "24 hours ago" / "-v-1d". For `git log`, pass `--since="<window_start ISO 8601>"`. For `gh search prs`, pass `--updated=">YYYY-MM-DD"` where the date is `window_start` formatted to YYYY-MM-DD (and then post-filter by exact timestamp in code, since `gh search` only takes date granularity).
- At END, ONLY after the run has completed without error, overwrite STATE_FILE with `fire_time` formatted as ISO 8601 with offset. If the run errored partway, DO NOT update STATE_FILE so the next run picks back up from the same point.

=== PATHS ===
EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes
REPO_ROOTS: /Users/joey/FyxerGh (recurse one level for repos and worktrees). Same convention as `collect-git-episodes`.

=== SOURCE A — local commits ===
For each git repo under REPO_ROOTS, for each pod_member, run ONE `git log` per git_email in their `git_emails[]` array (members may have committed under multiple addresses in the same repo or across repos):

  git log --author="<git_email>" --since="<window_start ISO 8601>" --pretty=format:'%H%x09%ct%x09%s%x09%ae%x09%an' --all

Union all rows across emails per member, dedupe by SHA. Then in code, drop any row whose author email is not in the member's `git_emails[]` (defence in depth — `git log --author` matches substrings, so e.g. an `--author="assem.dikhayeva@gmail.com"` query can return a row whose actual `%ae` differs; re-verify).

For each accepted commit row capture: SHA, ts (unix → ISO), subject, author email, author name, repo name, branch (best effort via `git branch --contains <sha>`), files_changed count (`git show --stat <sha> --format=`). Tag the row with its matched `pod_member` and `actor_handle`.

=== SOURCE B — PR events via `gh` CLI ===
For each pod_member, run scoped per-handle queries against the Fyxer-AI org. Use `gh search prs` with `--owner=Fyxer-AI` so cross-org noise is excluded, and `--updated=">YYYY-MM-DD"` with the date portion of `window_start`:

  gh search prs --author=<handle>      --owner=Fyxer-AI --updated=">YYYY-MM-DD" --json url,title,number,repository,updatedAt,author,state,closedAt
  gh search prs --reviewed-by=<handle> --owner=Fyxer-AI --updated=">YYYY-MM-DD" --json url,title,number,repository,updatedAt,author,state,closedAt
  gh search prs --commenter=<handle>   --owner=Fyxer-AI --updated=">YYYY-MM-DD" --json url,title,number,repository,updatedAt,author,state,closedAt

Important: `gh search prs` does NOT expose a `mergedAt` field — derive merge status from `state=="merged"` + `closedAt`. If a precise merge timestamp is needed, call `gh pr view <number> -R <nameWithOwner> --json mergedAt` per PR.

Event classification:
- The `--author` query yields `opened` events (also `merged` if `state=="merged"`).
- The `--reviewed-by` and `--commenter` queries must be verified: only emit a `reviewed` / `commented` event if the review/comment was actually BY the queried handle (use `gh api repos/<owner>/<repo>/pulls/<number>/reviews` and `.../issues/<number>/comments` and filter by `user.login == handle`, then capture the review/comment timestamp as `ts`, not the PR's `updatedAt`).
- For `--author` results, drop any PR whose `author.login` is not the queried handle.

Post-filter all `gh search prs` results in code: drop any event whose effective timestamp is before `window_start` (since `gh search` is date-granular).

=== EPISODE FILES ===
For each event write {EPISODES_DIR}/{ISO_TS}-git-{repo}-{sha7|pr-number}-{pod_member}.md (the `-{pod_member}` suffix prevents collisions when two pod peers touch the same PR — e.g. Richard reviewing Assem's PR).

Frontmatter for commits:
---
type: episode
source: git
source_id: <full sha>
source_url: <github commit URL if derivable>
ts: <ISO 8601>
actor: <assem|richard>
actor_handle: <asemdi06|richkirsch>
actor_email: <matched git email>
pod_member: <assem|richard>
repo: <repo name>
branch: <branch>
files_changed: <int>
subject: "<commit subject>"
entities: []
---

Frontmatter for PR events:
---
type: episode
source: github-pr
source_id: <repo>#<pr number>
source_url: <PR URL>
ts: <ISO 8601 — the event timestamp, not the PR's updatedAt for reviews/comments>
actor: <assem|richard>
actor_handle: <asemdi06|richkirsch>
pod_member: <assem|richard>
event: <opened|reviewed|commented|merged>
pr_title: "<title>"
pr_state: <open|merged|closed>
entities: []
---

=== RULES ===
- Idempotent: skip writing if the target file already exists. (The `{pod_member}` suffix in the filename ensures two members co-touching the same PR get separate episodes, both of which are needed for cluster contributor attribution downstream.)
- Never write outside EPISODES_DIR.
- Read-only — never run destructive git commands and never push.
- If `gh` is not available, skip SOURCE B and note in the report (still emit SOURCE A commits).
- Defence-in-depth: every emitted episode MUST have `actor_handle ∈ {asemdi06, richkirsch}` AND `pod_member ∈ {assem, richard}`. If you cannot verify authorship from the source data, drop the event silently rather than emit ambiguous attribution.
- Cut-off: the [window_start, fire_time] range determined above. Do not use a hardcoded 24h.
- Cooperation with sibling routines: this routine does NOT collect Joey (handled by `collect-git-episodes`) and does NOT collect Will (no git footprint by design — he's the pod PM). Do not "helpfully" expand scope.

=== REPORT ===
Final report must include, per pod_member:
- commit_episodes_written
- pr_episodes_written (broken down by event: opened / reviewed / commented / merged)
- skipped_existing (file already on disk)
- rejected_wrong_author (defence-in-depth drops)

Plus run-level:
- window_start / window_end used
- repos scanned
- any repos/tools that failed (and whether `gh` was available)
- STATE_FILE updated? (yes only if zero mid-run errors)

If both members returned zero events across all repos, still update STATE_FILE (legitimate quiet window) but flag in the report so a regression in the identity table can be spotted manually.