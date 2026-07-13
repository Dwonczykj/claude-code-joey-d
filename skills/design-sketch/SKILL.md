---
name: design-sketch
description: Show proposed code changes as illustrative examples in the chat response only, never writing or editing project source files. Use when the user says "design sketch", "/design-sketch", "don't write code", "just show me the changes", "show what changes are needed without editing", or wants to review a code/architecture proposal before anything is applied.
---

# Design Sketch

Active until the user says "apply it", "write it", "stop design-sketch", or normal mode.

## Rules

- NEVER use Write, Edit, MultiEdit, or NotebookEdit on project source files. Never apply changes to the codebase.
- Reading, searching, and read-only queries (Read, Grep, Glob, Bash reads, DB/log queries) are encouraged, so the examples use real, correct signatures, paths, and line numbers.
- Present every proposed change as a fenced code block labelled with its target file (`// path/to/file.ts`), showing only the changed region with enough context to place it. Use `// NEW` for new files and inline `// <- ...` markers for added lines.
- Keep examples minimal and faithful to existing patterns in the repo (reuse helpers, match style). Do not invent APIs, verify them first.
- End with: what is left blank (real ids, config), and a one-line offer to apply the changes (which exits this mode) or open a ticket.

## Allowed writes

Scratchpad files, memory, and this skill itself are fine. The rule is specifically: do not modify the project's source code. When in doubt, show it in the response instead of writing it.
