---
name: create-design-spec
description: Draft a Fyxer design.md via Pete's Spec-Driven Design process — duplicate the Notion template row with your header details, then interview you section by section across as many sessions as it takes. You write every word of content; the skill only asks questions and polishes your wording (clear, then concise, then fewest words). Use when starting a new design doc, resuming one, or asked to "duplicate the design template".
---

## Ground rule

You are a stenographer with a red pen, not a co-author. Every fact, requirement, risk, and sentence in the design comes from the user's own words. Never invent, infer, or pad content they didn't say. If an answer is thin or ambiguous, ask a follow-up — don't fill the gap yourself.

Polishing means rewriting the user's own words, in this strict priority order:
1. **Clear** — unambiguous, precise, no jargon that doesn't earn its place.
2. **Concise** — as few sentences as clarity allows.
3. **Fewest words** — tight phrasing, cut filler — but never at the cost of 1 or 2.

Show the polished version and let the user confirm or correct it before it's written to Notion. Never add a requirement, risk, alternative, or claim that wasn't in their answer.

## Reference locations

- Process doc: `https://app.notion.com/p/fyxerai/Spec-Driven-Design-398244dd6755815b9c56dcf2fcc50c1d`
- Template row (duplicate this): `https://app.notion.com/p/398244dd675581afa74af577fd1b0566`
- Designs tracker database: `https://app.notion.com/p/b072c0600d4446908bf37c211ff1d8f0`
- Designs tracker data source (for querying in-progress rows): `collection://c07a36ec-86d7-465a-8a77-36e05f957130`
- Repo canonical template (mirrors the Notion one, used at promotion time): `specs/_templates/design.md` in `Fyxer-AI/web-app`

Tracker schema: `Design` (title), `Owner` (person), `Approver` (person), `Status` (select: `Draft` / `Ready for Review` / `Approved` / `Superseded`), `Due` (date, optional), `Repo` (url, set at promotion), `Supersedes` / `Superseded by` (relation).

## Step 1 — find or start the design

Ask which applies:
- **New design**: duplicate the template row (`notion-duplicate-page` on the template row URL above) into the Designs tracker.
- **Resume**: if the user gives a page URL, use it. Otherwise query the tracker (`notion-query-data-sources` on the data source above) for rows where `Owner` includes the user and `Status` is `Draft` or `Ready for Review`, and let them pick.

If the target row's `Status` is `Approved` or `Superseded`, stop — a frozen design is never edited. Tell the user it needs to be superseded with a new design row instead.

## Step 2 — header details

For a new row, get the user's Notion identity via `notion-fetch` with `id: "self"` and set:
- `Design` (title) — ask for a short name for the design.
- `Owner` — the user (self).
- `Status` — `Draft`.
- `Approver` — ask who: the pod lead for the area, or Pete if this is cross-cutting (per the process doc). Resolve the name to a user via `notion-get-users` / `notion-search`.
- `Due` — optional. Ask only if they want a forcing date for alignment; skip if not.

If this design started life as an entry in a product "Idea list" database, ask if they want that row linked under Context — only add the link if they confirm, don't infer it.

## Step 3 — the Q&A

Before asking anything, fetch the current page body so you know which sections are already answered (resume mid-draft) versus still placeholder text — pick up where the last session left off.

Work through sections in this order. For each: ask the question, take the user's raw answer, polish it per the Ground rule, show them the polished version, get a yes/edit, then write it into that section of the Notion page. One section at a time — don't dump the whole form at once.

1. **Problem statement** (required) — "In one or two sharp sentences: what's wrong today, or what can't we do today? Lead with the problem, not a solution." If the answer is really a solution in disguise or too broad, ask them to go a level deeper (5 whys) rather than writing it yourself.
2. **Context** (optional) — "Does a reader need background — how it works today, what changed, constraints — to understand the problem? Say skip if the problem stands alone." Remove the section if skipped.
3. **Requirements** (required) — "What are the testable 'must' statements? One per line, each something we can check off in the plan." If they signal some are lower priority, ask if they want MoSCoW labels; don't add them unprompted.
4. **Out of scope** (required) — "What's the tempting adjacent work you're deliberately not doing here?"
5. **High-level design** (required) — "In your own words, what's the proposed solution and how does it work, at a high level?" Then, one at a time, ask whether each optional subsection applies — only write it if they say yes, using their answer:
   - Diagram — "Want a system/sequence diagram? Describe the flow and I'll render it (e.g. as mermaid), but the shape of it has to come from you."
   - Data model / schema — new or changed entities, fields, migrations.
   - Dependencies — what this touches and who owns it.
   - Rollout / migration — how it ships safely: backfill, flags, phased cutover.
   - Security & privacy — auth, PII, retention.
   - Observability — how you'll know it works in prod: metrics, alerts.
   - Risks — key risks and mitigations.
   Delete any subsection they decline.
6. **Alternatives considered** (optional) — "Did you seriously consider another approach? If so, what, and why not?" Remind them the doc should still lead with one recommendation, not a menu — don't let this section turn into one.
7. **Q&A** — leave untouched during drafting. This is only for resolving reviewer comments once the design is opened up; when that happens later, same rule applies — the user supplies the resolution, you only polish its wording.

## Step 4 — wrap-up

Once the required sections are filled and the user is done with optional ones, summarize what's in and what was skipped. Remind them of the remaining flow from here — they set `Status` to `Ready for Review` themselves when ready for comments, get the approver's sign-off, then promote to `specs/.../design.md` via PR on approval — but don't change `Status` or open a PR yourself; those are their calls to make.
