---
name: linear-dashboard-table
description: Render a dashboard-style markdown table of Linear issues, grouped by product sub-area, with columns for PRE hyperlink, linked PR hyperlinks ("PR - #x"), owner, one-line product impact, date added, and priority. Use when the user wants a Linear status table, dashboard view, sprint snapshot, or pod overview that goes beyond a flat list.
---

# Linear dashboard table

Render Linear issues as a grouped markdown dashboard table — one section per product sub-area, columns optimised for at-a-glance triage by an engineering lead.

## Default columns (in order)

1. **PRE** — markdown link to the Linear issue (e.g. `[PRE-2640](https://linear.app/fyxer-ai/issue/PRE-2640)`)
2. **PRs** — markdown links to every PR linked from the issue, with short display text `PR-#<number>`, joined with ` · `. Repo defaults to `Fyxer-AI/web-app` unless the issue's `Links:` block names another repo.
3. **Owner** — assignee first name. `—` if unassigned.
4. **Title / problem solved** — a single line: the rewritten title plus the user/product problem it solves (not just a restatement). Pull from the description's "## Why" or "## Problem" section when present; otherwise infer.
5. **Added** — `createdAt` formatted as `YYYY-MM-DD`.
6. **Priority** — `Urgent` / `High` / `Medium` / `Low` / `None` (decode Linear's `priority.value`: 1=Urgent, 2=High, 3=Medium, 4=Low, 0=None).

The user can ask to add/remove/reorder columns — honour their request without changing the rest of the layout.

## Steps

1. Resolve the issue set from the user's request — usually a project + state filter (e.g. Context Pod Q2 2026, `In Progress`). Use `mcp__ac8e4a0b-1ec5-4ab5-8b10-e46579796632__list_issues` with `project`, `state`, `limit: 100`, `includeArchived: false`. For the Context Pod default the project id is `d87bb3b5-a155-485b-975b-f6c4bfabad5c`.
2. Fetch full detail for each issue in **one parallel batch** of `get_issue` calls — list_issues truncates descriptions, and PR links live in the `attachments[]` array + the `Links:` block at the bottom of the description.
3. Extract PR numbers per issue:
   - `attachments[].url` matching `github.com/<org>/<repo>/pull/(\d+)` → primary source.
   - Plus any `#<number>` mentions in the description body (e.g. "PR-2b — migrate threadConfig.ts to registry — #9813") that aren't already in attachments.
   - Dedupe, preserve discovery order, and render each as `[PR-#<number>](https://github.com/<org>/<repo>/pull/<number>)`.
4. Group the issues by product sub-area. Prefer this order of signals: (a) parent epic (e.g. all children of PRE-2640 → one group), (b) labels (`chat`, `MCP`, etc.), (c) inferred from the title (auth / labels / model layer / infra / research). Name each group with an `###` heading describing the surface, not the ticket cluster (e.g. "Chat — MCP tool contracts", not "Tool improvement tickets").
5. Render the markdown tables. After the tables, add **one short paragraph** (2–3 sentences max) calling out: the highest priorities, the biggest cluster, and anything stale or blocked. Do not pad.

## Style rules

- One sub-area per markdown section. If a section would have only one ticket, still give it its own section — keeps the layout scannable.
- Keep the "Title / problem solved" column to a single line. If the source description is verbose, summarise to the *product impact* — what the user gains when this lands.
- Never invent PR numbers. If an issue has no linked PR, show `—`.
- Never invent priorities. If `priority.value` is `0`, render `None` — don't promote to "Medium" because it feels important.
- Format dates as `YYYY-MM-DD` so they sort visually.
- Use `· ` (middle dot with space) to separate multiple PR links inside a single cell.

## Variants the user may ask for

- **"by owner"** — group by assignee instead of sub-area; keep the same columns.
- **"include backlog"** — add a `state` query for `Backlog` and merge results, with a `Status` column appended.
- **"flat list"** — drop the grouping headings, single table sorted by priority desc then date desc.
- **"with linear status"** — append a `Status` column (`In Progress` / `Todo` / `Code Review` / etc.) before `Added`.

## Where this skill is useful

- Monday-morning pod snapshots
- Sprint mid-point reviews
- Handing off context to a colleague picking up a pod
- Briefing leadership on what's in flight before a check-in
