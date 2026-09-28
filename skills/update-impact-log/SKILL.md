---
name: update-impact-log
description: Draft and add a new entry to Joey's Fyxer Impact Log on Notion, in his established format, then refresh the read-only vault snapshot. Use when Joey ships something with a measurable or clearly strategic outcome and wants it logged.
user_invocable: true
arguments: "[what was built / the PR, ticket, or Slack thread to draw it from]"
---

# update-impact-log

Source of truth (Notion, shared with reviewers for 360/performance review): `https://app.notion.com/p/39c244dd67558154abdbd4dff308effe`

## Flow

0. If the evidence for this entry is thin, contested, or only covers one metric, run `pull-impact-evidence` first to check BigQuery/PostHog/Slack/transcripts before drafting. Skip this step when the evidence is already solid (a clean GrowthBook readout, an unambiguous PR-linked number).
1. Run `read-impact-log` first — you need the current content (exact format, most recent month, existing link style) before drafting, and it's the freshest copy of the page.
2. Draft the entry in the exact established format:
   ```
   ### <Mon[-Mon] Year> - <Title>
   **Delivered:** <what was built, self-initiated vs assigned if relevant>
   **Impact:** <outcome with a hard number where one exists + citation: [\[Slack\]](slackMessage://workspace.slack.com/CHANNEL/TS/TS), [PR #N](url), [GrowthBook](url), [PRE-NNNN](https://linear.app/fyxer-ai/issue/PRE-NNNN)>
   **Lesson:** <one sentence, non-obvious>
   ```
   Bar for this log (this is a reviewer-facing document): a hard number tied to a business metric (conversion, retention, cost, error rate) is the gold standard, but a foundational/strategic build that clearly enables other wins can qualify without one (see existing entries like "Human Data Platform" or "Chat memory foundation"). If it's shipped but genuinely unmeasured with no strategic story, it belongs in the **no-impact log** instead (see `update-no-impact-log`) — don't inflate it to fit here.
3. **Show the drafted entry to Joey and get explicit confirmation before writing** — this page is shared with reviewers (Rich Kirsch et al. use it for 360/performance review), so nothing goes in unreviewed.
4. On confirmation, use `notion-update-page` with `command: "update_content"` (search-and-replace, anchored on the current last line of the relevant `## <year>` section) or `command: "insert_content"` if appending to the very end of the page, to add the entry in chronological order under the correct `## <year>` heading. Don't reformat or renumber existing entries.
5. Re-run `read-impact-log` to refresh the vault snapshot with the new content.

## Notes

- Never write to Notion without Joey's explicit go-ahead on the drafted text — this isn't a private scratchpad.
- Keep the voice consistent with existing entries: terse, outcome-first, one number per entry, no em-dashes.
- Bump nothing else on the page (no properties to update; it's a plain page, title-only).
