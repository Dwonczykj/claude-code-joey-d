---
description: "Write an outward-facing status report for a Build Room: what's done, what's left, how it meets the goal and how close we are, in plain English with PR and Linear links. Pass the room name."
---
Room: $ARGUMENTS (a room name under `~/FyxerGh/build-room/`). With no room, use the room this session orchestrates or belongs to, else list the rooms and ask.

Write a status report someone outside the code could read: a product manager, a lead, the person who asked for the work. Assume they know what a PR, a requirement and a release are. Assume they don't know the room's shorthand.

## Gather (read only, change nothing)

From `<state dir>`: `ledger.md` (goal, decisions, open asks), `tickets.json`, the contract for each feature (`requirements.md` at the root or `features/<slug>/requirements.md`, and `split.md`), and any `tasks/*.md` findings. Refresh the PRs first with `python3 <state dir>/room prs --dir <state dir>`, then read `prs.json`. Look up each ticket's Linear issue (`linear`, `linearIssue`, or a code like `PRE-1234` in a title or PR body) with the Linear connector if you have it. Read no transcripts and no diffs. If you need one fact from a PR, run `gh pr view <n> --json title,body,state,mergedAt`.

Don't trust a state you can't link to. A PR is merged only when GitHub says so. A check passed only when the ledger or an event records it.

## Write

Use these sections, in this order:

1. **Goal.** One or two sentences: what the work is for and who benefits, in the user's terms (e.g. "an admin signs in to an app once for the whole organization, and every rule uses that sign-in").
2. **How close we are.** A plain verdict first ("Done", "Nearly done: one check left", "About half built", "Blocked on …"), then one sentence on why. Be critical. Built but unproven is not done, and merged but not on staging is not shipped. If the goal changed during the work, say so here.
3. **Done.** One line per shipped piece. Say what a user can now do or what changed for them, not what the code does. Each line links its PR as `[#17416](https://github.com/<repo>/pull/17416)` and its Linear issue as `[PRE-1234](https://linear.app/...)` when there is one.
4. **Left to do.** One line per remaining piece: what it is, why it's still needed, what it waits on (a person, a deploy, another piece), and its link.
5. **Moved or dropped.** Work that left this room or was cut, each with where it went or why, so nobody hunts for it.
6. **Decisions needed.** Open questions for a person, each a full sentence with the options. Write "None" if there are none.

Rules:
- Name every piece in English. Write "Create Spaces from new HubSpot deals", never "G2", "B3" or "pr2". The first time a ticket id helps, put it in brackets after the English name.
- Define any term a reader outside the team won't know, once, in a few words.
- Link every PR and Linear issue you mention, every time. Never write a bare `#123`.
- No code identifiers, file paths or session names, unless the reader needs one to act.
- Keep each line to one or two sentences. The whole report should fit on one screen when it can.

Print the report in chat. If the room has a Linear project (`tickets.json` → `linear.project`), offer to post the report as a project update. Post it only on a yes.
