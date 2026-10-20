# ff — Fyxer factory

The `start-feature` pipeline as a namespaced set of `ff:` commands, so you can run the whole factory or enter at any phase and resume from saved state.

## How `start-feature` works

Idea → open PR through left-shifted, gated phases. Hexagons are **human gates** (hard stops); the per-slice build↔verify loop and the CI loop are the two cycles. State is markdown in `.scratch/<slug>/`; gates are real tool calls (Codex verdict, lint, jest), not self-assessment.

```mermaid
flowchart TD
    A(["Idea / PRE-####"]) --> B["Frame — slug + progress.md"]
    B --> C["Scope — gather-requirements + grill-me"]
    C --> D{{"🔒 requirements.md signed off"}}
    D --> E["Split — pr-split-audit"]
    E --> F{{"🔒 split.md approved"}}
    F --> G{"Spec?"}
    G -->|yes| H["Opus 4.8 High — grill → openspec-propose"]
    H --> I{{"🔒 spec signed off"}}
    G -->|no| J["Per slice, in dependency order"]
    I --> J

    subgraph SLICE ["Per slice — independent leaves in parallel"]
        direction TB
        K["Worktree off origin/staging"] --> L["Plan review — Codex + Gemini + Cursor"]
        L --> M{{"🔒 PLAN OK (3 models)"}}
        M --> N["Build agent ∥ 3 test agents (tests-first)"]
        N --> O["Verify — 3 passes × 3 models"]
        O -->|CHANGES REQUIRED| N
        O -->|RELEASE| P(["Open PR"])
        P --> Q["CI + bot-comments loop"]
        Q -->|not green| Q
        Q -->|green + threads resolved| R(["Slice done"])
    end

    J --> K
    R --> S["Final report vs requirements.md"]

    classDef gate fill:#fef3c7,stroke:#b45309,color:#7c2d12;
    class D,F,I,M gate;
```

Worker provider (build + test agents) follows `/ff:model-provider`; the review panel stays cross-vendor. The deterministic version of the per-slice loop is `ff:build-verify`.

All commands share one state contract: `.scratch/<slug>/` holding `progress.md` (phase checklist + gate outcomes), `requirements.md` (the locked acceptance contract), and `split.md` (the slice plan). Commands that don't take a slug locate the feature by: slug arg → current git branch → most-recently-modified `.scratch/*/progress.md` → ask.

| Command | Does |
|---|---|
| `ff:install` | Check (and help fix) the external deps the factory needs: Cursor CLI, Codex CLI (the `codex` MCP is optional — `codex-agent` uses the CLI directly), the OpenSpec CLI (optional Phase 2.5 spec step), the Qodo CLI (optional `pre-pr-gate` Pass E), then prompt for the `branchPrefix` config. Run this once per machine before the rest. |
| `ff:start-feature <idea\|PRE-####>` | Full pipeline, idea → open PR. Delegates to the `start-feature` skill. |
| `ff:investigate <report>` | Start from a reported bug instead of a feature idea: grill, root-cause, problems + requirements, decide on a spec, then run the factory from Phase 2 onward. |
| `ff:continue [slug]` | Read `progress.md`, resume from the first pending phase. |
| `ff:plan [idea\|PRE-####]` | Phases 0–2 only: frame, scope + lock `requirements.md`, split. Stops at split approval. |
| `ff:build [slug\|slice]` | Worktree + 3-model plan review + build + tests for a slice, as prose (model-driven). Commits locally, no push. |
| `ff:build-verify [slug]` | Same Phase 3 machine as a **deterministic Workflow**: schema'd `PLAN OK`/`RELEASE` verdicts, cross-vendor (Codex+Gemini+Cursor) `parallel()` thunks, capped build↔verify loop over a wave of independent slices, to pre-PR RELEASE. Halts back to you for width questions. Never pushes. |
| `ff:review [branch\|PR\|slug]` | `review-feature`: gate pre-PR (3 models), open PR on RELEASE, loop CI + bots to green. |
| `ff:ci-green [PR]` | Just the CI/bot loop: `fix-bot-comments` until all checks green + threads resolved, asking before any fix that adds more complexity than the feature warrants. |
| `ff:fix-pr [PR]` | Same green-gate as `ff:ci-green`, but reviews the diff with Codex + Cursor *before* each push so fewer bot round-trips are needed. |

The phase commands delegate to skills bundled with this plugin under `skills/` — `gather-requirements`, `pr-split-audit`, `solve-in-worktrees`, `review-feature`, `pre-pr-gate`, `fix-bot-comments`, `discussion-room`, `create-branch`, `create-pr`, `cursor-agent`, `diff-review`, `commit-hang-guard`, `lint-in-ignored-worktree`, `linear-update-issue-on-pr-merge`, `prune-merged-worktrees`, `setup-worktree-webapp`, `get-worktree`, `repo-instructions`, `start-feature` itself. One implementation each, no forks. `grill-me` is the one exception: it's not bundled here because it already ships in the separate `anthropic-skills` plugin, which most installs already have.

### Portability

Everything ff's commands and skills call is bundled inside this plugin (`skills/`, `agents/`, `workflows/`) and referenced via `${CLAUDE_PLUGIN_ROOT}` (or `args.pluginRoot` inside `build-verify-slice.js`, which has no filesystem access of its own) — never a hardcoded `~/.claude/skills/...` path. Enabling `ff@fyxer` on another machine gets you the whole pipeline, no separate skill installs required.

