---
name: gemini-agent
description: Spawn a Google Antigravity (agy, formerly Gemini CLI) agent with arbitrary instructions, optionally pinning a model and reasoning effort. Trigger on "ask gemini to...", "spawn a gemini agent", "get antigravity to...", "delegate to gemini-3.1-pro-high".
---

# gemini-agent

Runs `agy --print` headless with any instructions plus an optional model.

## Requirements
`agy` on PATH, authenticated once already (`agy --print "hi"` succeeds), and the one-time
permissions setup below done once per machine.

## Usage
```
echo "<instructions>" | node ~/.claude/skills/gemini-agent/scripts/run-agent.mjs \
  [--model <slug>] [--effort <level>] [--timeout <seconds>] [--cwd <path>]
```
`--instructions "..."` works instead of piping, for short one-liners. `--cwd` is not
optional for a real review: it becomes agy's `--add-dir`, and without it agy reviews its
own internal scratch directory, not your repo (see Behavior below).

## Model slugs
Effort is now baked into the slug — there is no separate bare model name plus `--effort`
level. Real slugs as of agy 1.1.14 (2026-08-18): `gemini-3.7-flash-high`,
`gemini-3.7-flash-medium`, `gemini-3.7-flash-low`, `gemini-3.6-flash-{high,medium,low}`,
`gemini-3.5-flash-{high,medium,low}`, `gemini-3.1-pro-high`, `gemini-3.1-pro-low`,
`claude-sonnet-4-6`, `claude-opus-4-6-thinking`, `gpt-oss-120b-medium`. For a Pro-tier
review use `gemini-3.1-pro-high`.

These change often. The script cannot live-validate them: `agy models` hangs
indefinitely when spawned without a real TTY (reproduces via both `execFile` and shell
`exec`, with or without `--output-format json` — that flag doesn't exist on this
subcommand either), so calling it from inside a headless wrapper just hangs the whole
tool. The script instead checks against a hardcoded snapshot and fails loudly — a
non-zero exit with the full known-slug list — on anything else. When agy reports a slug
you passed no longer exists, run `agy models` yourself in a real terminal and update
`KNOWN_MODELS` in `scripts/run-agent.mjs`.

## Effort levels
No longer a separate flag value — pick the slug suffix instead (`-high`/`-medium`/`-low`).
`--effort` still exists on `agy` itself (`low|medium|high`) and the script still passes
it through if given, but it's redundant for the Gemini slugs above since they already
encode effort. It may matter for `claude-sonnet-4-6` / `gpt-oss-120b-medium`, untested.

## Permissions setup (one-time per machine)
Headless mode can't prompt for tool permissions, so any tool call that isn't
pre-approved is silently auto-denied and the run comes back empty. Global settings live
at `~/.gemini/antigravity-cli/settings.json` (not `~/.gemini/settings.json` — that path
doesn't exist; confirmed from the binary's own changelog strings). It does not exist by
default and must be created:

```json
{
  "permissions": {
    "allow": [
      "read_file(*)",
      "command(git diff)",
      "command(git log)",
      "command(git show)",
      "command(git status)",
      "command(git branch)",
      "command(grep)",
      "command(rg)",
      "command(find)",
      "command(cat)",
      "command(ls)",
      "command(pwd)",
      "command(wc)"
    ]
  }
}
```

This is the narrowest allow-list that lets a read-only reviewer work: no `write_file`,
no arbitrary `command(*)`, no `--dangerously-skip-permissions`. Rule syntax, reverse-
engineered from the binary (no public docs found): `tool(pattern)` where `pattern` for
`command` matches on a **prefix of the tokens**, not a shell glob — `command(ls)` allows
`ls -la .` (any args), `command(git status)` allows `git status --short` but not
`git diff`, and the bare wildcard `command(*)` allows any command at all (avoid it; it's
the "last resort" `--dangerously-skip-permissions` in disguise). Built-in read-only
tools (its own file-listing/search, distinct from shelling out to `ls`/`grep`) worked in
testing with no allow-rule at all, so this list only needs to cover things the agent
does by shelling out.

