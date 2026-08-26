---
name: create-recognition-of-work-doc
description: Generate a weekly branded HTML recognition document showcasing my contributions, ICP value, and business impact for senior leadership
model: sonnet
effort: medium
---

Generate a self-contained, interactive, Fyxer-branded HTML document that presents the value contributed to the Fyxer product this week. Naturally compelling to senior leadership without ever stating or implying a desire for promotion — the contribution narrative speaks for itself. Read primarily from synthesized OBSERVATIONS; only supplement from raw episodes/PRs when an observation gap exists.

=== IDENTITY ===
Me: Joey Dwonczyk
GitHub: Dwonczykj
Email: joey.dwonczyk@fyxer.com
Role: LLM Operations Lead at Fyxer

=== AUDIENCE (do not name them in the doc; tune for them) ===
Leah, Rich Hollingsworth, Matt, Tom, Archie, Peter (VP Engineering).

=== TONE RULES (CRITICAL) ===
- Never use: "promotion", "promoted", "raise", "level up", "next level", "deserve", "should", "career", "title", "recognition". Never compensation. Run a banned-word scan and FAIL the run if any appear.
- Never first-person advocacy. Present EVIDENCE, not argument.
- Frame in: (a) value to Mike (ICP), (b) movement on business metrics, (c) compounding product/system improvements.
- Confident, understated. Numbers, facts, links — no hype words.
- If a claim can't be evidenced, omit it or "—".

=== INPUTS ===
EPISODES_DIR:     /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes
OBSERVATIONS_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations
OUTPUT_DIR:       /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/recognition
WINDOW: this ISO week (Monday 00:00 → now).

Load: `anthropic-skills:branding`, `anthropic-skills:icp`, and `product-philosophy` / `product-overview` if present.

=== STEP 1: LOAD OBSERVATIONS (PRIMARY) ===
For each date in the week, read {OBSERVATIONS_DIR}/{YYYY-MM-DD}-work-done.md. These are filtered to my work already. Pull each cluster:
{ title, what_changed, shipped, business_impact, why_valuable, sources, observation_date }

=== STEP 2: SUPPLEMENT FROM EPISODES (FALLBACK) ===
For today (no observation may exist yet) OR any date missing a work-done observation in the window, pull MY episodes directly:
- `actor_handle: Dwonczykj` / `actor_email: joey.dwonczyk@fyxer.com`, plus inherently-mine claude/apple-notes.
- Also `gh search prs --author=Dwonczykj --updated=">$(date -v-7d +%Y-%m-%d)"` for merged-or-open PRs.

For each supplementary item, do a lightweight inline cluster (you're producing input rows, not writing observations).

=== STEP 3: BUILD CONTRIBUTION LEDGER ===
For each cluster/item, produce one structured row:
{
  title, shipped_or_in_progress: "shipped"|"in-progress",
  surface: "fyxer-web-app"|"fyxer-eval"|"process"|"research",
  what_changed: "<1-2 sentences, factual>",
  evidence: ["<PR url or episode wikilink>", ...],
  mike_value: "<1 sentence — from observation's why_valuable or derived from episodes; omit if not derivable>",
  metric_impact: "<measured/estimated business-metric movement; omit if not measurable>",
  leverage_note: "<1 sentence on systemic effect; omit if none>",
  source_provenance: "observation" | "episode"
}

DROP any row that lacks at least one evidence link.

=== STEP 4: ROLL INTO THEMES ===
Cluster ledger rows into 3-6 themes (e.g. "Reducing LLM cost", "Tightening eval signal"). Each theme:
- title, 1-sentence summary
- top metric movement (if any)
- ICP framing: how Mike's day improves
- contributing ledger rows

=== STEP 5: BUILD DATA ===
Assemble the `recognition` data dict (see `~/.claude/skills/fyxer-html-report/SKILL.md` for the contract):
```
{
  week_label, generated_at,
  kpis: [{value, label, source_label, source_url}],   // 3-4 real metric movements; [] to omit the strip
  themes: [{title, summary, mike, signal, rows: [ledger_row]}],   // 3-6 themes
  ledger: [ledger_row],   // flat, for the Detail tab
  pattern: "<factual leverage note, evidence-linked>" | "",
  surfaces: ["fyxer-web-app","fyxer-eval","process","research"],
  sources_count: {observations, episodes, prs}
}
ledger_row = {title, surface, status: "shipped"|"in-progress", what_changed, evidence: [{label, url}]}
```
HARD RULE: every ledger_row / theme row must carry a real PR / episode / observation evidence link; drop the rest before building. Never invent metrics, PR numbers, or ICP quotes.

=== STEP 6: RENDER HTML (via the cached builder) ===
Do NOT hand-write HTML/CSS/JS. The `recognition` layout owns the scaffold + KPI strip, Themes/Detail/Pattern panel tabs, the surface/status-filterable ledger table, and the footer. `anthropic-skills:branding` no longer needs loading for tokens/logo (cached in the skill). Write the STEP 5 dict to a temp JSON and render:
```
python3 ~/.claude/skills/fyxer-html-report/build.py \
  --layout recognition \
  --data <tmp.json> \
  --out {OUTPUT_DIR}/{YYYY-Www}-recognition.html \
  --also-latest {OUTPUT_DIR}/latest.html
```
The KPI strip is omitted automatically when `kpis` is empty; an empty `themes` renders the "No qualifying contribution data this week" empty state.

=== STEP 7: CHECKS ===
- The builder wrote OUTPUT_FILE + latest.html.
- HARD RULE: banned-word scan on the built HTML; if any banned word appears, fail the run (rename to `BLOCKED-` and report) rather than serve it.
- Never invent. Read-only.

REPORT: OUTPUT_FILE path, item count, theme count, items_from_observations vs items_supplemented, items dropped for lack of evidence, banned-word scan result.