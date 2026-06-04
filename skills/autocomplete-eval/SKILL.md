---
name: autocomplete-eval
description: Iteratively optimize the autocomplete model by running evaluations, analyzing results, and making targeted improvements. Use when improving autocomplete performance, running eval loops, or optimizing Levenshtein distance. Invoke with /autocomplete-eval.
disable-model-invocation: true
allowed-tools: Edit, Write, Bash
---

# Autocomplete Model Evaluation & Optimization Skill

## Purpose

Iteratively improve the autocomplete model by running evaluations, analyzing results, making targeted improvements, and validating changes through continuous testing cycles.

## Core Objectives

1. **Optimize Levenshtein distance** (target: < 0.55) while maintaining average latency < 500ms
2. **Systematic improvement** through data-driven code modifications
3. **Comprehensive validation** with TypeScript, linting, and smoke tests
4. **Detailed documentation** of what works and what doesn't

## Skill Activation

Use this skill when:

- You want to improve autocomplete model performance
- You have baseline metrics and want to optimize specific scenarios
- You need systematic iteration with automatic validation

Invocation examples:

```bash
/autocomplete-eval
/autocomplete-eval --focus EMPTY_BODY_GREETING
/autocomplete-eval --upload-sheets
/autocomplete-eval --target 0.50
```

## Configuration

### Success Criteria

- **Primary Metric**: Levenshtein distance (lower is better)
- **Target**: < 0.55
- **Constraint**: Average latency must stay < 500ms
- **Stopping Conditions**:
  - Target Levenshtein distance reached (< 0.55)
  - 10 consecutive iterations without improvement
  - 15 total iterations (requires human review to continue)

### Evaluation Strategy

- **Quick iterations**: 3-5 users (faster feedback loops)
- **Thorough validation**: 25 users (final verification)
- **Model selection**: Focus on Groq models with latency < 500ms
- **Adaptive user count**: Start with 3-5, increase to 10-15 for validation, use 25 for final confirmation
- **Parallel agent testing**: Use `--cache-offset` to test different user subsets simultaneously across multiple agents (e.g., Agent A: offset 0-4, Agent B: offset 5-9)

### Files in Scope

**Allowed to modify**:

- `functions/src/features/autocomplete/*.ts` (all files)
- `dataScience/platform/models/autocomplete/runEvaluation.ts` (code improvements only, not grading settings)
- Other `dataScience/` files with user confirmation

**Protected from modification**:

- Grading logic and metrics in `runEvaluation.ts`
- All other files outside autocomplete feature

### Modification Permissions

You are authorized to:

- ✅ Modify prompt templates and system prompts
- ✅ Adjust confidence thresholds and scoring algorithms [Not possible with Groq which is the current client of choice so ignore this part of iteration for now]
- ✅ Change token limits (maxTokens) and model parameters
- ✅ Modify `runSingleAutocomplete` logic and flow
- ✅ Experiment with temperature, reasoning effort, and other LLM parameters
- ✅ Optimize prompt engineering and context selection
- ✅ Improve confidence calculation and truncation logic [Not possible with Groq which is the current client of choice so ignore this part of iteration for now]

## Workflow

### Phase 1: Setup & Baseline

1. **Create evaluation branch**

   ```bash
   # Branch naming: eval/autocomplete/{metric-target}/{timestamp}
   git checkout -b eval/autocomplete/lev-0.55/$(date +%Y%m%d-%H%M%S)
   ```

2. **Run baseline evaluation**

The script will only run correctly from dataScience so `cd /Users/joey/FyxerGh/fyxer-web-app/dataScience`

```bash
LOG=false ts-node dataScience/platform/models/autocomplete/runEvaluation.ts \
  --env "cached" \
  --models "groq:::llama-3.3-70b-versatile" \
  --user-count 5 \
  --cache-offset 0
```

