---
name: autocomplete-eval
description: Orchestrate concurrent subagents to optimize autocomplete model performance. Spawns parallel workers in separate git worktrees, each focused on a different optimization axis. Supports resume after crash, human proposal overrides, and deterministic eval parsing. Invoke with /autocomplete-eval.
disable-model-invocation: true
allowed-tools: Edit, Write, Bash
---

# Autocomplete Eval Orchestrator

## Purpose

Coordinate multiple concurrent Claude Code subagents to optimize autocomplete performance in parallel. Each subagent operates in its own git worktree, focuses on a distinct optimization axis, and reports results back. The orchestrator merges the best improvements.

## Help

If the user passes `--help` or asks for help with this skill, read and display the contents of `.claude/skills/autocomplete-eval-orchestrator/README.md`. Do not summarize - print it in full. Then stop.

## Activation

```bash
/autocomplete-eval
/autocomplete-eval --help
/autocomplete-eval --axes prompt,context
/autocomplete-eval --agents 2
/autocomplete-eval --target 0.50
/autocomplete-eval --iterations 5
/autocomplete-eval --resume              # Resume from last crash/interruption
```

## Configuration

| Setting | Default | Override flag |
|---|---|---|
| Max concurrent agents | 4 | `--agents N` |
| Target Levenshtein | 0.55 | `--target N` |
| Iterations per agent | 5 | `--iterations N` |
| Baseline user count | 5 | `--baseline-users N` |
| Final validation users | 25 | `--final-users N` |
| Auto-merge threshold | 0.02 | `--merge-threshold N` |

### Optimization Axes

By default all 4 axes run concurrently. Override with `--axes` flag (comma-separated):

| Axis ID | Focus Area | Files in scope |
|---|---|---|
| `prompt` | Prompt templates, system prompts, instruction clarity | `getAutocompletePrompt.ts` |
| `context` | Context selection: lookalikes, exchange messages, thread cache | `fetchLookalikesForAutocomplete.ts`, `fetchExchangeMessagesForAutocomplete.ts`, `threadCache.ts` |
| `params` | Model parameters: temperature, maxTokens, model selection | `runSingleAutocomplete.ts` |
| `prediction` | Prediction logic: mid-sentence detection, greeting insertion, formatting | `decidePredictionLength.ts`, `insertGreetingNewline.ts`, `ensurePostSentenceFormatting.ts` |

## Persistent State

All orchestrator state is written to disk so that any crash or context window overflow can be recovered from with `--resume`.

### State file: `$RESULTS_DIR/orchestrator-state.json`

```json
{
  "phase": "agents_running",
  "timestamp": "20240115-143022",
  "base_branch": "main",
  "axes": ["prompt", "context", "params", "prediction"],
  "target_lev": 0.55,
  "merge_threshold": 0.02,
  "max_iterations": 5,
  "user_count": 5,
  "baseline": {
    "levenshtein": 0.68,
    "latency_ms": 342,
    "csv_path": "..."
  },
  "worktrees": {
    "prompt": "../fyxer-eval-prompt",
    "context": "../fyxer-eval-context",
    "params": "../fyxer-eval-params",
    "prediction": "../fyxer-eval-prediction"
  },
  "agent_pids": {
    "prompt": 12345,
    "context": 12346,
    "params": 12347,
    "prediction": 12348
  },
  "completed_agents": ["prompt"],
  "merge_result": null
}
```

**Phase values** (in order):
1. `setup` - validating git state, creating results dir
2. `baseline` - running baseline evaluation
3. `worktrees_created` - worktrees and branches exist
4. `agents_running` - subagents launched, waiting for completion
5. `collecting_results` - all agents done, reading result files
6. `merging` - merging best results
7. `final_validation` - running 25-user validation
8. `cleanup` - removing worktrees
9. `done` - complete

**After every phase transition, write the updated state to disk before proceeding.** This is the resume contract.

## Deterministic Eval Harness

Before starting, create a helper script that both the orchestrator and workers use for parsing eval results. This removes CSV parsing from LLM interpretation.

### Create: `$REPO_ROOT/dataScience/platform/models/autocomplete/parse-eval-results.sh`

