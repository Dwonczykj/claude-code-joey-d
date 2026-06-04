---
name: autocomplete-eval
description: Run concurrent autocomplete optimization via the Python orchestrator. Spawns parallel workers in separate git worktrees. Invoke with /autocomplete-eval.
disable-model-invocation: true
allowed-tools: Edit, Write, Bash
---

# Autocomplete Eval Orchestrator

## Help

If the user passes `--help` or asks for help with this skill, read and display the contents of `.claude/skills/autocomplete-eval-orchestrator/README.md`. Do not summarize - print it in full. Then stop.

## How This Works

This skill delegates all orchestration to a deterministic Python script at:

```
dataScience/platform/models/autocomplete/eval_orchestrator.py
```

The Python script handles: state machine transitions, process lifecycle (spawn/monitor/kill), signal handling (Ctrl+C), eval parsing, git worktree management, merge decisions, and resume from any crash. You (the Claude Code agent) invoke the script and relay its output to the user.

The creative work (code modification, hypothesis generation) is done by Claude Code subagents that the Python script spawns via `claude -p`. The Python script is the deterministic harness; the subagents are the intelligent actors.

## Optimization Axes

Each axis targets a different lever for improving autocomplete quality. Understanding what each axis controls is critical for effective optimization.

### Three Dimensions of Prompt Optimization

The `prompt` axis operates on `getAutocompletePrompt.ts` but should think about three **separate concerns** when planning iterations:

1. **System prompt instructions** — The rules, examples, and behavioral directives sent as the system message. Controls *how* the model interprets and responds to context. Changes here affect instruction-following, formatting compliance, and output style.

2. **User prompt data inputs** — *What* data is included in the `<autocomplete-context>` XML sent as the user message. This is often **more impactful than formatting**. The data currently includes:
   - `<thread>` — Previous messages in the email thread (sorted ascending by date)
   - `<exchange-messages>` — Up to 5 recent emails between user and recipient from other threads (tone/relationship signal)
   - `<similar-sent-emails>` — Up to 3 semantically similar previously-sent emails (style signal, via Pinecone vector search)
   - `<current-draft>` — The email being composed with `█` cursor marker
   - Thread subject, from/to attributes, recipient info

   Experiments might include: truncating quoted text in thread messages, limiting thread depth, removing signatures from context, summarizing older messages, adjusting what metadata is exposed.

3. **User prompt formatting** — *How* the data is structured and rendered in XML. The XML structure is built in `getAutocompletePrompt.ts` via `renderXmlSpecification()`. The individual email rendering uses `formatEmailForXMLWithTags()` from `xmlUserPromptFormattingUtils.ts`. Changes here affect how clearly the model can parse context — tag naming, attribute choices, ordering, whitespace.

### All Axes

| Axis | Primary concern | Key files |
|---|---|---|
| `prompt` | System prompt instructions + user prompt structure/data | `getAutocompletePrompt.ts` |
| `context` | What context data is fetched and how much | `fetchLookalikesForAutocomplete.ts`, `fetchExchangeMessagesForAutocomplete.ts`, `threadCache.ts` |
| `params` | Model parameters (temperature, maxTokens, model choice) | `runSingleAutocomplete.ts` |
| `prediction` | Post-processing logic (formatting, length, newlines) | `decidePredictionLength.ts`, `insertGreetingNewline.ts`, `ensurePostSentenceFormatting.ts` |

### Requesting Permission for Out-of-Scope Files

Workers are scoped to their assigned files by default. However, a worker may discover that meaningful improvement requires modifying a file outside its scope (e.g., the `prompt` axis may need to change `xmlUserPromptFormattingUtils.ts` to alter how emails are rendered in the user prompt, or the `context` axis may need to adjust query logic in a shared utility).