3. **Analyze baseline metrics**
   - Parse CSV output from `dataScience/platform/models/autocomplete/data/evals/`
   - Calculate overall Levenshtein distance, latency, and scenario breakdown
   - Identify worst-performing scenarios and bottlenecks
   - Document baseline in iteration log

### Phase 2: Iterative Improvement Loop

For each iteration (max 15):

#### Step 1: Pre-Flight Validation

```bash
# TypeScript compilation
pnpm --filter functions typecheck

# Linting
pnpm --filter functions lint

# Smoke test (1 user, 1 model)
LOG=false ts-node dataScience/platform/models/autocomplete/runEvaluation.ts \
  --env cached \
  --models "groq:::llama-3.3-70b-versatile" \
  --user-count 1 \
  --cache-offset 0
```

If validation fails:

- Fix compilation/lint errors immediately
- If smoke test fails with errors, investigate and fix
- Do not proceed to full evaluation until validation passes

#### Step 2: Analyze Previous Results

- Review latest CSV/JSON output
- Calculate metric deltas from baseline and previous iteration
- Identify:
  - Scenarios with highest Levenshtein distance
  - Scenarios with latency spikes
  - Patterns in failures (greeting accuracy, punctuation, overprediction)
  - Token usage trends

#### Step 3: Design Targeted Improvement

Based on analysis, select ONE focused improvement strategy:

**Prompt Engineering**:

- Refine system/user prompts in `getAutocompletePrompt.ts`
- Adjust context selection (thread messages, lookalikes, exchange messages)
- Optimize prompt length vs. quality trade-off

**Confidence & Truncation**: [Not possible with Groq which is the current client of choice so ignore this part of iteration for now]

- Adjust thresholds in `calculateConfidenceScore.ts`
- Modify `hasStrongStart` logic for mid-edit scenarios
- Tune `truncateByConfidence` algorithm

**Model Parameters**:

- Experiment with different Groq models (llama-3.3-70b-versatile, etc.)
- Adjust temperature (currently 0.7)
- Modify maxTokens based on scenario type
- Test reasoning effort settings for reasoning models

**Prediction Logic**:

- Refine `isMidSentenceEdit` detection in `decidePredictionLength.ts`
- Improve greeting insertion logic in `insertGreetingNewline`
- Optimize post-sentence formatting in `ensurePostSentenceFormatting`

**Context Selection**:

- Improve lookalike retrieval in `fetchLookalikesForAutocomplete.ts`
- Optimize exchange message selection in `fetchExchangeMessagesForAutocomplete.ts`
- Refine thread message caching in `threadCache.ts`

#### Step 4: Implement Change

- Make targeted code modification
- Document the hypothesis and expected impact
- Keep changes focused (one improvement per iteration)

#### Step 5: Run Full Evaluation

```bash
# Adaptive user count based on iteration stage
# Iterations 1-5: 3-5 users (rapid iteration)
# Iterations 6-10: 10-15 users (validation)
# Iterations 11-15: 25 users (thorough testing)

LOG=false ts-node dataScience/platform/models/autocomplete/runEvaluation.ts \
  --env cached \
  --models "groq:::llama-3.3-70b-versatile" \
  --user-count {adaptive_count} \
  --cache-offset 0
```

#### Step 6: Evaluate Results

Calculate metric deltas:

- **Levenshtein distance**: Compare to previous iteration
- **Latency**: Ensure < 500ms average
- **Scenario breakdown**: Which scenarios improved/degraded
- **Token usage**: Monitor for significant increases

#### Step 7: Decision Point

**If metrics improved**:

- Commit the change with descriptive message
- Document success in iteration log
- Proceed to next iteration

```bash
git add -A
git commit -m "eval: [improvement description] - Lev: {before} → {after}, Lat: {avg}ms"
```

**If metrics degraded**:

- Analyze why the change caused degradation
- **Small prompt changes or obvious regressions**: Revert immediately
  ```bash
  git reset --hard HEAD
  ```
