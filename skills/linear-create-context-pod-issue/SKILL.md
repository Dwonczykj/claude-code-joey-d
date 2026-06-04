---
name: linear-create-context-pod-issue
description: Create a Linear issue in the "Context Pod Q2 2026" project (team Product Engineering / PRE). Use when the user asks to file, create, add, or open a Linear issue/ticket for the Context Pod, or says "make a Linear issue for X" in a Context Pod context.
---

# Create Linear issue in Context Pod Q2 2026

Creates a new Linear issue in the Context Pod Q2 2026 project on team Product Engineering (PRE).

## Fixed context

- **Team**: Product Engineering (key `PRE`, id `d1c8a0b3-dfc0-4f5d-8b93-85ce050b3945`)
- **Project**: Context Pod Q2 2026 (id `d87bb3b5-a155-485b-975b-f6c4bfabad5c`, url https://linear.app/fyxer-ai/project/context-pod-q2-2026-b1e1968dfcfc)
- **Default assignee**: `me` (Joey — id `885441bc-74c0-40ef-9374-a5b09634507d`)

## Steps

1. Get a title and description from the user. If only a rough one-liner was given, expand into a short description (problem / proposed approach). Ask one clarifying question only if the title is genuinely ambiguous.
2. Call the Linear `save_issue` tool (tool name on this machine: `mcp__ac8e4a0b-1ec5-4ab5-8b10-e46579796632__save_issue`) with:
   - `team`: `d1c8a0b3-dfc0-4f5d-8b93-85ce050b3945`
   - `project`: `d87bb3b5-a155-485b-975b-f6c4bfabad5c`
   - `title`: from user
   - `description`: markdown body (real newlines, not `\n`)
   - `assignee`: `me` unless the user named someone else
   - `priority`: only set if the user specifies urgency
3. Report back the issue identifier (e.g. `PRE-1234`) and URL as a markdown link.

## Notes

- Do not set a status — let Linear use the team default (Backlog/Triage).
- Do not add labels unless the user asks.
- If the Linear MCP tool name differs, search with `ToolSearch` for `save_issue` and load it.
