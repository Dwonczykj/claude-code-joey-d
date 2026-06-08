---
name: collect-git-episodes
description: Collect my git commits and PR activity since the previous successful run into Obsidian _episodes/
---

Collect MY git commits and PR activity since the previous successful run across local Fyxer repos and write one episode file per commit/PR event into the Obsidian vault.

WINDOW DETERMINATION (do this BEFORE any collection):
- STATE_FILE: /Users/joey/.claude/scheduled-tasks/collect-git-episodes/last-successful-run.txt
- At start, read STATE_FILE. If it exists and contains a valid ISO 8601 timestamp, set `window_start` to that timestamp. Otherwise default `window_start` to (fire_time − 24h), but on Mondays default to (fire_time − 72h) to cover the weekend.
- Clamp: if `window_start` is older than (fire_time − 14 days), set it to (fire_time − 14 days) and note the clamp in the final report.
- Collection window = [window_start, fire_time]. Use this window throughout in place of "24 hours ago" / "-v-1d". For `git log`, pass `--since="<window_start ISO 8601>"`. For `gh search prs`, pass `--updated=">YYYY-MM-DD"` where the date is `window_start` formatted to YYYY-MM-DD (and then post-filter by exact timestamp in code, since `gh search` only takes date granularity).
- At END, ONLY after the run has completed without error, overwrite STATE_FILE with `fire_time` formatted as ISO 8601 with offset. If the run errored partway, DO NOT update STATE_FILE so the next run picks back up from the same point.

=== IDENTITY (HARD FILTER — ONLY MY WORK) ===
GitHub username: Dwonczykj
Git author email: joey.dwonczyk@fyxer.com
Git author name: Joey Dwonczyk
Reject any commit/PR not matching one of these. Do NOT include teammates' work even if it appears in branches I created.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

REPO_ROOTS: /Users/joey/FyxerGh (recurse one level for repos and worktrees)

SOURCE A — local commits: for each git repo under REPO_ROOTS, run:
  git log --author="Dwonczykj" --author="joey.dwonczyk@fyxer.com" --author="Joey Dwonczyk" --since="<window_start ISO 8601>" --pretty=format:'%H%x09%ct%x09%s%x09%ae%x09%an' --all
Then in code, drop any row whose author email/name does not match the identity above (defence in depth).
Capture commit SHA, ts (unix), subject, author email, repo name, branch (best effort via `git branch --contains <sha>`), files changed count (`git show --stat`).

SOURCE B — PR events via `gh` CLI, scoped to me only:
  gh search prs --author=Dwonczykj --updated=">YYYY-MM-DD"  (substitute YYYY-MM-DD = the date portion of `window_start`) --json url,title,number,repository,updatedAt,author,state,mergedAt
  gh search prs --reviewed-by=Dwonczykj --updated=">YYYY-MM-DD"  (substitute YYYY-MM-DD = the date portion of `window_start`) --json url,title,number,repository,updatedAt,author,state,mergedAt
  gh search prs --commenter=Dwonczykj --updated=">YYYY-MM-DD"  (substitute YYYY-MM-DD = the date portion of `window_start`) --json url,title,number,repository,updatedAt,author,state,mergedAt
Drop any PR whose `author.login` is not Dwonczykj when emitting an "opened" event; for reviewed/commented events, only emit the event if the review/comment was BY Dwonczykj (use `gh api` on review/comment endpoints to verify).

For each event write {EPISODES_DIR}/{ISO_TS}-git-{repo}-{sha7|pr-number}.md

Frontmatter for commits:
---
type: episode
source: git
source_id: <full sha>
source_url: <github commit URL if derivable>
ts: <ISO 8601>
actor: joey
actor_handle: Dwonczykj
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
ts: <ISO 8601>
actor: joey
actor_handle: Dwonczykj
event: <opened|reviewed|commented|merged>
pr_title: "<title>"
pr_state: <open|merged|closed>
entities: []
---

Rules:
- Idempotent: skip if file exists.
- Never write outside EPISODES_DIR.
- Never run destructive git commands. Read-only.
- If `gh` is not available, skip SOURCE B and note in the report.
- After fetching results from `gh search prs` (which is date-granular), filter in code to drop any event whose `updatedAt` is before `window_start` so the exact-timestamp cutoff is respected.
- Cut-off: the [window_start, fire_time] range determined above. Do not use a hardcoded 24h.
- HARD RULE: every emitted episode must have `actor_handle: Dwonczykj`. If you cannot verify authorship, drop the event silently.

Report: count written, count skipped, count rejected for non-Dwonczykj authorship, any repos/tools that failed, the `window_start`/`window_end` used, and whether STATE_FILE was updated. If any repo/tool failed mid-run, DO NOT update STATE_FILE.