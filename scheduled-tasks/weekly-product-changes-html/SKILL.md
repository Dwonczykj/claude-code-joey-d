---
name: weekly-product-changes-html
description: Generate a weekly interactive HTML report of product changes (last 4 weeks) with Engineering / GTM / Leadership tabs
---

Generate a self-contained interactive HTML report summarizing the last 4 weeks of MY Fyxer product changes, branded, with three audience-specific tabs.

=== IDENTITY (HARD FILTER — ONLY MY WORK) ===
GitHub username: Dwonczykj
Git author email: joey.dwonczyk@fyxer.com
Git author name: Joey Dwonczyk
Linear email: joey.dwonczyk@fyxer.com
EVERY change in this report must be authored by me. Reject teammates' commits, PRs, and Linear items even if they touch the same files or sprint.

OUTPUT_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/product-weekly
OUTPUT_FILE: {OUTPUT_DIR}/{YYYY-Www}.html  (ISO week of the run date)

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes
OBSERVATIONS_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations
REPO_PATHS:
  - /Users/joey/FyxerGh/fyxer-web-app
  - /Users/joey/FyxerGh/fyxer-eval
  (also scan worktrees under /Users/joey/FyxerGh/*-trees/* belonging to these repos)

=== STEP 1: GATHER MY CHANGES (last 28 days) ===

A) From git, for each REPO_PATH:
   - Released commits (mine only):
     `git log origin/main --author="Dwonczykj" --author="joey.dwonczyk@fyxer.com" --author="Joey Dwonczyk" --since="28 days ago" --pretty=format:'%H%x09%ct%x09%s%x09%ae%x09%an' --no-merges`
     Then in code, drop any row whose author email/name is not mine (defence in depth).
   - Unreleased commits (mine only): list local + remote branches; for each branch, list commits not in origin/main authored by me in the last 28 days. Same author filter.
   - PR state via `gh` — ONLY PRs I AUTHORED:
     `gh pr list --repo <owner/repo> --state all --search "author:Dwonczykj updated:>$(date -v-28d +%Y-%m-%d)" --json number,title,state,mergedAt,createdAt,headRefName,url,body,labels,author`
     Verify `author.login == "Dwonczykj"` for every PR before including it. Drop PRs reviewed or commented on but not authored by me.

B) From EPISODES_DIR: load episodes with ts in the last 28 days whose frontmatter `actor_handle: Dwonczykj` OR `actor_email: joey.dwonczyk@fyxer.com`, AND whose `repo` is fyxer-web-app or fyxer-eval (or whose body references those repos AND the actor is me).

=== STEP 2: CLASSIFY EACH CHANGE ===

For each commit / PR (mine only):
- released = merged into origin/main OR commit reachable from origin/main
- unreleased = otherwise, AND repo is fyxer-web-app or fyxer-eval, AND there has been activity in the last 28 days
- type = "feature" | "bugfix" | "other"  (conventional-commit prefix → PR labels → LLM judgment fallback)
- IGNORE "other" (chore, refactor, docs, experiment, test).
- week_commencing = Monday of the ISO week of mergedAt (released) or last commit ts (unreleased), formatted "Week commencing YYYY-MM-DD"

=== STEP 3: STRUCTURE THE DATA ===

Build a JS object embedded inline in the HTML:

  window.REPORT = {
    generated_at: "<ISO>",
    author: { handle: "Dwonczykj", email: "joey.dwonczyk@fyxer.com" },
    weeks: [
      {
        label: "Week commencing 2026-05-27",
        released: { features: [...], bugfixes: [...] },
        unreleased: { features: [...], bugfixes: [...] }
      },
      ...  // 4 weeks, most recent first
    ]
  };

Each change item:
  {
    title: "<PR title or commit subject>",
    repo: "fyxer-web-app" | "fyxer-eval",
    author_handle: "Dwonczykj",
    pr_url: "<URL or null>",
    merged_at: "<ISO or null>",
    summary_engineering: "<2-3 sentences>",
    summary_gtm: "<2-3 sentences>",
    summary_leadership: "<2-3 sentences>",
    sources: ["<episode wikilink or PR URL>", ...]
  }

Audience summaries (generate each from diff/body + linked episodes):

- **Engineering**: what changed in the code/product, breaking changes, migration notes, what to watch in prod. Technical. Cite files/modules.
- **GTM**: client value, share-worthy hook, suggested language, fit with product vision. No jargon.
- **Leadership**: business impact, ladder to PLG / retention / activation if derivable, value to Mike (load the icp skill). Numbers > prose. If impact is not derivable, say "impact pending measurement" — do NOT invent metrics.

If a field can't be derived, write "—". Never invent.

=== STEP 4: RENDER HTML ===

Apply Fyxer branding via the `anthropic-skills:branding` skill (load it at the start of the routine).

- <head>: title "Fyxer product changes — Week of {YYYY-MM-DD} — Joey (Dwonczykj)", inline CSS, Fyxer brand fonts/colours as CSS custom properties.
- <body>:
  - Header: Fyxer wordmark, report title, generated_at timestamp, author handle.
  - Sticky tab bar: "Engineering" | "GTM" | "Leadership". Default Engineering.
  - Segmented "Released / Unreleased" filter.
  - 4 collapsible week sections (most recent first), each with "Features" and "Bug fixes" subsections.
  - Item cards: title, repo badge, merged_at (or "in progress"), PR link, summary for active tab.
- Inline <script>: vanilla JS tab switching with ARIA + arrow keys, released/unreleased filter, collapse/expand, embedded REPORT.

=== STEP 5: WRITE FILE ===
- mkdir -p {OUTPUT_DIR}
- Write {OUTPUT_FILE} (overwrite).
- Also write {OUTPUT_DIR}/latest.html.

=== RULES ===
- HARD RULE: every change rendered in the HTML must be authored by Dwonczykj / joey.dwonczyk@fyxer.com. After building REPORT, run a final pass that drops any item whose author_handle is not "Dwonczykj"; log the count dropped.
- Never invent metrics, PR numbers, or commit SHAs.
- Never modify the repos. Read-only git/gh commands only.
- If `gh` is unavailable, fall back to git-only and note in the footer.
- If both repos are missing locally, write a stub HTML and exit cleanly.
- Do not commit anything. Do not push.

REPORT AT END: path to OUTPUT_FILE, counts per week (released/unreleased × features/bugfixes), count of items dropped by the final not-mine pass, any classification calls that fell back to LLM judgment.