```bash
#!/bin/bash
# Usage: ./parse-eval-results.sh <csv_path>
# Outputs JSON with aggregated metrics
# This script is the SINGLE SOURCE OF TRUTH for metric extraction.

set -euo pipefail

CSV_PATH="$1"

if [ ! -f "$CSV_PATH" ]; then
  echo '{"error": "CSV not found: '"$CSV_PATH"'"}' 
  exit 1
fi

# Use awk to compute averages from CSV
# Assumes CSV has headers and columns for levenshtein, latency, scenario
awk -F',' '
BEGIN { lev_sum=0; lat_sum=0; n=0 }
NR==1 {
  for (i=1; i<=NF; i++) {
    gsub(/^[ \t]+|[ \t]+$/, "", $i)
    if ($i ~ /levenshtein/i) lev_col=i
    if ($i ~ /latency/i) lat_col=i
    if ($i ~ /scenario/i) scen_col=i
  }
  next
}
{
  if ($lev_col != "" && $lev_col+0 == $lev_col) {
    lev_sum += $lev_col
    lat_sum += $lat_col
    scenarios[$scen_col] += $lev_col
    scenario_counts[$scen_col]++
    n++
  }
}
END {
  if (n == 0) { print "{\"error\": \"no valid rows\"}"; exit 1 }
  printf "{\"levenshtein\": %.4f, \"latency_ms\": %.1f, \"count\": %d, \"scenarios\": {", lev_sum/n, lat_sum/n, n
  first=1
  for (s in scenarios) {
    if (!first) printf ", "
    printf "\"%s\": %.4f", s, scenarios[s]/scenario_counts[s]
    first=0
  }
  printf "}}\n"
}
' "$CSV_PATH"
```

```bash
chmod +x "$REPO_ROOT/dataScience/platform/models/autocomplete/parse-eval-results.sh"
```

**Workers MUST use this script to parse results.** They do not write their own CSV parsing logic.

## Workflow

### Phase 1: Setup (or Resume)

#### If `--resume` flag is set:

```bash
REPO_ROOT=/Users/joey/FyxerGh/fyxer-web-app
WORKTREE_BASE="$(dirname "$REPO_ROOT")/fyxer-eval"

# Find the most recent orchestrator results directory
RESULTS_DIR=$(ls -td "$REPO_ROOT/dataScience/platform/models/autocomplete/data/evals/orchestrator-"* 2>/dev/null | head -1)

if [ -z "$RESULTS_DIR" ] || [ ! -f "$RESULTS_DIR/orchestrator-state.json" ]; then
  echo "ERROR: No resumable state found."
  exit 1
fi

# Read state and resume from the last completed phase
STATE=$(cat "$RESULTS_DIR/orchestrator-state.json")
PHASE=$(echo "$STATE" | grep -o '"phase":"[^"]*"' | cut -d'"' -f4)

echo "Resuming from phase: $PHASE"
# Jump to the appropriate phase below
```

**Resume logic by phase:**
- `setup` → start from beginning
- `baseline` → re-run baseline
- `worktrees_created` → skip to agent launch
- `agents_running` → check which agents are still alive (via PID), check for result files from completed agents, re-launch any dead agents that didn't write results
- `collecting_results` → skip to result collection
- `merging` → re-run merge logic
- `final_validation` → re-run final validation
- `cleanup` / `done` → nothing to do

#### Normal start:

```bash
REPO_ROOT=/Users/joey/FyxerGh/fyxer-web-app
cd "$REPO_ROOT"

# Ensure clean working tree
if [ -n "$(git status --porcelain)" ]; then
  echo "ERROR: Working tree is dirty. Commit or stash changes first."
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)
WORKTREE_BASE="$(dirname "$REPO_ROOT")/fyxer-eval"
RESULTS_DIR="$REPO_ROOT/dataScience/platform/models/autocomplete/data/evals/orchestrator-$TIMESTAMP"
mkdir -p "$RESULTS_DIR"

# Write initial state
cat > "$RESULTS_DIR/orchestrator-state.json" << EOF
{
  "phase": "setup",
  "timestamp": "$TIMESTAMP",
  "base_branch": "$BASE_BRANCH",
  "axes": ["prompt", "context", "params", "prediction"],
  "target_lev": 0.55,
  "merge_threshold": 0.02,
  "max_iterations": 5,
  "user_count": 5,
  "baseline": null,
  "worktrees": {},
  "agent_pids": {},
  "completed_agents": [],
  "merge_result": null
}
EOF
```

### Phase 2: Baseline

```bash
cd "$REPO_ROOT/dataScience"
LOG=false ts-node platform/models/autocomplete/runEvaluation.ts \
  --env cached \
  --models "groq:::llama-3.3-70b-versatile" \
  --user-count 5
```

Parse using the deterministic harness:

