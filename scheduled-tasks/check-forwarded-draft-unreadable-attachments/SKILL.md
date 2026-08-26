---
name: check-forwarded-draft-unreadable-attachments
description: One-off: measure demand for parsing more attachment types in forwarded draft requests (PRE-3214 follow-up)
---

Check 7 days of PostHog data for the `FORWARDED_DRAFT_UNREADABLE_ATTACHMENT` event and report whether Fyxer should add parsers for attachment types beyond PDF.

Background: PR Fyxer-AI/web-app#10870 (PRE-3214) fixed a bug where forwarding an attachment-only email to ai@fyxer.com asking for a draft produced no draft and no reply. We now draft against a message whose only content is a PDF (the one attachment type this path can extract text from). For any OTHER non-image attachment on such a forward (docx, xlsx, deck, video, html, etc.) we emit a `FORWARDED_DRAFT_UNREADABLE_ATTACHMENT` PostHog event with properties: `mimeType`, `attachmentCategory` (document/spreadsheet/presentation/video/html/audio/archive/other), `couldDraftFromOtherContent` (boolean — false means we could not draft at all), `threadId`, `integration`. It only started emitting once #10870 reached prod, so confirm the deploy date and note if the window is shorter than 7 days.

Use the PostHog MCP (project "Fyxer AI", eu.posthog.com). First confirm the event exists in the taxonomy (read-data-schema). Then run this HogQL via execute-sql:

SELECT
  properties.attachmentCategory AS category,
  properties.mimeType AS mime_type,
  count() AS events,
  countIf(properties.couldDraftFromOtherContent = false) AS blocked_draft,
  uniq(person_id) AS users
FROM events
WHERE event = 'FORWARDED_DRAFT_UNREADABLE_ATTACHMENT'
  AND timestamp >= now() - INTERVAL 7 DAY
GROUP BY category, mime_type
ORDER BY events DESC

Report: total events and unique users; the breakdown table by category and mime type; how many were `blocked_draft` (no draft produced at all, the highest-value-to-fix cases); and a one-line recommendation on whether any single attachment type has enough volume to justify adding a parser. If the event is absent from the taxonomy or returns zero rows, say so plainly and note the likely cause is low volume or a later-than-expected deploy — do not fabricate numbers. Post the summary to the Slack channel pod-core-product as a short update (find its channel id with slack_search_channels), and also print it here.