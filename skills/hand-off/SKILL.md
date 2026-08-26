---
name: hand-off
description: Turn a task defined in the current session into a self-contained prompt block to paste into a fresh Claude Code session. The block starts with a title line so the new session is well-named, then defines the task and the context needed to carry it out. Use when the user says "hand off", "/hand-off", "hand this task to a new session", "write me a prompt to do X in a fresh session", or wants to spin a task out of the current conversation into a clean one.
argument-hint: "[task description] — optional; if omitted, infer the task from the conversation"
---

# Hand-off

Produce ONE fenced code block the user pastes into a fresh Claude Code session to carry out a task. You already have the conversation in context — no tool calls needed to read it.

Unlike `fork-prompt` (which continues *this conversation*), a hand-off is forward-looking: it packages a single **task** to execute, with only the context that task needs. Drop the back-and-forth; keep what's required to do the work.

## Step 1 — Identify the task

If the user passed a task description as the argument, that is the task. Otherwise infer it from the conversation — usually the thing just discussed, decided, or scoped but not yet done. If genuinely ambiguous which of several tasks they mean, ask; otherwise pick the obvious one and proceed.

## Step 2 — Gather the required context

Scan the session for what the new session needs to do this task and nothing more:

- File paths, function/module names, branch names, commands, env vars
- IDs, URLs, tickets (PRE-XXXX), PR numbers
- Decisions and constraints already settled ("do X", "don't do Y", rejected approaches)
- Relevant repo/product conventions raised this session
- Preconditions or current state the task depends on

Keep exact names verbatim — never paraphrase a path, identifier, or defined term. Reference big artifacts (PRDs, plans, diffs) by path/URL instead of pasting them.

## Step 3 — Emit the hand-off block

Output a single code block. The **first line is a title** — a short imperative noun phrase that names the task, so the new session titles itself well (e.g. `Cap tool calls per chat turn (PRE-2761)`). Then the task and its context:

```
<Title: short imperative task name>

## Task
<what to do, in one or two clear sentences — the outcome, not a play-by-play>

## Context
<the required context from Step 2: paths, decisions, constraints, conventions>

## Starting point
<current state and where to begin: what exists, what's done, the first move>

## Done when
<the observable condition that means the task is complete>
```

Omit any section that's genuinely empty. Redact secrets (API keys, passwords, PII). Output only the code block plus a one-line note that it's ready to copy.