- **Errors or unexpected failures**: Revert unless the error is unrelated to the change
  - If unrelated, ask for human guidance with context
- **Expected degradation** (e.g., quality vs. speed trade-off): Ask for human guidance
  - Explain why degradation was expected
  - Present options: keep, revert, or modify
  - Await user decision before proceeding

**If no improvement after 10 iterations**:

- Stop automatic iteration
- Generate final report
- Ask for human review

#### Step 8: Monitor Token Usage

- Track token usage trends across iterations
- **Warning threshold**: If any single LLM call exceeds 15K tokens, log warning
- **Critical threshold**: If context usage approaches 75%, alert user
- Suggest optimization opportunities (prompt compression, context trimming)

### Phase 3: Validation & Reporting

#### Final Validation Run

Once target metrics reached or max iterations completed:

```bash
# Run thorough evaluation with 25 users
LOG=false ts-node dataScience/platform/models/autocomplete/runEvaluation.ts \
  --env cached \
  --models "groq:::llama-3.3-70b-versatile" "groq:::llama-3.1-70b-versatile" \
  --user-count 25 \
  --cache-offset 0
```

#### Generate Reports

**1. Iteration Summary Report** (`dataScience/platform/models/autocomplete/data/evals/iteration-summary-{timestamp}.md`):

```markdown
# Autocomplete Optimization - Iteration Summary

## Overview

- **Start Date**: {timestamp}
- **Branch**: {branch-name}
- **Total Iterations**: {count}
- **Final Status**: {success|partial|requires-review}

## Baseline Metrics

- Levenshtein Distance: {baseline}
- Average Latency: {baseline}ms
- User Count: {count}

## Final Metrics

- Levenshtein Distance: {final} ({delta} improvement)
- Average Latency: {final}ms
- User Count: {count}

## Iteration Log

### Iteration 1: {description}

- **Change**: {what was modified}
- **Hypothesis**: {expected impact}
- **Result**: {success|failure}
- **Metrics**: Lev: {before} → {after}, Lat: {avg}ms
- **Token Usage**: {tokens}
- **Scenario Impact**: {detailed breakdown}
- **Decision**: {committed|reverted}

[... repeat for each iteration ...]

## What Worked

- ✅ {successful change 1}: {impact}
- ✅ {successful change 2}: {impact}

## What Didn't Work

- ❌ {failed change 1}: {reason}
- ❌ {failed change 2}: {reason}

## Recommended Next Steps

1. {recommendation 1}
2. {recommendation 2}
3. {recommendation 3}

## Final Assessment

{overall evaluation of optimization effort}
```

**2. Detailed Metrics Report**:

- Generate comparison charts (CSV format for spreadsheet import)
- Scenario-by-scenario breakdown
- Model performance comparison if multiple models tested
- Token usage analysis

**3. Google Sheets Upload** (if requested):

- Upload final evaluation CSV to Google Drive
- Include link in summary report

### Phase 4: Human Review

Present to user:

1. **Summary statistics**: Baseline vs. final metrics
2. **Key insights**: What changes had the most impact
3. **Trade-offs made**: Any compromises between metrics
4. **Next steps**: Recommendations for further improvement
5. **Branch status**: Ready to merge, needs more work, or experimental

Ask user:

- Should these changes be merged to staging?
- Are there specific scenarios that need more focus?
- Should optimization continue with different targets?

## Model Selection Guidelines

### Groq Models (Focus on these for latency)

- `llama-3.3-70b-versatile` - Highest accuracy, reasonable latency
- `llama-3.1-70b-versatile` - Good balance
- `llama-3.1-8b-instant` - Fastest, lower accuracy

### Evaluation Strategy

- Start with `llama-3.3-70b-versatile` (best accuracy)
- Test other models if latency issues
- Never test OpenAI models in optimization loop (too slow for production use)

## Error Handling

### Evaluation Script Errors

