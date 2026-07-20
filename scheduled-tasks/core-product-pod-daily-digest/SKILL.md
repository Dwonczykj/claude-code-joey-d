---
name: core-product-pod-daily-digest
description: Daily Slack digest of customer evidence and Core Product pod updates (Inbox Intelligence, Inbox Overwhelm, Intelligence, Drafts), sent as a DM to self
---

You are running a daily Slack digest routine for Joey Dwonczyk (joey.dwonczyk@fyxer.com) at Fyxer AI.

STEP 1 — Determine lookback window
Check today's date/day of week. If today is Monday, use a 72-hour lookback (to capture Friday and the weekend). For Tuesday through Friday, use a 24-hour lookback.

STEP 2 — Read these Slack channels over the lookback window
Use the Slack tools (slack_read_channel / slack_read_thread) to pull messages and threads posted in that window from each of these channels:
- #pod-core-product (C0AU5V5C10V)
- #pod-core-product-pirates (C0AUH3Z1B29) — private channel
- #pod-model (C0B0NV0RE91)
- #pod-teams (C0AUN16RTSM)
- #quarterly-planning (C0AUM5QMSKT)
- #topic-product-updates (C0A8JKB17M3)
- #xteam-eng (C08J0D54FV2)
- #topic-chat (C0B9G68MHJ9)
- #topic-customer-support-tickets (C08TPH9DJ64)
- #topic-market-insights (C086WJPRM2T)
- #topic-customer-feedback (C062SMMQYHZ)
- #dept-data (C088BED3RS5)
- #help-customer-support (C08H5QUBTQE)
- #help-ticket-escalations (C084XHA6HHS)

STEP 3 — Filter for relevance
Keep only messages/threads that either:
(a) contain customer evidence — direct customer feedback, quotes, complaints, praise, feature requests, or support escalations, OR
(b) relate to Joey's work in the Core Product pod on: Inbox Intelligence, Inbox Overwhelm, Intelligence, or Drafts (these are Fyxer product features/areas).

Discard everything else (routine standup chatter, unrelated eng discussion, etc.).

STEP 4 — Build the digest
For each relevant thread, prepare one dash-list line: a Slack permalink back to the original message/thread, followed by one sentence explaining why it's relevant to Joey's work.

If nothing relevant is found, the message body should just be one short line stating that, e.g. "No relevant customer evidence or core-product-pod updates in the last 24 hours." (or 72 hours on Monday) — do not pad the message or invent items.

STEP 5 — Send the digest
Send the digest as a short Slack message to Joey's own DM with himself ("me" / saved messages / self-DM). Format:
- One line noting the lookback window used (e.g. "Last 24h:" or "Last 72h (Mon):")
- Then the dash-list, one line per item, each with the Slack link and reason
- No headers, no extra preamble, no sign-off — keep it terse

Do not post anything to any channel other than Joey's own self-DM. Do not take any other actions.