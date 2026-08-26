---
name: pr-tree-review
description: Build a pre-review dashboard of recent PRs — a markdown table sorted spec → parent feature → feature → stacked PR, and an Excalidraw tree (root → spec doc → parent feature → feature → stacked-PR chain) whose node colour is merge-readiness heat (green = merged/ready, red = failing checks + many bot comments). Use when the user asks "what work have we done", "show me my recent PRs before I ask for reviews", "what do I need to check", "PR tree", "/pr-tree-review", or wants a visual map of open PRs grouped by feature.
---

# PR Tree Review

Produce two artefacts for a review-readiness sweep of recent PRs:

1. A **markdown table**, rows sorted/grouped **spec → parent feature (if present) → feature → stacked-PR chain**.
2. An **Excalidraw tree** with the same hierarchy, written to `<repo>/webapp-3day-tree.excalidraw` (or a name the user gives) and copied to the clipboard as `excalidraw/clipboard` JSON.

Default repo: `Fyxer-AI/web-app`. Default author: the current user (`@me`). Default window: last 3 days — ask if the user implies a different range.

## Step 1 — gather PRs

List the user's PRs touched in the window:

```bash
gh pr list --repo Fyxer-AI/web-app --author "@me" --state all --limit 60 \
  --json number,title,state,url,headRefName,baseRefName,createdAt,updatedAt,isDraft,mergedAt \
  --jq '.[] | select(.updatedAt > "<ISO_CUTOFF>")'
```

`headRefName`/`baseRefName` give the **stack base**: if a PR's base is another PR's head branch (not `staging`/`main`), it is stacked on that PR. Chain them.

## Step 2 — per-PR facts

For each PR:

- **Unresolved bot comments** — count unresolved review threads opened by a bot. Bots: `cursor`, `chatgpt-codex-connector`, `qodo-code-review`, `coderabbitai`. Do this per PR (the batched GraphQL query 504s):
  ```bash
  gh api graphql -f query='query($n:Int!){repository(owner:"Fyxer-AI",name:"web-app"){pullRequest(number:$n){
    reviewThreads(first:100){nodes{isResolved comments(first:1){nodes{author{login}}}}}}}}' -F n=<PR> \
    --jq '[.data.repository.pullRequest.reviewThreads.nodes[]|select(.isResolved==false)|.comments.nodes[0].author.login]|@tsv'
  ```
  Count only bot logins. Note which bots for the table.
- **Status + checks**:
  ```bash
  gh pr view <PR> --repo Fyxer-AI/web-app --json state,isDraft,reviewDecision,mergeable,statusCheckRollup \
    --jq '[.state,.reviewDecision//"none",.mergeable,([.statusCheckRollup[]?|select(.conclusion=="FAILURE" or .state=="FAILURE")]|length),([.statusCheckRollup[]?|select(.status=="IN_PROGRESS" or .status=="QUEUED")]|length)]|@tsv'
  ```
  If checks fail, name them: `... --jq '[.statusCheckRollup[]?|select(.conclusion=="FAILURE" or .state=="FAILURE")|.name//.context]'`.
- **Linear ticket** — the PR's branch usually contains `PRE-XXXX`; else grep the PR body. Resolve title/status via the Linear MCP `get_issue`. URL form: `https://linear.app/fyxer/issue/PRE-XXXX`.
- **Claude session id** — sessions live under `~/.claude/projects/<slugged-cwd>/*.jsonl`. Branches are built in worktrees so `gitBranch` rarely identifies the owner; instead pick the session that **first emitted the PR URL** (the one that opened it):
  ```bash
  cd ~/.claude/projects/<slug>
  for f in $(grep -l "web-app/pull/<PR>" *.jsonl); do
    ts=$(grep -m1 "web-app/pull/<PR>" "$f" | python3 -c 'import sys,json;print(json.loads(sys.stdin.readline()).get("timestamp",""))'); echo "$ts ${f%.jsonl}"; done | sort | head -1
  ```
  Also cross-check `mcp__ccd_session_mgmt__list_sessions` (has `prNumber`/`title`). Session ids are local — there is no shareable URL; give the id and the `claude --resume <id>` command.

## Step 3 — the table

Sort and group rows in hierarchy order: **spec → parent feature (if present) → feature (Linear ticket) → stacked-PR chain**. Concretely:

1. Check whether a feature's Linear issue names a spec doc (`specs/NNN-<slug>/design.md` in the repo, or the issue description saying "spec NNN" / linking a design PR). Cluster every feature that shares a spec under one `### Spec NNN — <name>` heading, in spec-number order.
2. Within a spec (or for a feature with no spec), if a parent/umbrella feature groups sibling features with no PRs of its own (e.g. "Agentic labelling infrastructure" grouping PRE-3202 + PRE-3169), sub-heading that parent, then list its child features under it.
3. Within a feature, list PRs in stack order (base first, then what stacks on it), not creation order.
4. Features with no spec come after all specced groups, each under their own `### <Feature name>` heading.

Columns per row:

| PR | Title | Status | Unresolved bot comments | Stacked on | Linear | Session |

- Status = merged / approved / review-requested / no-review, plus `N checks failing` when relevant.
- Bot comments = the count, with the bot names in parentheses.
- Stacked on = the base PR (hyperlinked) or `staging`.
- Hyperlink PRs (`[#11179](https://github.com/Fyxer-AI/web-app/pull/11179)`) and Linear tickets.

After the table, add a short **"before you ask for review"** read: the hottest PR (failing + most bots) first, which stacks are blocked, what's approved-and-mergeable now, what merged.

## Step 4 — the Excalidraw tree