- **Connection failures**: Retry once, then alert user
- **Firestore errors**: Check if `--env cached`, if not rerun the evaluation script with `--env cached` Firebase emulators running, then alert user
- **Out of memory**: Reduce user count and retry
- **TypeScript errors**: Fix immediately, do not proceed

### Git Issues

- **Merge conflicts**: Alert user, pause iteration
- **Branch exists**: Append timestamp suffix and continue
- **Uncommitted changes**: Stash before starting skill

### Resource Constraints

- **High token usage**: Log warning, continue unless context limit approached
- **Rate limits**: Implement exponential backoff
- **Disk space**: Check available space before large evaluation runs

## Best Practices

### Iteration Strategy

1. **Start simple**: Make small, focused changes
2. **One change at a time**: Easier to attribute impact
3. **Document hypotheses**: Explain why you expect improvement
4. **Analyze failures**: Learn from what doesn't work
5. **Validate thoroughly**: Don't skip pre-flight checks

### Code Quality

- Maintain existing code style and conventions
- Add inline documentation for complex logic
- Ensure TypeScript types are correct
- Follow existing patterns in the codebase

### Communication

- **After each iteration**: Show metrics, explain decision
- **On failures**: Explain what went wrong and why
- **On warnings**: Alert user to potential issues early
- **Final report**: Comprehensive summary with insights

## Example Usage Session

```
User: /autocomplete-eval

Agent:
🎯 Starting Autocomplete Optimization
- Target: Levenshtein < 0.55, Latency < 500ms
- Branch: eval/autocomplete/lev-0.55/20240115-143022

📊 Running baseline evaluation (5 users)...
✅ Baseline: Lev 0.68, Lat 342ms

🔄 Iteration 1: Optimizing prompt template
- Hypothesis: More explicit instructions will improve greeting accuracy
- Change: Modified system prompt in getAutocompletePrompt.ts
✅ Pre-flight: TypeScript ✓, Lint ✓, Smoke test ✓
📊 Evaluating (5 users)...
✅ Result: Lev 0.65 (-0.03), Lat 338ms
✅ Committed: eval: improve greeting accuracy via clearer prompt - Lev: 0.68 → 0.65

🔄 Iteration 2: Adjusting confidence threshold [Not possible with Groq which is the current client of choice]
[... continues ...]

📊 Final Results (25 users):
- Levenshtein: 0.68 → 0.52 (24% improvement)
- Latency: 342ms → 356ms (within target)
- Iterations: 8
- Success rate: 6/8 changes improved metrics

📄 Generated reports:
- iteration-summary-20240115-143022.md
- Final evaluation CSV uploaded to Google Sheets

✅ Optimization complete! Ready for human review.
```

## Flags & Options

- `--focus [scenario]`: Target specific scenario type (e.g., EMPTY_BODY_GREETING)
- `--upload-sheets`: Upload results to Google Sheets after completion
- `--target [value]`: Override target Levenshtein distance (default: 0.55)
- `--max-iterations [n]`: Override max iterations (default: 15)
- `--user-count [n]`: Override adaptive user count strategy
- `--cache-offset [n]`: Starting offset in cached users array (default: 0). Allows parallel agent testing with different user subsets (e.g., agent1: offset 0, agent2: offset 5)
- `--env cached`: Always call with cached so as not to read from firestore or need an emulator running.

## Notes

- This skill requires Firebase emulators to be running (`pnpm functions:dev`)
- Evaluation runs can take 5-30 minutes depending on user count
- Keep production database credentials in `.env.prod.RO.jd` file
- Never commit `.env` files or credentials
- Always validate changes before full evaluation runs
- Groq does not support logprobs so because we are using Groq, confidence thresholds do not need any work and will not be used.
- To reset the directory, always cd back to /Users/joey/FyxerGh/fyxer-web-app
- **Parallel Testing**: Multiple agents can run evaluations simultaneously with different user subsets by using different `--cache-offset` values (e.g., offset 0, 5, 10, 15) to avoid testing the same users
