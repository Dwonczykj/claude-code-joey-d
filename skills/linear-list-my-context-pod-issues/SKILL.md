---
name: linear-list-my-context-pod-issues
description: List Linear issues assigned to me in the Context Pod Q2 2026 project (team PRE). Use when the user asks "what's on my Linear", "show my Context Pod issues", "what am I working on", or any variant scoped to Context Pod / their own assigned tickets.
---

# List my Context Pod Q2 2026 issues

Lists open Linear issues assigned to Joey in the Context Pod Q2 2026 project.

## Fixed context

- **Project**: Context Pod Q2 2026 (id `d87bb3b5-a155-485b-975b-f6c4bfabad5c`)
- **Team**: Product Engineering (id `d1c8a0b3-dfc0-4f5d-8b93-85ce050b3945`)
- **Assignee**: `me`

## Steps

1. Call the Linear `list_issues` tool (tool name on this machine: `mcp__ac8e4a0b-1ec5-4ab5-8b10-e46579796632__list_issues`) with:
   - `project`: `d87bb3b5-a155-485b-975b-f6c4bfabad5c`
   - `assignee`: `me`
   - `limit`: 50
   - Default: exclude completed/cancelled. If the user asks for "all" or "including done", set `includeArchived: true` and don't filter by state.
2. Render results as a compact markdown list, one issue per line:
   - `- [PRE-123](url) — Title  · _status_  · priority`
   - Group by status (In Progress → Todo → Backlog → others) if there are more than ~8 results.
3. If empty, say so plainly — don't pad.

## Notes

- If the user later asks to drill into an issue, use `get_issue` with the identifier.
- If the Linear MCP tool name differs, search with `ToolSearch` for `list_issues` and load it.