No absolute host paths remain in any skill either. Where a skill needs the repo or a worktree, it derives the path at runtime instead of hardcoding a checkout location:
```bash
# main worktree (env-file source), and where new worktrees go — works wherever the repo is cloned
MAIN=$(git worktree list --porcelain | sed -n 's/^worktree //p' | head -1)
TREES_ROOT=$(bash "${CLAUDE_PLUGIN_ROOT}/scripts/resolveWorktreeRoot.sh" '${user_config.worktreeRoot}')
```
`git worktree list` always prints the main worktree first, so this resolves the same whether it's run from the main checkout or a linked worktree. Home-relative paths (the split-plan dir) use `~/.claude/plans/`, and the "don't run `tsc --noEmit`" rule now points at "the repo's `CLAUDE.md`" rather than one absolute file.

The branch author prefix is a first-class install-time setting, not a hardcoded string. The plugin declares a `branchPrefix` `userConfig` option (see `.claude-plugin/plugin.json`); Claude Code prompts for it when the plugin is first enabled and substitutes it into `create-branch` / `solve-in-worktrees` via the `${user_config.branchPrefix}` token. Leave it blank and the skills fall back to your shell username (`whoami`), so a colleague gets `alice/feat-…` with zero edits. Change it later with `/plugin configure ff`.

Two more install-time options work the same way: `prAssignee` (who `create-pr` assigns PRs to; blank means yourself, `@me`) and `linearProject` (the Linear project `create-pr` searches and `linear-update-issue-on-pr-merge` checks; blank means no project filter).

Where new worktrees go is the fourth option, `worktreeRoot`, resolved by `scripts/resolveWorktreeRoot.sh`. Blank puts them beside the main checkout. Otherwise give an absolute path, a `~/` path, or a path relative to the main checkout, such as `.claude/worktrees` (a gitignored location needs the `lint-in-ignored-worktree` workaround before linting).

## `ff:build` (prose) vs `ff:build-verify` (Workflow)

`start-feature` line 18 flags its own soft spot: the phase ordering and the 3-model vote are prose the model executes by hand, so it *can* skip ahead. `ff:build-verify` is the "promote the orchestrator to a script" answer to that — the Phase 3 machine (plan-review → build + 3 test agents → 3-pass × 3-model verify → capped build↔verify loop) as `workflows/build-verify-slice.js`, where the verdicts are schema-validated objects, the 2-of-3 reconciliation is real code, the loop cap is a real loop, and an interrupted run resumes via `resumeFromRunId` instead of re-running every verify.

What stays out of the script, on purpose (a Workflow is headless and can't call `AskUserQuestion`): the width-question gate (the script returns the questions and halts the slice), the plan-ambiguity gate, and push + PR + CI. Those are the human seams `start-feature` is built around; `ff:build-verify` runs the deterministic stretch *between* them. Cross-vendor diversity is preserved — each reviewer is the real Codex/Gemini/Cursor invoked from inside a thin Claude driver agent, not three Claude agents.

Use `ff:build` when you want to watch and steer a single slice; use `ff:build-verify` for a wave of independent slices you want run to RELEASE hands-off and resumable.

Editing the workflow: the script lives at `workflows/build-verify-slice.js`. Reinstall (or restart) after editing so the installed copy under `plugins/cache/` picks it up, same as the `.md` commands.

## Stay-hot mode (`--stay-hot`)

Opt-in on `ff:build` and `ff:review` to keep your own coding skill from rusting while the factory does the typing. Off by default; only fires when you pass the flag.

- On `ff:build`, at plan-release each task is scored **1–5** (whole number, 5 = "absolutely yes a human should write this") on **blast-radius + inverted build-agent confidence**. The single highest task, only if it hits **5**, is handed to you: the worktree **pauses and blocks** until you've written it, then the agents build the rest and its tests. At most one hand-off per run.
- On `ff:review`, the same score is applied to required fixes; the single highest fix, only if a **5**, is yours to write, blocking the loop until done.

Frequency is the threshold, not a percentage — only a 5 fires, so hand-offs stay rare across features. Every decision is logged (date, slug, phase, score, summary) to `~/.claude/ff-stay-hot.log`. There's no tuner yet: eyeball the log and adjust by hand if 5s fire too often or too rarely.

Not yet honoured by `ff:build-verify` (the deterministic Workflow) — that path needs a new halt reason in `workflows/build-verify-slice.js`, so for now use `ff:build` when you want stay-hot on the build phase.

## Install

Nothing to install in `Fyxer-AI/web-app`. Claude Code loads this folder as a plugin (`ff@skills-dir`) once you trust the repo and start `claude` from the repo root. Run `/ff:install` once per machine to check the external CLIs and set the plugin options. To opt out on your machine, run `claude plugin disable ff@skills-dir`, or set `"ff@skills-dir": false` in `.claude/settings.local.json`.

## Edit

Edit the files under `.claude/skills/ff/` and open a PR to `staging`. The plugin loads in place from each checkout, so there is no version to bump, no marketplace to refresh and no update notice. A change reaches a contributor when their checkout has it, and an older worktree keeps its older version. Run `/reload-plugins` to pick up an edit inside a session.
