---
name: collect-git-episodes
description: Collect my git commits and PR activity in the last 24h into Obsidian _episodes/
---

Collect MY git commits and PR activity from the last 24 hours across local Fyxer repos and write one episode file per commit/PR event into the Obsidian vault.

=== IDENTITY (HARD FILTER — ONLY MY WORK) ===
GitHub username: Dwonczykj
Git author email: joey.dwonczyk@fyxer.com
Git author name: Joey Dwonczyk
Reject any commit/PR not matching one of these. Do NOT include teammates' work even if it appears in branches I created.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

REPO_ROOTS: /Users/joey/FyxerGh (recurse one level for repos and worktrees)

SOURCE A — local commits: for each git repo under REPO_ROOTS, run:
  git log --author="Dwonczykj" --author="joey.dwonczyk@fyxer.com" --author="Joey Dwonczyk" --since="24 hours ago" --pretty=format:'%H%x09%ct%x09%s%x09%ae%x09%an' --all
Then in code, drop any row whose author email/name does not match the identity above (defence in depth).
Capture commit SHA, ts (unix), subject, author email, repo name, branch (best effort via `git branch --contains <sha>`), files changed count (`git show --stat`).

SOURCE B — PR events via `gh` CLI, scoped to me only:
  gh search prs --author=Dwonczykj --updated=">$(date -v-1d +%Y-%m-%d)" --json url,title,number,repository,updatedAt,author,state,mergedAt
  gh search prs --reviewed-by=Dwonczykj --updated=">$(date -v-1d +%Y-%m-%d)" --json url,title,number,repository,updatedAt,author,state,mergedAt
  gh search prs --commenter=Dwonczykj --updated=">$(date -v-1d +%Y-%m-%d)" --json url,title,number,repository,updatedAt,author,state,mergedAt
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
- Cut-off: last 24 hours from fire time.
- HARD RULE: every emitted episode must have `actor_handle: Dwonczykj`. If you cannot verify authorship, drop the event silently.

Report: count written, count skipped, count rejected for non-Dwonczykj authorship, any repos/tools that failed.