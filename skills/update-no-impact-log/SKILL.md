---
name: update-no-impact-log
description: Draft and add a new entry to Joey's private Fyxer No-Impact Log on Notion, then refresh the read-only vault snapshot. Use when work shipped or was attempted but didn't clear the impact-log bar - unmeasured, flat/zero-adoption, dead-ended, or pure maintenance.
user_invocable: true
arguments: "[what was built or attempted / the PR, ticket, or memory to draw it from]"
---

# update-no-impact-log

Source of truth (Notion, **private to Joey**): `https://app.notion.com/p/3e4244dd6755815d9690edb73d814744`

## Flow

0. If it's unclear whether this genuinely had no impact or just hasn't been checked properly, run `pull-impact-evidence` first before concluding it belongs here.
1. Run `read-no-impact-log` first for current content and format.
2. Draft the entry, same shape as the impact log:
   ```
   ### <Mon[-Mon] Year> - <Title>
   **Delivered:** <what was built or attempted>
   **Outcome:** <what actually happened - zero/flat adoption, no measurement taken, reverted, parked, pure chore - be as concrete as the data allows, don't editorialize down>
   **Lesson:** <one sentence, non-obvious - what would make this clear the bar next time, or what killed it>
   ```
3. Show the drafted entry to Joey before writing (a lighter check than the real impact log since it's private, but still his call which bucket something lands in — some entries are genuinely borderline).
4. On confirmation, `notion-update-page` with `command: "insert_content"` under the correct `## <year>` heading, chronological order.
5. Re-run `read-no-impact-log` to refresh the vault snapshot.

## Notes

- Don't use this as a dumping ground for routine work that was never meant to have standalone impact (a normal bug fix, a small refactor). It's for things that were *attempted* as impact and didn't land, or shipped features still waiting on a verdict.
- If a no-impact entry later gets a real number (adoption picks up, an A/B reads out), move it: draft the impact-log version with `update-impact-log`, then remove the no-impact entry via `notion-update-page update_content` (don't leave it double-logged).