When this happens, the worker should write a **permission request** to its history log with `result: "permission_requested"` and a clear explanation of which file it needs to modify and why. The orchestrator or human operator can then approve via the `--propose` mechanism. This prevents silent cross-axis conflicts while still allowing workers to surface high-impact opportunities outside their default scope.

Any file in the repo (`/Users/joey/FyxerGh/fyxer-web-app`) is eligible for a permission request. The worker must not modify the file until approval is granted.

## Activation

```bash
/autocomplete-eval                        # Full run, all 4 axes
/autocomplete-eval --axes prompt,params    # Subset of axes
/autocomplete-eval --target 0.50           # Custom target
/autocomplete-eval --resume                # Resume from crash
/autocomplete-eval --status                # Check on a running/completed run
/autocomplete-eval --help                  # Show README
```

## What To Do When Invoked

### New run

```bash
cd /Users/joey/FyxerGh/fyxer-web-app
python dataScience/platform/models/autocomplete/eval_orchestrator.py \
  [pass through any flags the user provided]
```

The script runs to completion (or until interrupted). It handles everything:
1. Validates git state
2. Runs baseline eval
3. Creates worktrees
4. Spawns subagents (one per axis)
5. Monitors agents, printing progress every 30s
6. Collects results, ranks agents
7. Merges winner, cherry-picks non-overlapping improvements
8. Runs final 25-user validation
9. Cleans up worktrees
10. Generates report

### Resume after crash

```bash
python dataScience/platform/models/autocomplete/eval_orchestrator.py --resume
```

### Check status mid-run (from a separate terminal)

```bash
python dataScience/platform/models/autocomplete/eval_orchestrator.py --status
```

### Steer an agent mid-run

```bash
python dataScience/platform/models/autocomplete/eval_orchestrator.py \
  --propose params "Lower temperature from 0.7 to 0.3"
```

### After completion

Read the report at the results directory printed by the script. Present the summary to the user:
- Baseline vs final metrics
- Which axes improved and by how much
- What was merged and cherry-picked
- Recommendations for next steps

## Files

```
.claude/skills/
├── autocomplete-eval-orchestrator/
│   └── SKILL.md                            # This skill (you're reading it)
├── autocomplete-eval-worker/
│   └── SKILL.md                            # Subagent template (injected by Python)

dataScience/platform/models/autocomplete/
├── eval_orchestrator.py                    # The Python orchestrator
├── runEvaluation.ts                        # The eval script (not modified)
└── data/evals/
    └── orchestrator-<timestamp>/           # Per-run output
        ├── orchestrator-state.json
        ├── orchestrator.log
        ├── baseline.json
        ├── agent-*-history.jsonl
        ├── agent-*-result.json
        ├── agent-*-stdout.log
        ├── ranking.json
        ├── final-metrics.json
        ├── orchestrator-report.md
        └── proposal-*.json
```

## When Things Go Wrong

| Problem | Fix |
|---|---|
| Script errors on launch | Check Python 3.10+, check `claude` CLI is on PATH |
| Agent crashes mid-run | Script detects dead PIDs, logs the failure, continues with surviving agents |
| All agents fail | Script logs everything, sets phase to `failed`, prints status |
| Ctrl+C during run | Script catches SIGINT, saves state, Ctrl+C again force-kills agents |
| Merge conflict | Script aborts merge, reports conflicting files, sets phase to `failed` |
| Context overflow | Agent dies, script detects missing result, reports which agent(s) failed |
| Need to change strategy | Use `--propose <axis> "<plan>"` from another terminal to steer an agent |
| Want to check progress | Use `--status` from another terminal |

## Notes

- The Python script replaces all prose-based orchestration from v1/v2 of this skill
- Workers use the skill template at `.claude/skills/autocomplete-eval-worker/SKILL.md` - the Python script reads and injects variables into it
- Always run with `--env cached` (hardcoded in the script) to avoid Firestore
- Groq models only (no logprobs, no confidence scoring)
- To reset: `cd /Users/joey/FyxerGh/fyxer-web-app`