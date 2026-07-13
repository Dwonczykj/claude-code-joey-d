---
name: linear-issue-link
description: Convert a PRE-<number> Linear issue identifier into its Linear URL. Use when the user asks for "link for PRE-1234", "linear link PRE-1234", "get me the linear url for PRE-1234", or pastes one or more bare PRE-XXXX identifiers (including embedded in a sentence) and wants the link(s).
---

# Linear issue link

Pure string templating — no API call, no Linear MCP needed.

## Steps

1. Find every `PRE-<number>` identifier in the request (case-insensitive, e.g. `pre-2877` → `PRE-2877`).
2. For each one, output `https://linear.app/fyxer-ai/issue/PRE-<number>`.
3. If there are multiple, list one link per line in the same order they appeared.

Linear redirects this bare URL to the full slugified one automatically, so no title lookup is required.

## Example

Input: `PRE-2877`
Output: `https://linear.app/fyxer-ai/issue/PRE-2877`
