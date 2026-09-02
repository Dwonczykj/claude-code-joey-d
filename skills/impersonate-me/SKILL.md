---
name: impersonate-me
description: Rewrite a given message (or draft a reply) in Joey's own voice for a specific channel — Claude Code chat, Slack, or email — using a baked-in tone/quirks profile plus a fresh sample of his recent messages in that channel. Use when Joey says "impersonate me", "make this sound like me", "rewrite this in my voice", "reply as me", or "/impersonate-me".
user_invocable: true
---

# Impersonate Me

Rewrite an existing message, or draft a reply, so it reads like Joey actually wrote it — not a polished AI paraphrase of him. Preserve every fact and the intent of the original message; change only how it's said.

## Step 1: Get the inputs

You need three things before writing anything:

1. **The message to rewrite or reply to.** If the user hasn't pasted it, ask for it (or the thread it replies to).
2. **The channel it's going out on**: Claude Code / internal tool chat, Slack, or email. This is not cosmetic — Joey's voice is genuinely different per channel (see Tone Profile below). If unclear from context, ask.
3. **The audience and stakes**, which sets formality within that channel: a colleague/friend/founder-to-founder message, versus a formal/high-stakes one (legal, contractual, exec-facing, a solicitor, a decision with real consequences). Infer this from who it's to and what it's about; ask only if genuinely ambiguous.

## Step 2: Calibrate with a fresh sample (don't skip this)

The Tone Profile below is the baseline, built from a 14-day Claude Code sample and 3 months of sent email (2026-08). It can drift. Before writing, pull a small fresh sample from the **same channel** as the target message:

- **Claude Code**: use `mcp__ccd_session_mgmt__list_sessions` (recent, non-archived) then `mcp__ccd_session_mgmt__list_events` on 2-3 recent sessions to get verbatim user turns. Use `ToolSearch` with query `select:mcp__ccd_session_mgmt__list_sessions,mcp__ccd_session_mgmt__list_events` first if not already loaded.
- **Slack**: use the Slack MCP server's search/read tools (`slack_search_public_and_private`, `slack_read_channel`, `slack_read_thread`) to pull a handful of Joey's own recent messages, ideally in a channel/DM similar in tone to the target (e.g. a 1:1 vs a broad channel post read differently). `ToolSearch` for `slack search` / `slack read channel` if not loaded.
- **Email**: use the Gmail-like MCP connector's `search_threads` tool with a query like `in:sent newer_than:30d`, then `get_message` (format `PLAIN_TEXT`) on a few. **Confirm which account it's bound to first** (check the `sender` field on a sent message) — Joey has both a personal account (`jdwonczyk.corp@gmail.com`) and a work account (`joey.dwonczyk@fyxer.com` / `.ai`); match the account to who the target message is actually going to (personal contacts vs Fyxer/work contacts). If more than one Gmail-like connector is available and it's not obvious which is which, ask.

Pull only enough to catch recent drift or confirm the target sub-register (e.g. "how does he email a recruiter he's declining" vs "how does he email a solicitor") — 5-10 messages is plenty. Don't re-run the full multi-week research pass this skill's profile was built from.

If a channel's tools aren't reachable (no connector, no permission), fall back to the baked-in profile alone and say so.

## Step 3: Write it

Rewrite the message so it matches the calibrated voice for that channel and stakes level. Rules that apply regardless of channel:

- **Never invent facts, numbers, names, or commitments that weren't in the source message or the user's instructions.** You're changing register, not content.
- **Compress, don't pad.** Every register below is defined by *not* adding words. If your rewrite is longer than a competent-but-generic version would be, cut it back.
- **Match the answer-first shape**: the decision, answer, or ask comes in the first clause. Justification (if any) is one clause, not a paragraph.
- **Preserve technical/factual precision exactly** even when loosening grammar around it — exact numbers, names, PR/ticket references, dates, constant names. The looseness in Joey's voice lives in connective tissue (capitalization, apostrophes, sentence boundaries), never in facts.
- Present the rewritten message back to the user for approval. **Never send, post, or submit it yourself** — drafting only, per standing send-permission rules. If the user wants it sent, that's a separate explicit ask.

## Tone Profile (baseline — recalibrate per Step 2)

### Claude Code / internal tool chat register

This is Joey dictating to a machine, fast, between other tasks.

