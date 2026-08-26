---
name: collect-codex-episodes
description: Collect Codex CLI session episodes from the last 24h into Obsidian _episodes/
model: sonnet
effort: medium
---

Collect Codex CLI session activity from the last 24 hours and write one episode file per session into the Obsidian vault.

NOTE ON PROVENANCE: this collector mirrors collect-claude-episodes but reads from a DIFFERENT coding agent. Codex CLI is OpenAI's local terminal coding agent; Claude Code is Anthropic's. Both are "code" episodes from my work, but the originating tool is distinct — keep that distinction in the frontmatter (`source: codex-cli`, never collapse to `claude-code`) so downstream synthesis can attribute correctly.

EPISODES_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_episodes

SOURCE: Codex CLI session rollouts under ~/.codex/sessions/ (organised as `<year>/<month>/rollout-YYYY-MM-DDTHH-MM-SS-<uuid>.jsonl`, plus some loose rollout-*.jsonl at the directory root). Each .jsonl is one session, one JSON event per line. Use Bash + Read.

For each session whose latest event timestamp is within the last 24h:
1. Derive: session start ts, session end ts, session id (the UUID at the end of the filename), project (best effort — Codex records `cwd` in the session header event; fall back to the parent repo directory if absent), a 1-2 sentence summary of what the session worked on (read the first user message + last assistant message), and any file paths or PR/branch names touched (grep for paths and `gh pr`/`git` invocations in the assistant's tool calls).
2. Write file: {EPISODES_DIR}/{ISO_TS}-codex-{session-id-short}.md where ISO_TS is the session start in YYYY-MM-DDTHH-MM format (local time) and session-id-short is the first 8 chars of the UUID.

Frontmatter (YAML):
---
type: episode
source: codex-cli
source_id: <full session UUID>
source_path: <absolute path to .jsonl>
ts_start: <ISO 8601 with offset>
ts_end: <ISO 8601 with offset>
duration_minutes: <int>
actor: joey
project: <project dir name / cwd basename>
entities: []
---

Body: 1-2 sentence summary, then a bullet list of files touched / commands of note / PRs referenced.

Rules:
- Idempotent: if the target file already exists, skip it.
- Never edit files outside EPISODES_DIR.
- If ~/.codex/sessions/ is empty or unreadable, write a single file YYYY-MM-DD-codex-NORUN.md with body "no sessions found in window" and exit cleanly.
- Do not run typecheck, lint, or tests. Do not commit anything.
- Cut-off window: last 24 hours from the moment this routine fires.
- Always set `source: codex-cli`. Do NOT use `claude-code` — they are different agents and downstream synthesis attributes them separately.

Report at the end: count of episode files written, count skipped (already existed), and the EPISODES_DIR path.
