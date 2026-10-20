---
name: get-slack-channel
description: Resolve a casual channel reference ("core product", "our dev channel", "pirates", "teams", "eng", "context gang", "preview deployments") to its Slack channel name and ID. Use whenever the user asks to draft, send, read or search a message in a named Slack channel, or to request design support, before calling any Slack tool.
---

# get-slack-channel

Map what the user said to a channel below, then use the ID with the Slack tools. Match on meaning, not exact words.

| Channel | ID | What the user might say |
| --- | --- | --- |
| pod-core-product | C0AU5V5C10V | "core product", "the pod channel" |
| pod-core-product-dev | C0BR3TV38QK | "our dev channel", "core product dev" |
| pod-core-product-pirates | C0AUH3Z1B29 | "pirates" |
| pod-teams | C0AUN16RTSM | "teams" |
| xteam-eng | C08J0D54FV2 | "xteam eng", "the eng channel" |
| gang-context-q426 | C0C6ER95L64 | "context gang", "gang context" |
| preview-deployment-notifications | C0BLKTLQKGS | "preview deployments" |
| product-design | C0C5WC70UNA | "product design", "design channel" |

## Channel purposes

- `product-design`: post requests for design support here, after designing a change with Claude Design and storyboarding it. If the user asks to "ask design for help" or "request design support" without naming a channel, use this one.

"Core product" on its own is `pod-core-product`. Only choose a suffixed channel (`-dev`, `-pirates`) when the user says so.

If the request does not clearly match a row, search with `slack_search_channels` and confirm the match with the user before posting anywhere.
