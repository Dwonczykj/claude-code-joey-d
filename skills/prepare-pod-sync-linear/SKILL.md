---
name: prepare-pod-sync-linear
description: Prepare for the weekly pod sync — build an itemised "did last week / still in flight / tackling this week" list from my Context Pod Linear issues, enriched with synthesized episodes, then interview me on this-week plans/priorities and optionally create new Linear tickets for anything I want to start tracking. Use when the user says "prep my pod sync", "get me ready for standup", "what should I say at the pod sync", or any variant about preparing a weekly Linear/pod update.
user_invocable: true
---

# Prepare pod sync (Linear)

Build a tight, itemised pod-sync prep doc in three buckets — **did last week**, **still in flight (carryover)**, **tackling this week** — grounded in my Context Pod Linear issues + synthesized work history, then interview me to lock in this-week plans and reasons, create Linear tickets for anything new I want to track, and finally save the doc to my vault and DM it to myself on Slack.

This is a **read-then-clarify-then-(optionally)-write** routine. The default is read-only until I confirm new tickets to create. It never closes, deletes, or modifies someone else's issue, and never moves a ticket out of the Context Pod project.

## Identity (hard filter — only my work)

- GitHub username: `Dwonczykj`
- Git author email / Linear email: `joey.dwonczyk@fyxer.com`
- Linear display name: Joey Dwonczyk
- Linear user id: `885441bc-74c0-40ef-9374-a5b09634507d`

Only consider and only ever mutate issues whose assignee is me. Drop everything else from the write phase silently.

## Fixed Linear context