```bash
LATEST_CSV=$(ls -t "$REPO_ROOT/dataScience/platform/models/autocomplete/data/evals/"*.csv | head -1)
BASELINE_METRICS=$("$REPO_ROOT/dataScience/platform/models/autocomplete/parse-eval-results.sh" "$LATEST_CSV")

echo "$BASELINE_METRICS" > "$RESULTS_DIR/baseline.json"
```

**Update state** → phase: `baseline`, write baseline metrics into state file.

Check if target already met. If baseline Levenshtein < target, report success and update state to `done`.

### Phase 3: Create Worktrees & Deterministic Harness

```bash
# Create the parse script in the repo (workers will use it from their worktree copies)
# [Create parse-eval-results.sh as defined above]

for AXIS in prompt context params prediction; do
  BRANCH="eval/autocomplete/$AXIS/$TIMESTAMP"
  WORKTREE="$WORKTREE_BASE-$AXIS"
  
  # Clean up any stale worktree at this path
  if [ -d "$WORKTREE" ]; then
    git worktree remove "$WORKTREE" --force 2>/dev/null || rm -rf "$WORKTREE"
  fi
  
  git worktree add "$WORKTREE" -b "$BRANCH"
done
```

**Update state** → phase: `worktrees_created`, write worktree paths into state.

### Phase 4: Launch Subagents

For each axis, spawn a subagent using `claude -p`. The prompt is built by reading the worker skill template and injecting axis-specific variables.

**CRITICAL**: Each subagent prompt must be fully self-contained. Everything the worker needs must be in the prompt string.

```bash
PIDS=()

for AXIS in prompt context params prediction; do
  WORKTREE="$WORKTREE_BASE-$AXIS"
  BASELINE_LEV=$(cat "$RESULTS_DIR/baseline.json" | grep -o '"levenshtein":[0-9.]*' | cut -d: -f2)
  BASELINE_LAT=$(cat "$RESULTS_DIR/baseline.json" | grep -o '"latency_ms":[0-9.]*' | cut -d: -f2)
  
  # Read the worker skill template and inject variables
  WORKER_PROMPT=$(cat "$REPO_ROOT/.claude/skills/autocomplete-eval-worker.md" | \
    sed "s|{{AXIS}}|$AXIS|g" | \
    sed "s|{{WORKTREE}}|$WORKTREE|g" | \
    sed "s|{{RESULTS_DIR}}|$RESULTS_DIR|g" | \
    sed "s|{{TARGET_LEV}}|0.55|g" | \
    sed "s|{{MAX_ITERATIONS}}|5|g" | \
    sed "s|{{USER_COUNT}}|5|g" | \
    sed "s|{{BASELINE_LEV}}|$BASELINE_LEV|g" | \
    sed "s|{{BASELINE_LATENCY}}|$BASELINE_LAT|g" | \
    sed "s|{{REPO_ROOT}}|$REPO_ROOT|g")
  
  claude -p "$WORKER_PROMPT" --allowedTools Edit,Write,Bash > "$RESULTS_DIR/agent-$AXIS-stdout.log" 2>&1 &
  PIDS+=($!)
  echo "Launched $AXIS agent (PID: ${PIDS[-1]}) in $WORKTREE"
done
```

**Update state** → phase: `agents_running`, write PIDs into state.

### Phase 5: Wait & Monitor

```bash
while true; do
  ALL_DONE=true
  for i in "${!PIDS[@]}"; do
    if kill -0 "${PIDS[$i]}" 2>/dev/null; then
      ALL_DONE=false
    fi
  done
  
  if $ALL_DONE; then
    echo "All agents completed."
    break
  fi
  
  # Print status from history logs
  for AXIS in prompt context params prediction; do
    if [ -f "$RESULTS_DIR/agent-$AXIS-result.json" ]; then
      echo "[$AXIS] Complete"
    elif [ -f "$RESULTS_DIR/agent-$AXIS-history.jsonl" ]; then
      ITER_COUNT=$(wc -l < "$RESULTS_DIR/agent-$AXIS-history.jsonl" | tr -d ' ')
      echo "[$AXIS] Running (iteration $ITER_COUNT)"
    else
      echo "[$AXIS] Starting..."
    fi
  done
  
  # Update state with any newly completed agents
  # (read result files, update completed_agents list, write state)
  
  sleep 60
done
```

**Update state** → phase: `collecting_results`.

### Phase 6: Collect & Rank Results

Read all `agent-{axis}-result.json` files. For any agent that crashed without writing a result file, read its stdout log and report the failure.

