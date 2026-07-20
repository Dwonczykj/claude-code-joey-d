---
name: fork-prompt
description: Compress the current conversation into a self-contained prompt to paste into a fresh session (a "fork"). Use when the user says "fork-prompt", "/fork-prompt", "fork this conversation", "give me a prompt to continue in a new session", or wants to carry the current context into a clean session with less token bloat.
argument-hint: "[N] — how many of my recent messages to fork back from (default: whole conversation)"
---

# Fork prompt

Produce ONE fenced code block containing a self-contained prompt the user can paste into a fresh session to continue this work with compressed context. You already have the conversation in context — no tool calls needed to read it.

## Step 1 — Determine the fork window

The optional argument `N` is an integer = how many of the **user's** messages to look back.

- `fork-prompt 1` → fork window starts at the user's most recent message.
- `fork-prompt 2` → fork window starts at the user's 2nd-most-recent message.
- No argument → fork window = the entire conversation.

The **fork window** is everything from that user message to now. This is the material you narrate in detail. Everything *before* the window is background — mention it only if the window depends on it.

## Step 2 — Scan the WHOLE session for signals to preserve verbatim

Regardless of the fork window, scan the **entire** session for key named entities and definitions — the load-bearing signals that must survive compression uncompressed:

- File paths, function/class/module names, branch names, commands, env vars
- IDs, URLs, tickets (PRE-XXXX), PR numbers
- Domain terms the user or you *defined* in this session, with their definition
- Explicit decisions, constraints, and rejected approaches ("we decided X", "don't do Y")
- User preferences stated this session

Collect these into a short glossary. Never paraphrase a defined term away — keep the exact name and its meaning.

## Step 3 — Compress proportionally

Compress harder the larger the fork window:

- **Small window** (1–2 messages, or short conversation): keep near-full detail of the recent exchange.
- **Medium window**: summarise the arc, keep concrete specifics.
- **Large window / whole long conversation**: aggressive summary — outcomes and current state only, drop the back-and-forth.

The glossary from Step 2 is exempt — it stays verbatim at every level.

## Step 4 — Emit the fork prompt

Output a single code block with this structure (omit empty sections):

```
## Goal
<what we're trying to achieve>

## Key entities & definitions
<verbatim glossary from Step 2>

## What's happened so far
<compressed narrative of the fork window, per Step 3>

## Current state
<where things stand right now: what's done, what's in flight, open questions>

## Next step
<the immediate next action for the new session>
```

Redact secrets (API keys, passwords, PII). Reference existing artifacts (PRDs, plans, diffs, PRs) by path/URL instead of pasting their contents. Output only the code block plus a one-line note that it's ready to copy.