- **Team**: Product Engineering (key `PRE`, id `d1c8a0b3-dfc0-4f5d-8b93-85ce050b3945`)
- **Project**: Context Pod Q2 2026 (id `d87bb3b5-a155-485b-975b-f6c4bfabad5c`, url https://linear.app/fyxer-ai/project/context-pod-q2-2026-b1e1968dfcfc)
- **Default project/assignee for new tickets**: Context Pod Q2 2026 / me

## Tools

Linear MCP tools are prefixed `mcp__ac8e4a0b-1ec5-4ab5-8b10-e46579796632__`. If not already loaded, fetch via `ToolSearch` (`select:list_issues,get_issue,list_comments,list_issue_statuses,save_issue`). The ones used here: `list_issues`, `get_issue`, `list_comments`, `list_issue_statuses`, `save_issue`.

**Always call `list_issue_statuses` for team `d1c8a0b3-dfc0-4f5d-8b93-85ce050b3945` before any `save_issue` state update.** Use the returned state IDs (not names) to set state — the API returns the pre-mutation snapshot, so confirm via the `updatedAt` field that the write landed.

## Window

- **Last week** = the previous ISO week (Mon 00:00 → Sun 23:59 of the week before today).
- **This week** = the current ISO week (Mon 00:00 of this week → now).

Compute both from the system date at run time — do not hardcode. Run `date +"%Y-%m-%d %A (ISO week %V)"` to anchor, then derive the Monday/Sunday boundaries.

## Synthesized source paths (read these first — faster + richer than the API)

- **Episodes**: `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes/`
  - `*linear-PRE-*.md` — Linear events (created / commented / status-changed / assigned-to-me)
  - `*git-web-app-pr-*.md` — PR episodes (links PRs ↔ tickets, merge target)
- **Work-done observations**: `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/`
  - `YYYY-MM-DD-work-done.md` and `YYYY-MM-DD-pod-work.md`
- **Reconciliation**: `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/linear-reconciliation/latest.md`

Prefer the `/search-synthesized-linear-issues` and `/search-synthesized-gh` skills to grep these — they document the exact grep patterns and file formats.

## Steps

### 1. Pull my current Context Pod issues

Run the same query as `/linear-list-my-context-pod-issues`: `list_issues` with `project: d87bb3b5-a155-485b-975b-f6c4bfabad5c`, `assignee: me`, `limit: 50`. Default to excluding completed/cancelled, but ALSO fetch issues moved to Done within **last week**'s window (so they land in the "did last week" bucket) — either widen the query or do a second call without the state filter and keep only recently-completed ones.

Capture per issue: identifier (PRE-xxx), title, state (name + type), url, updatedAt, priority.

**"Awaiting deploy" counts as DONE from my point of view.** A staging merge is the end of my delivery — the staging→prod pipeline is not my work. So treat any ticket in the **Awaiting deploy** state (and, equivalently, **Done**) as shipped: it belongs in the "Did last week / Shipped" bucket, **not** in "Still in flight". Only tickets whose PR is genuinely still open (or that have no PR yet) are in-flight. When fetching, include Awaiting-deploy tickets in the shipped set the same way Done tickets are included.

### 2. Enrich with synthesized history (last-week window)

For the last-week window, gather what I actually did:
- `cat` the `latest.md` reconciliation file for the most recent state-transition audit.
- `grep` the work-done / pod-work observations dated within last week for clusters of work and the PRE-xxx / PR links they reference.
- `ls` + grep `*linear-PRE-*.md` and `*git-web-app-pr-*.md` episodes in the last-week date range; keep only ones where the actor is me (`actor_email: joey.dwonczyk@fyxer.com` / `Dwonczykj`, or `claude-code` which is inherently mine).

Match work items to tickets by explicit PRE-xxx in commits/PR/branch/episode (high confidence) → PR-to-issue link → title similarity (require ≥2 distinctive shared terms; bare verbs don't count).

### 2b. Sweep ALL my open PRs (not just the active window)

The synthesized episodes + recently-merged query only surface work tied to a ticket that moved in the window. Long-lived **open** PRs — and PRs whose ticket is stale or missing entirely — fall through. So always also run, across **every** repo I touch (`web-app`, `eval`, `desktop-app`, and any other Fyxer-AI repo referenced this week):

```
gh pr list --repo Fyxer-AI/<repo> --author Dwonczykj --state open \
  --json number,title,state,isDraft,reviewDecision,baseRefName,headRefName,url,createdAt,updatedAt,body --limit 100
```

For each open PR, resolve its ticket: scan the PR `body` for a `linear.app/.../issue/PRE-xxx` URL or a bare `PRE-xxx` / `Closes PRE-xxx`, else fall back to the title-similarity rule above. Then classify and fold into the buckets:

- **Linked to a ticket already in the doc** → it's covered; just make sure the card carries the PR chip.
- **Linked to a ticket NOT in the doc** (its ticket sat outside the active window — e.g. Backlog/Awaiting-deploy untouched recently) → add the ticket as an in-flight card with the PR chip. Note when the PR's ticket and the PR diverge (e.g. PR is a follow-on to a ticket whose earlier PR already shipped).
- **No ticket at all** → add an in-flight card flagged `no ticket yet` (dark chip) and treat it as a step-5 ticket-creation candidate.
- **Stale** (open > ~21 days, or `updatedAt` > ~14 days ago) → additionally flag under a "Stale open PRs — review or close" group and add it to the decision-callout count. These are the most likely to have been silently dropped.

This sweep is the authoritative source for the **In flight** bucket — never rely on synthesized episodes alone to populate it.

### 3. Draft the three buckets (itemised, short)

Produce a compact markdown doc. Every line is a **short item** — a terse phrase, not a sentence. Link tickets as `[PRE-123](url)`.

```
# Pod sync prep — week of {Mon YYYY-MM-DD}

## ✅ Did last week
- [PRE-123](url) — shipped X (merged → staging)
- [PRE-456](url) — Y investigation done
- (untracked) — Z hotfix · no ticket

## 🔄 Still in flight (carryover)
- [PRE-789](url) — A, blocked on review
- [PRE-234](url) — B, ~50% done

## 🎯 Tackling this week
- (to confirm with you below)
```

For "did last week", include Done-this-week tickets, **Awaiting-deploy tickets (a staging merge = done from my POV — see step 1)**, and untracked work surfaced from synthesis (flag untracked items — they're candidates for step 5). For "still in flight", list only tickets whose PR is genuinely still open or that have no PR yet — **never** put an Awaiting-deploy ticket here. Leave "tackling this week" provisional until the interview.

### 4. Interview me to lock in this week

Use `AskUserQuestion` (or a numbered list if richer than four options) to resolve the plan. Ask, grounded in the buckets above:

1. **Carryover priority** — for each still-in-flight ticket, am I continuing it this week? Which are top priority and **why** (unblock, deadline, dependency for someone else)?
2. **New issues to tackle** — which backlog/Todo Context Pod tickets am I pulling into this week, and why now?
3. **Anything new to track** — work I'm planning that has no ticket yet. For each, capture a title + 1–2-sentence description so it can become a ticket in step 5.

Keep questions tight and reference the specific PRE-xxx items. Don't ask about things already unambiguous from synthesis — surface those as "assuming X, correct me" rather than open questions.

### 4b. Apply state transitions derived from interview answers

**Immediately after the interview** (before creating new tickets), derive and apply state changes to existing tickets. This is non-optional — do not skip even if no new tickets are being created.

**Derive transitions as follows:**

| Interview signal | Transition |
|---|---|
| Ticket confirmed as "tackling this week" and currently in **Backlog** or **Prioritised** | → **In Progress** |
| Ticket confirmed as "actively working on / coding on" and not already started | → **In Progress** |
| Ticket confirmed as "superseded", "put on ice", "close it", or "won't do" | → **Cancelled** |
| Ticket currently in **In Progress** confirmed as no longer being worked on and not done | → **Backlog** (demote) |
| Ticket confirmed as awaiting someone else (blocked) | no state change — add a note if helpful |
| "Awaiting deploy" tickets | no change — pipeline handles these |

**Steps:**
1. Call `list_issue_statuses` for team `d1c8a0b3-dfc0-4f5d-8b93-85ce050b3945` to get exact state IDs.
2. For each derived transition, call `save_issue` with the state **ID** (not the name) — parallel calls are fine.
3. Confirm each write landed by checking `updatedAt` is newer than the run start time in the response.
4. Record each transition as `PRE-xxx: OldState → NewState · reason` for the pod-sync-prep doc and terminal output.

**Guardrails for this step:** only update tickets assigned to me. Never cancel a ticket the user described as "still valuable but not this week" — that maps to a Backlog demotion, not Cancelled. Only cancel on explicit "superseded / won't do / close it" language.

### 5. Create Linear tickets for new work (only on explicit confirmation)

Only after I confirm in step 4. For each new item I asked to track:
- Call `save_issue` with `team: d1c8a0b3-dfc0-4f5d-8b93-85ce050b3945`, `project: d87bb3b5-a155-485b-975b-f6c4bfabad5c`, `title`, `description` (markdown, real newlines — no `\n`), `assignee: me`.
- Don't set a status (let the team default apply) unless the work is already underway, in which case set In Progress.
- Don't set priority/labels unless I specify.
- Record the returned PRE-xxx identifier and fold it into the "tackling this week" bucket with a real link.

**Guardrails**: never create more than 5 tickets per run (list the rest as "deferred — would have created"). Never invent identifiers — only cite IDs returned by a real `save_issue` call. This routine creates, comments, and applies state transitions (step 4b only); it never deletes, re-projects a ticket, or touches an issue assigned to someone else.

### 6. Save the doc + Slack it to me + emit Lightfern kanban HTML

Once the "tackling this week" section is filled in (each item carrying its reason) and any new tickets are created, persist the finished doc in two places:

**a. Vault file.** Write it to the dedicated pod-sync-prep subdirectory:
- `OUTPUT_FILE`: `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/pod-sync-prep/{YYYY-Www}-pod-sync-prep.md`
- Also write a copy to `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/pod-sync-prep/latest.md`
- `mkdir -p` the `pod-sync-prep/` directory first (it may not exist on first run).
- Prepend frontmatter:
  ```
  ---
  type: observation
  kind: pod-sync-prep
  week: {YYYY-Www}
  generated_at: {ISO}
  did_last_week: {int}
  in_flight: {int}
  this_week: {int}
  tickets_created: {int}
  state_transitions: {int}
  ---
  ```
- Append a **State transitions applied** section after the three buckets (omit the section entirely if zero transitions):
  ```
  ## 🔀 State transitions applied
  - PRE-xxx: Backlog → In Progress · actively coding this week
  - PRE-yyy: In Progress → Cancelled · superseded by #9995
  ```

**b. Slack self-message.** Send the **same** doc body (markdown, the part after the frontmatter) to myself via `slack_send_message` with `channel_id: U08G4A2GR89` (my own Slack user id — DMing yourself uses your user_id as the channel). The tool accepts standard markdown (`**bold**`, links, lists, headers), so send it as-is — no HTML conversion needed. If the body exceeds the 5000-char limit, trim the least-important detail rather than splitting; the buckets and ticket links are the priority. Return the message link.

**c. Lightfern kanban HTML (always emit).** Render a 3-column kanban view of the same buckets via the `/fyxer-doc` skill, themed with the bundled Lightfern palette override (soft fern greens — **never** Fyxer orange/parchment for this output).

**Pre-step (PR metadata fetch).** Before building the body, collect every unique PR ref that will appear on a card. The set is the **union** of (a) the open-PR sweep from step 2b — which already pulled my open PRs across every repo, so reuse that result rather than re-querying — and (b) every merged/closed PR referenced by a card (from synthesized episodes, ticket attachments, and the merged-since-window query). For any ref not already fetched, call:

```
gh pr view <n> --repo Fyxer-AI/<repo> --json number,title,state,isDraft,mergedAt,closedAt,reviewDecision,headRefName,baseRefName,url
```

Aggregate into a single JSON map keyed by either the bare PR number (for web-app) or `<repo>#<n>` (for external repos):

```jsonc
{
  "10037": {"n":10037,"t":"…","s":"MERGED","d":false,"r":"APPROVED","b":"staging","h":"joey…","u":"https://…","m":"2026-06-23T…","c":null,"repo":"web-app"},
  "desktop-app#506": {"n":506,"t":"…","s":"OPEN","d":false,"r":null,"b":"main","h":"…","u":"https://…","m":null,"c":null,"repo":"desktop-app"}
}
```

Inline this map verbatim into the body as `<script id="pr-info-data" type="application/json">…</script>`. The bundled hover-tooltip JS auto-discovers `.tag.merged`, `.tag.open`, `.tag.stacked`, `.tag.draft` chips whose textContent matches `(repo#)?N+`, looks them up in `PR_INFO`, and renders a dark popover with PR number, state pill (Merged / Open / Draft / Closed), approval pill (Approved / Changes requested / Pending review), branch refs `head → base`, and the merge/close date. Clicking a chip opens the PR in a new tab and stops propagation so the card's own click handler isn't triggered.

- **Output path:** `/Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/pod-sync-prep/{YYYY-Www}-pod-sync-prep.html` plus a copy at `…/pod-sync-prep/latest.html`.
- **Author the body fragment** (no `<html>`/`<head>` — fyxer-doc wraps it):
  - A summary strip at the top: 4 `.pill` tiles with counts (Done · In flight · This week · Transitions).
  - A `<section class="kanban">` containing three `<div class="kanban-col" data-col="done|flight|this">` blocks — each col gets an `<h3>` with title + `<span class="count">N</span>`, then one `<article class="kanban-card">` per ticket. Card structure:
    ```html
    <article class="kanban-card">
      <a href="LINEAR_URL"><span class="pre-id">PRE-2829</span></a>
      <div class="title">PR-5 import_email_attachments backend</div>
      <div class="meta">
        <span class="tag epic">epic:PRE-2789</span>
        <span class="tag deploy">PR #10042</span>
      </div>
    </article>
    ```
  - Use tags semantically: `win` (green) for experiment wins, `urgent` (red) for P0/Urgent priority, `deploy` (blue) for awaiting-deploy, `epic` (amber) for parent epic links, default fern-mist for everything else.
  - Inside the "Tackling this week" column, prefix theme groups with `<div class="theme-section">Theme N — …</div>` between card runs so the themes from step 4 stay legible.
- **Build invocation:**
  ```
  python3 ~/.claude/skills/fyxer-doc/build.py \
    --title "Pod sync prep — week of {Mon YYYY-MM-DD}" \
    --eyebrow "Context Pod · weekly" \
    --subtitle "{N tickets · {N} transitions applied · generated {ISO}}" \
    --theme white \
    --logo none \
    --extra-css ~/.claude/skills/prepare-pod-sync-linear/lightfern.css \
    --body /tmp/pod-sync-kanban-body.html \
    --out "/path/to/{YYYY-Www}-pod-sync-prep.html"
  ```
  Pass `--logo none` (the Fyxer logo is brand-orange and would clash with the Lightfern theme). Pass `--theme white` so the base white surface picks up the Lightfern overrides cleanly.
- **No Slack upload** for the HTML — it's for the vault and local browsing only. Slack still gets the markdown body from step 6b.

Finally, print to the terminal: the markdown `OUTPUT_FILE` path, the HTML kanban path, the Slack message link, an explicit list of any Linear tickets created (PRE-xxx + URL), and an explicit list of state transitions applied (PRE-xxx: OldState → NewState) so I can audit at a glance.

## Notes

- If the Linear MCP is unavailable, build the prep doc from synthesized files only, note the API was skipped, and create zero tickets.
- The Slack tool is `mcp__821107f7-6b5a-46ec-9ef5-8d53e3dc7c2a__slack_send_message`; if that prefix differs on this machine, search with `ToolSearch` for `slack_send_message`. Always still write the vault file even if Slack fails — report the Slack failure but don't lose the doc.
- All ticket creation must be idempotent within a run — don't double-create if re-invoked the same day for the same item; check `list_issues` / synthesized episodes for an existing matching title first.
- Related skills: `/linear-list-my-context-pod-issues`, `/linear-create-context-pod-issue`, `/search-synthesized-linear-issues`, `/search-synthesized-gh`, `/weekly-update-notion`, `/slack-update`.
