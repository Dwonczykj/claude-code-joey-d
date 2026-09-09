---
name: product-release
description: Write a short product-release Slack post in Joey's laddering format - bold title, one-sentence Problem, one-sentence Solution, italic Mike/Eve value lines, footer linking topic-product-release. Defers the "where it appears" detail to screenshots the user adds. Use when Joey ships a feature and wants to announce it, or says "product release message", "release post", "/product-release", "announce this ship".
user_invocable: true
---

# Product Release Message Writer

Write the short Slack post Joey sends when a feature ships. This is NOT the `slack-update` progress format (that's shared-context → done → why, 4 lines, for leadership). A release post is a laddering announcement with screenshots.

## Inputs

You need what shipped. Get it from the PR the user gives you (`gh pr view <n> --repo Fyxer-AI/web-app --json title,body`) or from what they describe. Read the PR's Problem/Changes sections to ground the message in facts - never invent behaviour.

## The format (exact shape)

```
*<Title: what the user can now do, plain language, no emoji>*

*Problem*: <one sentence - what was broken/missing from the user's point of view, using the hyphen ` - ` as a soft separator where needed>

*Solution*: <one sentence - the mechanism in the fewest words, then defer the rest with (see screenshots)>

_*Mike*: <one sentence - what this gives Mike, the bottom-up champion who lives in his inbox and can't afford to miss>._
_*Eve*: <one sentence - what this gives Eve, the buyer who rolls Fyxer out to a team>._

_<#C08H09CHTQQ|topic-product-release>_
```

## Rules that make it sound like Joey (not AI)

- **Defer detail to the screenshots.** In the Solution line, do NOT enumerate where the feature appears (no "sidebar, history, search, universal search") and drop polish adjectives ("everywhere you'd look", "clean read-only transcript"). State the mechanism, then `(see screenshots)`. The reader has the image; the words shouldn't re-describe it.
  - He shipped: `they now appear embedded in chat history (see screenshots) - with an envelope badge and read-only.`
  - He cut from the draft: `they now appear everywhere you'd look - sidebar, history, "Search your chats", universal search - tagged with an envelope badge and opened as a clean read-only transcript.`
- **Ladder to Mike and Eve** (see `.claude/rules/icp.md`). Mike = the individual paying user who can't afford to miss anything in his inbox. Eve = the buyer who mandates Fyxer to a team and wants a consistent/complete record. One sentence each, italicised.
- **No em-dashes** (org rule). Use ` - ` (hyphen with spaces) as the soft separator, which is Joey's actual style.
- **No rocket/emoji in the title.** Bold title only.
- **One sentence per section.** Problem and Solution are each a single sentence. Cut anything the screenshot or the reader already knows.
- Facts stay exact: feature names, addresses like `ai@fyxer.com`, ticket/PR refs.

## Process

1. Read the PR (or the user's description) for the real Problem and Changes.
2. Draft the message in the exact shape above.
3. Present it in a code block so the user can copy it, and remind them to add screenshots before posting (the Solution line points at them).
4. Do not post it. If the user wants it formatted for paste, offer `/format-slack-message`.

## Reference: what Joey actually shipped (2026-09-02)

```
*Your Fyxer email conversations now show up in chat history*

*Problem*: the chats you have with Fyxer over email (ai@fyxer.com) were saved but you could never see them - chat history only listed dashboard chats.

*Solution*: they now appear embedded in chat history (see screenshots) - with an envelope badge and read-only.

_*Mike*: one searchable home for everything he's asked Fyxer, email included, so nothing quietly disappears._
_*Eve*: a complete record of how her team actually uses Fyxer._

_<#C08H09CHTQQ|topic-product-release>_
```