Rank agents by `best_levenshtein` ascending (lowest wins).

**Merge decision logic:**

```
BEST = agent with lowest best_levenshtein
SECOND = agent with second lowest best_levenshtein

if BEST.best_levenshtein >= BASELINE.levenshtein:
    → No improvement. Report failure. Ask for guidance.
    → Update state: phase "done", merge_result "no_improvement"

elif (SECOND.best_levenshtein - BEST.best_levenshtein) > merge_threshold:
    → Clear winner. Auto-merge BEST.
    → Update state: phase "merging"

else:
    → Close results. PAUSE and ask user:
      "The top two agents (BEST.axis and SECOND.axis) are within {threshold} 
       of each other. Best: {value}, Second: {value}. 
       Options: merge BEST only, merge SECOND only, try combining both, 
       or run more iterations."
    → Wait for user input before proceeding.
```

### Phase 7: Merge & Cherry-pick

```bash
cd "$REPO_ROOT"
WINNER_AXIS="prompt"  # from ranking
WINNER_BRANCH="eval/autocomplete/$WINNER_AXIS/$TIMESTAMP"

git merge "$WINNER_BRANCH" --no-ff -m "eval: merge $WINNER_AXIS improvements - Lev: {before} → {after}"
```

For each non-winning agent that improved AND whose changed files don't overlap with the winner's:

```bash
git cherry-pick --no-commit $OTHER_COMMIT
pnpm --filter functions typecheck
# If clean → commit. If not → git cherry-pick --abort
```

**Update state** → phase: `merging`, write merge details.

### Phase 8: Final Validation

```bash
cd "$REPO_ROOT/dataScience"
LOG=false ts-node platform/models/autocomplete/runEvaluation.ts \
  --env cached \
  --models "groq:::llama-3.3-70b-versatile" \
  --user-count 25
```

Parse with the deterministic harness. If final validation regresses compared to the merged result, revert cherry-picks and re-validate with only the winner's changes.

**Update state** → phase: `final_validation`, write final metrics.

### Phase 9: Cleanup & Report

```bash
for AXIS in prompt context params prediction; do
  WORKTREE="$WORKTREE_BASE-$AXIS"
  git worktree remove "$WORKTREE" --force 2>/dev/null
done

for AXIS in prompt context params prediction; do
  if [ "$AXIS" != "$WINNER_AXIS" ]; then
    git branch -D "eval/autocomplete/$AXIS/$TIMESTAMP" 2>/dev/null
  fi
done
```

Generate `$RESULTS_DIR/orchestrator-report.md` (same format as v1).

**Update state** → phase: `done`.

## Human Proposal Override

At any point during a run, you can steer a specific agent's next iteration by creating a proposal file:

### File: `$RESULTS_DIR/proposal-{axis}.json`

```json
{
  "description": "Try a lower temperature for more deterministic completions",
  "change_plan": "In runSingleAutocomplete.ts, change temperature from 0.7 to 0.3",
  "commit_description": "experiment: lower temperature to 0.3"
}
```

**Workers check for this file before each iteration.** If present, the worker uses the human's plan instead of generating its own hypothesis. After using the proposal, the worker renames it to `proposal-{axis}.used.json` so it's not reused.

This means you can:
- Watch the agent logs in real time
- See an agent going down an unproductive path
- Drop a `proposal-prompt.json` to redirect it
- The agent picks it up on its next iteration

## Error Handling

| Error | Action |
|---|---|
| Subagent crashes | Read stdout log. If result file missing, mark as failed in state. Continue with remaining agents. |
| All agents fail | Report all logs. State records failure. Ask for guidance. |
| Orchestrator crashes | `--resume` reads state file, checks PIDs, re-launches dead agents, continues from last phase. |
| Worktree creation fails | Clean up stale worktrees, retry once. |
| Merge conflict | Abort merge, present conflict details, ask user. |
| Final validation regresses | Revert cherry-picks, try winner only, report. |
| `claude` CLI not found | Error with install instructions. |
| Parse harness fails | Report raw CSV path, ask user to inspect manually. |

## Notes

- Each subagent runs in its own context window with no shared state
- All coordination happens through the filesystem (JSON files, history logs)
- The orchestrator does NOT do code modifications - only subagents do
- Subagent prompts are fully self-contained via the worker skill template
- The deterministic parse harness (`parse-eval-results.sh`) is the single source of truth for metrics
- Always run with `--env cached` to avoid Firestore dependencies
- To reset: `cd /Users/joey/FyxerGh/fyxer-web-app`