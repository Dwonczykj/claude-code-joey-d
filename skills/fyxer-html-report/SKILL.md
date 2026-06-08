---
name: fyxer-html-report
description: Cached builder for Fyxer-branded interactive HTML reports. Renders self-contained reports (brand scaffold + inline logo + tabs/filters/tooltips) from a data JSON via a Python CLI. Used by the weekly HTML scheduled routines (product-weekly, pod-context, recognition) so each run reuses one design system instead of re-deriving it.
---

This skill turns a report **data dict** into a self-contained, Fyxer-branded HTML file. The shared scaffold (brand tokens, header + inline logo, audience/panel tabs, status sub-filter, fast tooltips, status pills, author badges, collapsible drawers, entrance animation, footer) lives here once. Each report only describes its own structure via a **layout** module.

A scheduled routine does its own data collection (read observations, backfill from git/gh, classify, write audience summaries), assembles the data dict for its layout, writes it to a temp JSON, then calls:

```
python3 ~/.claude/skills/fyxer-html-report/build.py \
  --layout <product_weekly|pod_context|recognition> \
  --data <tmp.json> \
  --out <OUTPUT_FILE> \
  --also-latest <OUTPUT_DIR>/latest.html
```

The routine keeps everything after rendering (banned-word scan on the output file, evidence/author drop passes, Slack draft, Slack self-DM with the HTML attached). The builder is read-only apart from writing the two output files; it never invents data.

## Architecture

- `build.py` — CLI: loads the data JSON, imports `layouts/<layout>.py`, calls its `build(report)`, writes the HTML.
- `lib/shell.py` — composes `<head>` + header (inline logo) + controls + body + footer + tooltip div + JS; reads the cached assets; writes files.
- `lib/components.py` — shared fragment helpers: `esc`, `fmt_date`, `tag`, `pill`, `avatar`, `avatar_stack`, `source_link`, `drawer`, `audience_tabs`, `panel_tabs`, `subfilter`.
- `assets/base.css` — the brand design system (tokens + every shared component class).
- `assets/report.js` — generic interactivity: tooltip engine, audience tabs, panel tabs, status sub-filter, select-driven table filter, `location.hash` state. Data-attribute driven, layout-agnostic.
- `assets/fyxer-logo.b64` — the Fyxer wordmark as a `data:` URI, stored once and inlined into every report.
- `layouts/*.py` — one module per report. Each exposes `build(report: dict) -> page: dict`.

To add a new HTML report: add `layouts/<name>.py` with a `build()` returning a page dict, and call `build.py --layout <name>`. No core changes.

## The page dict a layout returns

`build(report)` returns a dict consumed by `lib/shell.py`:

- `title` — `<title>` text.
- `hdr_title` — header H1 text.
- `hdr_sub` — header sub-line (HTML allowed; use `esc` on interpolated values).
- `source_pill` — optional pill text under the header.
- `intro` — optional intro paragraph (already escaped).
- `controls_html` — the tab bar + sub-filter markup (build with `audience_tabs`/`panel_tabs`/`subfilter`).
- `body_html` — the rendered sections/cards.
- `extra_css` — optional layout-specific CSS appended after `base.css`.
- `footer_html` — footer content (HTML allowed).
- `body_attrs` — dict of `<body>` attributes (e.g. default `data-audience` / `data-filter` / `data-panel-active`).

## Interactivity contract (markup ↔ report.js)

- **Audience tabs** (`audience_tabs`): renders `[data-aud-tab]` buttons. Elements tagged `class="aud" data-aud="engineering gtm"` (space-separated audiences) show only when their audience is active. Used to swap card bodies and to hide engineering-only chrome (PR links, repo badges, source drawers) on GTM/Leadership.
- **Panel tabs** (`panel_tabs`): renders `[data-panel-tab]` buttons; sections `data-panel="<key>"` are shown/hidden as whole panels.
- **Sub-filter** (`subfilter`): renders `.subfilter [data-filter]` buttons (mark the default/all button with `all: true`). Items wrapped in `[data-filterable][data-status="<tokens>"]` show only when the active filter matches (or the all button is active). Wrap a subsection in `[data-filter-group]` and it auto-hides when all its filterable children are filtered out.
- **Drawers**: native `<details class="drawer">` (use `components.drawer`).
- **Tooltips**: any element with `data-tooltip="..."` (use `tag(..., tooltip=...)` or set it directly). Never set native `title=` on the same element.
- **Table filtering**: wrap a table region in `[data-rowscope]`, add `<select data-rowfilter="<key>">`, and tag rows `[data-row] data-<key>="<value>"`.

Audience/filter/panel hiding use independent classes (`aud-off`/`filter-off`/`panel-off`) so an element controlled by more than one dimension hides correctly.

## Data dicts per layout

- **product_weekly** — `{ generated_at, author:{handle,email}, weeks:[{ label, released:{features:[item],bugfixes:[item]}, unreleased:{...}, upcoming:[upcoming] }] }`. `item`: `{ title, repo, pr_url, merged_at, summary_engineering, summary_gtm, summary_leadership, sources:[url|{label,url,actor}], needs_synthesis, live, live_evidence:{deploy_pr_url,deploy_pr_merged_at,staging_merged_at}, staged_at }`.
- **pod_context** — `{ week_label, generated_at, pod:[person], sections:{ shipped:{features,bugfixes}, in_progress:{features,bugfixes}, upcoming:[upcoming] }, totals:{...} }`. `item` adds `primary_author`, `contributors:[person]`, `metric_signal`, `mike_value`, `channel_discussion:[{actor,channel,snippet}]`. `person`: `{ email, display, initials, colour_token, fg }`. A card auto-hides on GTM/Leadership when that audience summary is `"—"`.
- **recognition** — `{ week_label, generated_at, kpis:[{value,label,source_label,source_url}], themes:[{title,summary,mike,signal,rows:[ledger_row]}], ledger:[ledger_row], pattern:"<text>", surfaces:[str], sources_count:{observations,episodes,prs} }`. `ledger_row`: `{ title, surface, status:"shipped"|"in-progress", what_changed, evidence:[{label,url}] }`.

Any missing field renders as `—` / is omitted. The KPI strip is omitted entirely when `kpis` is empty.
