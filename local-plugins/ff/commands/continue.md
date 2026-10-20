---
description: "Resume the Fyxer factory from wherever progress.md left off."
---
Resume the software-factory run.

Locate the feature: if a slug arg is given ($ARGUMENTS) use `.scratch/<slug>/`; else derive `<slug>` from the current git branch and look for `.scratch/<slug>/progress.md`; else use the most-recently-modified `.scratch/*/progress.md`. If none exists, say so and suggest `ff:start-feature`. If it's ambiguous, list the candidate `.scratch/*/` dirs and ask which.

Read `progress.md` (the phase checklist + last gate outcome) and `requirements.md` (the locked contract). Report in one line: feature, current phase, next pending step.

Then continue the `start-feature` pipeline from the first pending phase — do NOT redo phases already signed off. Honour every human gate that phase carries (contract sign-off, split approval, spec sign-off if one was requested, plan-review verdict, pre-PR RELEASE). Update `progress.md` at each gate so the run stays resumable. The mapping of phases to the underlying skills is in the `start-feature` skill; follow it. Build each slice in a fresh context window: at the start of every slice after the first, hand the run to a new session via `fork-session`, per "One fresh session per slice" in the `start-feature` skill's Phase 3. If you are resuming into a Phase 3 slice other than the first, this session is that slice's fresh session: build only that slice, then fork the next.

Per-role models follow `~/.claude/ff-models.json` (`/ff:models`) and the same per-run flags as `start-feature` (`--build-model`, `--test-model`, `--verify-model`, `--plan-model`, `--model`); worker vendor follows `/ff:model-provider`. Strip any such flag out of $ARGUMENTS before slug/feature inference.
