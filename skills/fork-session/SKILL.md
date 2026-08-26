---
name: fork-session
description: Spawn a persistent, resumable Claude Code session in the background, with its own model and reasoning effort, instead of an in-process subagent. Use when the user says "fork a session", "spawn a claude session", "run this in a persistent/resumable session", "background claude agent", or wants a task to keep running and be resumable across turns rather than a one-shot Agent/Task subagent.
argument-hint: "[task] [--model <alias>] [--effort <level>] [--worktree [name]]"
---

# fork-session

Spawns a real, separate `claude` process in the background via `claude --bg`. Unlike
the in-process `Agent` tool, this is a full session with its own resumable history —
addressable later through `ListAgents`/`SendMessage`, or from a terminal via
`claude attach`/`claude logs`/`claude stop`. Use this when the user explicitly wants
persistence/resumability across turns, not for ordinary parallel subagent work (that's
what `Agent` is for).

## Step 1 — Build the prompt

If the task should carry context from the current conversation, compress it the same
way `fork-prompt` does (goal, key entities/definitions verbatim, current state, next
step) rather than pasting the raw transcript. If the user gave a self-contained task,
just use that.

## Step 2 — Choose flags

```bash
claude --bg \
  --model <alias-or-full-name> \
  --effort <low|medium|high|xhigh|max> \
  -n "<short-name>" \
  [--worktree [worktree-name]] \
  "<prompt>"
```

- `--model`: alias (`sonnet`, `opus`, `fable`) or full name (`claude-sonnet-5`). Omit to
  inherit the caller's default.
- `--effort`: omit to inherit default; set explicitly when the user asked for a specific
  tier.
- `-n/--name`: always set one explicitly — never let it auto-generate from cwd (that's
  where names like `fyxer-web-app-b9` come from: a directory slug plus a random suffix,
  which tells you nothing about the task and is useless for linking a session back to
  what it's for). Build it as `<action>-<subject>`, both short kebab-case words:
  - `action` is what the session is *doing* — `gate`, `review`, `fix`, `rebase`,
    `stage2`, `migrate`, `docs` — not a generic word like `task` or `work`.
  - `subject` is the most durable handle a human would recognize later — prefer a
    ticket/issue number (`pre3245`) or PR number (`pr11216`) over a branch name or free
    text description, since those don't drift as the task's wording changes and they're
    exactly what someone greps `claude agents` for six months on. Fall back to a short
    slug of the actual subject only when there's no number to anchor to.
  - Good: `stage2-pr11216`, `fix-bot-11168`, `rebase-11168`, `gate-slice-b`,
    `docs-pre3245-followup`. Bad: `fyxer-web-app-b9` (no task info), `task1` / `worker`
    (no subject info), a long free-text sentence (defeats "short").
  - The name shows up in `claude agents`, `/resume`, and the terminal title, so it's the
    *only* thing distinguishing this session from every other one running against the
    same repo — never reuse a name for a different task, and don't let two concurrent
    sessions on the same subject collide (append `-a`/`-b` or a second qualifier if
    genuinely needed, rather than dropping the subject to stay short).
- `--worktree [name]`: add this when the task will edit files in a git repo and
  shouldn't collide with the current working tree (verified: composes cleanly with
  `--bg`, creates `.claude/worktrees/<name>`, session's cwd becomes that worktree). Skip
  it for read-only/research tasks.
- Run from the target `cwd` (or `cd` first) — the background session inherits the
  shell's cwd at spawn time.

## Step 3 — Report back

Report the printed name/id and the three ways to interact with it:
- From this or another session: `ListAgents` to see it, `SendMessage({to: "<name>",
  message: "..."})` to resume it with full context — this is the same mechanism used
  for in-process peers, no special-casing needed.
- From a terminal: `claude attach <id>` (open interactively), `claude logs <id>` (peek
  output), `claude stop <id>` (kill it).

Do not poll it yourself in a sleep loop — either wait for the user to ask, or use
`SendMessage` once when you actually need the result.

## Caveats

- **Permissions**: a background session that never gets attached still applies the
  caller's permission mode. If the task needs approvals nobody will grant, either pass
  `--permission-mode acceptEdits` (or similar) explicitly, or expect it to stall until
  someone attaches — mention this tradeoff rather than silently picking one.
- **Not free**: this is a separate billed session, not a lightweight subagent. Don't use
  it for work the in-process `Agent` tool already covers.
- **Naming collisions**: `SendMessage` resolves the bare name to whichever session most
  recently claimed it — the `<action>-<subject>` pattern above already avoids most
  collisions since the subject anchor (ticket/PR number) is unique per task; still check
  `ListAgents` before spawning if the user has several sessions going on the same PR or
  ticket.