If you ever see the exact error `jetski: no output produced — a tool required the
"command" permission...`, don't assume it's `git`/`grep`/etc — check
`~/.gemini/antigravity-cli/cli.log` for `permission check failed: permission check
failed for command "..."` to see what was actually denied. In testing, asking an agent
to "review for bugs" made it try `pnpm --filter functions typecheck` and later
`node -e '...'` to verify a hypothesis, neither of which is on the allow-list — both
correctly denied, not permission-config bugs. Tell review prompts explicitly not to run
build/test/typecheck/lint commands or execute code to test a hypothesis, and to reason
from reading the diff only (see the review-mirror prompt below). For this repo
specifically, `functions` typecheck is already banned for a different reason — see the
repo's own `CLAUDE.md` about `tsc --noEmit` hanging/OOMing on transitive imports.

## Behavior
`agy` does not default to the process's cwd — left unset it operates in its own
internal state/scratch directory (confirmed: asking it to list "the current directory"
with no `--add-dir` returned `~/.gemini/antigravity-cli`, not the target repo). The
script always passes `--cwd` through as `--add-dir` to fix this.

Session flags (`--model`, `--effort`, `--add-dir`) are placed *before* `--print` in the
constructed argv. This isn't cosmetic: `agy --print --model X "prompt"` (model flag
immediately after `--print`, before the prompt text) genuinely breaks — `--print`
appears to consume the very next token as the prompt regardless of what it looks like,
so the model flag gets swallowed as the prompt and the real prompt is silently dropped
(reproduced: it answered a self-introduction instead of the instructed text, and
claimed to be running a different model than the one requested — its self-report of its
own model is not reliable either way, verify independently). `--print <prompt> --model X`
and `--model X --print <prompt>` both work correctly; the script uses the latter.

Appends a fencing instruction telling the agent not to wander and to write its full
answer to a temp file, then reads that file back and falls back to stdout if the file
never shows up. If the result is still empty after that (agy exited 0 with nothing —
this used to be silently treated as success), the script now fails loudly instead:
non-zero exit with a message pointing at the permissions log, since an empty result
under headless mode is almost always a silent tool denial. Deletes the temp file when
done. Default timeout is 600s; Pro-tier reviews of a real diff can take several minutes,
budget accordingly.

## As a review mirror in the factory

`pre-pr-gate`, `solve-in-worktrees` and `start-feature` run this alongside every Codex
review pass, same prompt to both models:

```bash
echo "<the Codex pass prompt, verbatim>
Read-only review: only use git/grep/cat/find/ls to inspect the repo. Do not run
build/test/typecheck/lint commands, and do not execute code to test a hypothesis
(no node -e, no scripts) — reason from reading the diff only. Do not edit, create, or
delete any file." | node ~/.claude/skills/gemini-agent/scripts/run-agent.mjs \
  --model gemini-3.1-pro-high --cwd <worktree path> --timeout 500
```

The read-only caveat block is required, not optional flavour text — without it the
model tries to verify itself by running typecheck/build or ad-hoc `node -e` snippets,
both of which are correctly denied by the permissions allow-list above and the whole
run comes back empty. Two more things the caller must add, because `agy` is not
sandboxed and has no thread resume: end the prompt with *review only — do not edit,
create, or delete any file*, and on later loop rounds re-run fresh against the current
diff rather than trying to continue a thread. Reconciliation of the two models'
findings is canonical in `pre-pr-gate`.

## On failure
Surface the error and stop. Don't try to install or re-authenticate `agy` yourself. Note
that `agy` enforces an account-wide usage quota independent of which model slug you
pick — `Error: Individual quota reached... Resets in <N>h` is not a bug in this skill,
there's nothing to retry until it resets.

## Verification (2026-08-18)
Direct `agy` call, same argv shape the script constructs, against this repo:
```
agy --model gemini-3.1-pro-high --add-dir <repo> --print "Run: git show HEAD~1. Review
the diff for any obvious correctness bugs. [read-only + no-code-execution caveats].
End with a line: VERDICT: OK or a one-sentence issue." --print-timeout 500s
--output-format text
```
→ `VERDICT: OK`. Bad-slug rejection verified fast and non-hanging via the script. A
fresh full-script run against a live Pro-tier slug hit the account-wide quota mid-session
from repeated testing (resets ~2026-08-25); the script's argv construction was diffed
against this working manual call and matches exactly, and the script correctly
surfaced the quota error rather than swallowing it.