- Lowercase "i" almost always, not "I".
- Terminal punctuation is optional and often dropped, especially on short lines: "run it now", "where is the pin button", "redeploy the preview".
- Apostrophes drop under speed but aren't a fixed rule: "thats", "wiht", "workign", "functinoality", "Im trying" — genuine typos, not a style to fake perfectly, so vary them, don't apply uniformly.
- Run-on, comma-spliced instructions instead of short sentences, chained with "so"/"and"/" - " (a bare dash as a soft separator standing in for a colon or full stop).
- Multiple imperatives stacked in one message via line breaks rather than split into separate turns.
- Terse one-word/short acknowledgements carry full weight: "yes", "do it", "perfect", "run it now" — no punctuation.
- "o.k." with periods (never "OK"/"okay"), sometimes doubled as a typo ("O.k.k").
- No exclamation marks, no emoji, no filler pleasantries. Flat affect even mid-decision.
- Verb-first imperative phrasing for asks: "Check", "Create", "Close both of", "Make sure X".
- URLs/file paths/code pasted raw mid-sentence rather than described.
- Despite all of the above, exact technical facts are always right: constant names, PR/ticket numbers, thresholds, function names, line numbers.

### Slack / casual messaging to people

Treat as adjacent to the casual-email register below unless a fresh Slack sample says otherwise: short, no fluff, decision-first, sign-off conventions looser than email (often no sign-off at all in a thread).

### Casual email (colleagues, recruiters, founders, acquaintances)

- Full sentences, correct-ish grammar, but typos survive under speed and are never cleaned up retroactively: "HI Akash,, Yes, sorry meant to let hou know, i booked it in for Wednesday at 12:30pm".
- Opens are transactional: "Sure", "Yes", "All good", "Hey," / "Hi X,". No "I hope you're well" unless mirroring one back.
- 1-3 sentences is normal for a reply. A whole message can be one sentence.
- Any decline is one clause of reason, never a paragraph of justification: "I'd like to remove myself from the process please. Really love what you're building but I can't give it the attention it deserves."
- Sign-off + first name almost always: "Best,\nJoey" / "Best wishes,\nJoey" / "Thanks,\nJoey" / occasionally all-lowercase "best,\njoey" in more informal exchanges. Match formality of the sign-off to the formality of the rest of the message.
- Occasional trailing space before a question mark: "at the moment ?".
- Lowercase "i" still surfaces mid-sentence even inside otherwise-correct emails.

### Formal / high-stakes email (legal, contractual, solicitor, exec-facing, anything with real consequences)

- Grammar tightens up here — this is the one place looseness disappears, because the audience and consequence demand precision.
- Structure appears: numbered points, one issue per number, each citing the exact clause/certificate/figure it refers to.
- Still no padding — precision, not verbosity, is the compression tool. Long doesn't mean rambling; it means "one clause per fact, as many facts as needed."
- Sign-off shifts to "Kind regards," and full name ("Joseph Dwonczyk") only in genuinely legal/contractual contexts; "Thanks,\nJoey" still shows up in formal-but-not-legal professional threads.

## What never changes across all three channels

- No padding, no throat-clearing, no "just wanted to check in" openers.
- Answer/decision before justification, always.
- Facts stay exact; only the grammar and formality wrapped around them flexes by channel and stakes.

## Content: what Joey includes and cuts

Tone is only half of it. Joey strips a reply down to what the reader doesn't already know. When rewriting a reply, cut these even when they read as polite or normal:

- **Don't restate the other person's own point back to them.** If a reviewer diagnosed the bug, don't re-explain the diagnosis ("you're right, i'd recorded X after Y so the debounce swallowed it") — they know it, they said it. Go straight to what's new: what you changed and why.
- **No validation openers.** Cut "you were right", "good catch", "great question". The fix is the acknowledgement.
- **No closing nudges or sign-off lines on a thread reply.** Cut "ready for another look", "let me know", "hope that helps". The message ends when the last fact does.
- **A bare reference is a complete statement.** A commit SHA / PR / ticket on its own line ("fixed in 2b99cf814b") needs no sentence around it.
- **Keep every substantive change and its reason** — the *new* information the reader can't get without you. Verbosity is fine here; it's the restating, validating, and hedging that gets cut, never the actual content.

Net shape of a Joey reply: [bare ref if any] → what changed and why, one clause per fact → stop. No lead-in, no send-off.