Write a spec JSON, then run the bundled generator. The generator lays out a tidy left→right tree with the **same hierarchy as the table** (root → spec doc → parent feature → feature → stacked-PR chain), derives node heat, colours nodes by kind, adds two legends (heat + node kind), binds all connectors, and validates.

Spec shape (nesting is arbitrary — any node may hold `children` and/or `prs`):

```json
{
  "root": "web-app", "root_subtitle": "3-day build",
  "features": [
    { "name": "Agentic email labelling", "subtitle": "spec 005", "kind": "spec",
      "link": "https://github.com/Fyxer-AI/web-app/pull/10798",
      "children": [
        { "name": "Agentic labelling infrastructure",
          "children": [
            { "name": "Relabel learning loop", "subtitle": "PRE-3202",
              "prs": [
                {"number":11163,"title":"retrieve relabel exemplars","status":"APPROVED · 1 bot","bots":1,"approved":true},
                {"number":11168,"title":"shadow-mode gate","status":"no review · 1 bot","bots":1,"base":11163}
              ]},
            { "name": "Relabel exemplar reconcile", "subtitle": "PRE-3169",
              "prs": [ {"number":11091,"title":"reconcile relabel exemplars","status":"MERGED","merged":true} ] }
          ]}
      ]}
  ]
}
```

Node `kind`: set `"kind": "spec"` on a node that represents a `specs/NNN-<slug>/design.md` doc — it gets a distinct colour (violet) from a plain parent-feature grouping node (auto-detected: has `children` but no `prs` of its own → blue) and from a leaf feature node (owns `prs` → light blue). A feature with no spec just sits at the top level of `features` with no `kind`.

PR fields: `number`, `title`, `status` (line-2 text), `bots` (int), flags `merged`/`approved`/`failing`, and `base` (the PR number it stacks on, same group; omit if it hangs off the feature node). Heat is derived from the flags + `bots`, or set `heat` explicitly to one of `merged/ready/warm/orange/hot/red`.

**Work with no PR yet.** If a slice exists only as local/unpushed commits (check `git worktree list` and `git log` in the relevant worktree before assuming it isn't real work), give it a `label` instead of a `number` — omit `number` entirely. It renders without the `#NNNN` prefix and without a fabricated GitHub link (there's nothing to link to), but still stacks normally via `base` referencing a real PR's number, and later real PRs can't stack on it (it has no number to be a `base` target). Example: `{"label":"rule-suggestion-notice","title":"PR-2 slice B: suggestion writer","status":"local only — no PR opened yet","base":11195}`.

**Node links (clickable in Excalidraw).** Every PR node is hyperlinked to its GitHub PR — derived as `https://github.com/{repo_owner}/{repo_name}/pull/{number}` (defaults `Fyxer-AI`/`web-app`; override per-PR with a `url` field, or set `repo_owner`/`repo_name` at the spec top level). Every feature node whose `subtitle` contains a `PRE-XXXX` code links to that Linear issue automatically; a spec node has no such auto-link (specs aren't Linear tickets) so give it an explicit `link` to the design-doc PR. Override any auto-link with a `link` field (or `root_link` on the root). Excalidraw renders these as a small link badge you can click through.

**Grouping rule the user set:** spec docs parent the Linear tickets built under them. The relabel learning loop (PRE-3202) and relabel exemplar reconcile (PRE-3169) both live under a parent feature **`Agentic labelling infrastructure`**, which itself lives under **spec 005** (`kind: "spec"`) — three levels, not two. A feature backed by a spec with no intermediate umbrella (e.g. PRE-3245 under spec 007) skips straight from the spec node to the feature node.

**Non-blocking annotations.** Before drawing a node for something the spec/design doc mentions (an eval, a follow-up, a deferred tuning step), check whether it's actually a ship gate or just a prerequisite/backlog item — read the spec's own wording (`design.md`, `plan.md`), don't assume from context. A real blocker is a normal PR-chain node with a solid arrow. Something real but non-gating goes in the top-level `annotations` array instead:
```json
"annotations": [
  { "near": 11179, "text": "Merge per-expert eval sets", "subtitle": "feeds ε tuning later — not a ship gate (design.md:70)" }
]
```
`near` matches a PR `number` already defined in `features`; works best on a leaf PR (nothing stacked on it) since it renders in the open column to that PR's right. It draws as a dashed amber **ellipse** — deliberately a different shape from every rectangle in the tree — joined by a dashed line with no arrowhead, so it can never be mistaken for a real dependency at a glance. A third legend group explains the shape. Give it an explicit `link` if there's somewhere to point (a tracking issue, the spec section).

Run it, then copy the clipboard flavour and send the file:

```bash
python3 ~/.claude/skills/pr-tree-review/generate_excalidraw.py /tmp/spec.json <repo>/webapp-3day-tree.excalidraw
python3 -c "import json;d=json.load(open('<repo>/webapp-3day-tree.excalidraw'));print(json.dumps({'type':'excalidraw/clipboard','elements':d['elements'],'files':{}}))" | pbcopy
```

Then `SendUserFile` the `.excalidraw` and tell the user it is also on the clipboard (⌘V into any Excalidraw canvas).

## Heat scale (node colour)

Cool = ready to merge, hot = furthest from merge. Comment count drives heat even when a PR is approved (an approved PR with an open bot thread is orange, not green — that is the "still to check" signal). Derivation, in order: merged → green; failing checks or ≥8 bots → red; 4–7 bots → deep orange; 1–3 bots → orange; 0 bots & approved → lime; 0 bots & open → amber.

## Conventions

Excalidraw output follows the house style: plain font (`fontFamily: 2`), `roughness: 0`, edges inserted before nodes so connectors sit behind boxes, connectors bound via `startBinding`/`endBinding`. The generator already does all of this and validates bindings before writing. Always `pbcopy` the `excalidraw/clipboard` JSON after generating.
