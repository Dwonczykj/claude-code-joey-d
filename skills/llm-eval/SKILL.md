---
name: llm-eval
description: run an evaluation on the system prompt to improve the system instructions / user instruction formatting being posted to the LLM.
---
# llm-eval - LLM Evaluation & Prompt Engineering Skill

Iterative evaluation framework for testing and optimizing LLM system instructions.

## Invocation

```bash
/llm-eval                           # Interactive setup
/llm-eval --run <eval-name>         # Run existing evaluation
/llm-eval --compare <eval1> <eval2> # Compare two evaluation runs
/llm-eval --new <eval-name>         # Create new evaluation suite
```

## Capabilities

1. **Define Test Cases**: Create evaluation datasets with inputs, expected outputs, and validation scripts
2. **Run Evaluations**: Execute LLM against test cases with different system prompts
3. **Automated Scoring**: Run validation scripts to score each output
4. **Compare Results**: Track improvements across prompt iterations
5. **Iterative Refinement**: Suggest prompt improvements based on failures

## Workflow

### Phase 1: Evaluation Setup

**Detect or Create Evaluation Config**:
- Look for `llm-evals/` directory in project root
- If not found, create structure:
  ```
  llm-evals/
    ├── config.json           # Evaluation configuration
    ├── test-cases/           # Test case definitions
    ├── prompts/              # System prompt versions
    ├── results/              # Evaluation results
    └── scripts/              # Validation scripts
  ```

**Configuration Schema** (`llm-evals/config.json`):
```json
{
  "evaluations": {
    "eval-name": {
      "description": "What this evaluation tests",
      "model": "claude-sonnet-4-5-20250929",
      "testCasesDir": "test-cases/eval-name/",
      "validationScript": "scripts/eval-name-validator.ts",
      "scoringCriteria": {
        "accuracy": { "weight": 0.4, "threshold": 0.8 },
        "completeness": { "weight": 0.3, "threshold": 0.7 },
        "efficiency": { "weight": 0.3, "threshold": 0.6 }
      }
    }
  }
}
```

### Phase 2: Test Case Definition

**Test Case Format** (`test-cases/eval-name/case-001.json`):
```json
{
  "id": "case-001",
  "name": "Descriptive test case name",
  "input": {
    "userMessage": "User's input to the LLM",
    "context": {
      "additionalData": "Any additional context needed"
    }
  },
  "expectedOutput": {
    "type": "exact|contains|regex|custom",
    "value": "Expected response or pattern",
    "metadata": {
      "shouldInclude": ["key", "concepts"],
      "shouldNotInclude": ["avoid", "these"]
    }
  },
  "validationScript": "optional-custom-validator.ts"
}
```

### Phase 3: Prompt Version Management

**Prompt Version Format** (`prompts/eval-name/v1.md`):
```markdown
---
version: 1
created: 2026-01-30
description: Initial baseline prompt
tags: [baseline, classification, relationship]
---

# System Instructions

[Your system instructions here]

## Metadata
- Model: claude-sonnet-4-5-20250929
- Temperature: 0.7
- Max Tokens: 4096
```

### Phase 4: Validation Scripts

**Validator Template** (`scripts/eval-name-validator.ts`):
```typescript
import { EvalResult, TestCase, LLMOutput } from '../types';

export async function validate(
  testCase: TestCase,
  llmOutput: LLMOutput,
  systemPrompt: string
): Promise<EvalResult> {
  const scores = {
    accuracy: 0,
    completeness: 0,
    efficiency: 0,
  };

  // Custom validation logic
  if (testCase.expectedOutput.type === 'exact') {
    scores.accuracy = llmOutput.text === testCase.expectedOutput.value ? 1 : 0;
  }

  // Check completeness
  const requiredConcepts = testCase.expectedOutput.metadata?.shouldInclude || [];
  const foundConcepts = requiredConcepts.filter(concept =>
    llmOutput.text.toLowerCase().includes(concept.toLowerCase())
  );
  scores.completeness = foundConcepts.length / requiredConcepts.length;

  // Check efficiency (token usage)
  const tokenRatio = llmOutput.tokensUsed / llmOutput.tokensLimit;
  scores.efficiency = 1 - Math.min(tokenRatio, 1);

  return {
    testCaseId: testCase.id,
    passed: Object.values(scores).every(score => score >= 0.7),
    scores,
    details: {
      input: testCase.input.userMessage,
      output: llmOutput.text,
      expected: testCase.expectedOutput.value,
      tokensUsed: llmOutput.tokensUsed,
    },
  };
}
```

### Phase 5: Execution Strategy

**Evaluation Runner**:
1. Load evaluation config and test cases
2. Load system prompt version
3. For each test case:
   - Call LLM with system prompt + user message
   - Run validation script on output
   - Record results with timestamps
4. Calculate aggregate scores
5. Save results to `results/eval-name/run-<timestamp>.json`

**Parallel Execution**:
- Run test cases in parallel (max 5 concurrent)
- Use Task tool for independent test case execution
- Aggregate results after all complete

### Phase 6: Results Analysis

**Results Format** (`results/eval-name/run-20260130-143022.json`):
```json
{
  "evalName": "eval-name",
  "promptVersion": "v1",
  "timestamp": "2026-01-30T14:30:22Z",
  "model": "claude-sonnet-4-5-20250929",
  "testCasesRun": 25,
  "testCasesPassed": 18,
  "aggregateScores": {
    "accuracy": 0.82,
    "completeness": 0.74,
    "efficiency": 0.88
  },
  "overallScore": 0.81,
  "failures": [
    {
      "testCaseId": "case-003",
      "reason": "Missing required concept: 'relationship strength'",
      "scores": { "accuracy": 0.6, "completeness": 0.5, "efficiency": 0.9 }
    }
  ],
  "detailedResults": [
    {
      "testCaseId": "case-001",
      "passed": true,
      "scores": { "accuracy": 1.0, "completeness": 0.9, "efficiency": 0.85 },
      "executionTime": 1234
    }
  ]
}
```

### Phase 7: Comparison & Iteration

**Compare Command**:
```bash
/llm-eval --compare v1 v2
```

Output:
```
📊 Evaluation Comparison: v1 vs v2

Overall Score:
  v1: 0.81 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 81%
  v2: 0.89 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 89% ↑ 8%

Accuracy:
  v1: 0.82 | v2: 0.91 | Δ +0.09 (+11%)

Completeness:
  v1: 0.74 | v2: 0.85 | Δ +0.11 (+15%)

Efficiency:
  v1: 0.88 | v2: 0.91 | Δ +0.03 (+3%)

Improvements:
✅ Fixed 5 test cases: case-003, case-007, case-012, case-019, case-023
❌ Regressed 1 test case: case-015

Recommendation:
v2 shows significant improvement in completeness (+15%) while maintaining
efficiency. Consider adopting v2 and investigating case-015 regression.
```

### Phase 8: Iterative Improvement

**Analysis Loop**:
1. Identify failure patterns across test cases
2. Analyze common issues (missing concepts, incorrect format, etc.)
3. Suggest prompt improvements
4. Create new prompt version with improvements
5. Re-run evaluation
6. Compare results

**Improvement Suggestions**:
```
🔍 Analysis of Failed Test Cases (7 failures):

Common Issues:
1. Missing relationship strength classification (5 cases)
   → Add explicit instruction to classify strength as weak/moderate/strong

2. Incorrect JSON format in 2 cases
   → Add JSON schema example in system prompt

3. Context window inefficiency (avg 3200 tokens/4096 limit)
   → Add instruction to be concise while complete

Suggested Prompt Changes:
+ Add section: "## Classification Criteria"
+ Include JSON schema example
+ Add efficiency guideline: "Be thorough yet concise"

Generate v3 prompt? [y/n]
```

## Implementation Tasks

When invoked, the skill will:

**Setup Phase**:
- ✅ Check for `llm-evals/` directory
- ✅ Create directory structure if needed
- ✅ Initialize config.json template
- ✅ Create example test case
- ✅ Create example validator script

**Execution Phase**:
- ✅ Load evaluation configuration
- ✅ Load test cases from directory
- ✅ Load system prompt version
- ✅ Execute LLM calls with system prompt
- ✅ Run validation scripts
- ✅ Calculate aggregate scores
- ✅ Save results with timestamp

**Analysis Phase**:
- ✅ Compare multiple runs
- ✅ Identify failure patterns
- ✅ Suggest improvements
- ✅ Generate new prompt versions
- ✅ Track improvement over time

## TypeScript Types

**Types Definition** (`llm-evals/types.ts`):
```typescript
export interface TestCase {
  id: string;
  name: string;
  input: {
    userMessage: string;
    context?: Record<string, unknown>;
  };
  expectedOutput: {
    type: 'exact' | 'contains' | 'regex' | 'custom';
    value: string;
    metadata?: {
      shouldInclude?: string[];
      shouldNotInclude?: string[];
      [key: string]: unknown;
    };
  };
  validationScript?: string;
}

export interface LLMOutput {
  text: string;
  tokensUsed: number;
  tokensLimit: number;
  model: string;
  temperature: number;
  timestamp: string;
}

export interface EvalResult {
  testCaseId: string;
  passed: boolean;
  scores: Record<string, number>;
  details: {
    input: string;
    output: string;
    expected: string;
    tokensUsed: number;
    [key: string]: unknown;
  };
  executionTime?: number;
  error?: string;
}

export interface EvalRun {
  evalName: string;
  promptVersion: string;
  timestamp: string;
  model: string;
  testCasesRun: number;
  testCasesPassed: number;
  aggregateScores: Record<string, number>;
  overallScore: number;
  failures: Array<{
    testCaseId: string;
    reason: string;
    scores: Record<string, number>;
  }>;
  detailedResults: EvalResult[];
}

export interface EvalConfig {
  evaluations: Record<string, {
    description: string;
    model: string;
    testCasesDir: string;
    validationScript: string;
    scoringCriteria: Record<string, {
      weight: number;
      threshold: number;
    }>;
  }>;
}
```

## Usage Examples

### Example 1: Create New Evaluation

```bash
/llm-eval --new relationship-classifier
```

Creates:
- `llm-evals/config.json` with relationship-classifier config
- `llm-evals/test-cases/relationship-classifier/` directory
- `llm-evals/prompts/relationship-classifier/v1.md` template
- `llm-evals/scripts/relationship-classifier-validator.ts` template

### Example 2: Add Test Cases

Manually create test cases in `test-cases/relationship-classifier/`:
```json
{
  "id": "case-001",
  "name": "Basic business relationship classification",
  "input": {
    "userMessage": "Classify relationship between john@company.com and jane@vendor.com based on 15 emails over 3 months, all business-related."
  },
  "expectedOutput": {
    "type": "contains",
    "value": "business",
    "metadata": {
      "shouldInclude": ["business", "vendor", "professional"],
      "shouldNotInclude": ["personal", "friend"]
    }
  }
}
```

### Example 3: Run Evaluation

```bash
/llm-eval --run relationship-classifier
```

Output:
```
🚀 Running evaluation: relationship-classifier
   Model: claude-sonnet-4-5-20250929
   Prompt: v1
   Test cases: 25

⏳ Executing test cases...
   [████████████████████████████████████████] 25/25 (100%)

📊 Results:
   Overall Score: 0.81 (81%)
   Passed: 18/25 (72%)

   Accuracy:     0.82 ━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ Above threshold (0.80)
   Completeness: 0.74 ━━━━━━━━━━━━━━━━━━━━━━━━ ❌ Below threshold (0.70)
   Efficiency:   0.88 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ Above threshold (0.60)

⚠️ 7 Failed Cases:
   case-003: Missing required concept: 'relationship strength'
   case-007: Incorrect JSON format
   case-012: Missing required concept: 'interaction frequency'
   ...

💡 Suggestions:
   1. Add explicit relationship strength classification
   2. Include JSON schema example in prompt
   3. Add interaction frequency guidelines

Results saved to: llm-evals/results/relationship-classifier/run-20260130-143022.json
```

### Example 4: Iterate on Prompt

Based on failures, update prompt in `prompts/relationship-classifier/v2.md`:
```markdown
---
version: 2
created: 2026-01-30
description: Added relationship strength and JSON schema
tags: [improvement, classification, relationship]
changes:
  - Added relationship strength classification criteria
  - Included JSON schema example
  - Added interaction frequency guidelines
---

# System Instructions

You are a relationship classifier...

## Classification Criteria

### Relationship Strength
- **Weak**: < 5 interactions, sporadic communication
- **Moderate**: 5-20 interactions, regular communication
- **Strong**: > 20 interactions, frequent communication

### Output Format
```json
{
  "type": "business|personal|mixed",
  "strength": "weak|moderate|strong",
  "confidence": 0.0-1.0
}
```
...
```

Then run:
```bash
/llm-eval --run relationship-classifier --prompt v2
/llm-eval --compare v1 v2
```

## Integration with Repository

**For this repository**, the skill will:
1. Create `llm-evals/` in project root `/Users/joey/FyxerGh/fyxer-web-app/`
2. Use existing TypeScript infrastructure (`shared/` package)
3. Leverage existing testing frameworks (Vitest/Jest)
4. Store results in git-ignored directory (add to `.gitignore`)
5. Support both Node.js script execution and API-based validation

## Advanced Features

### Feature 1: Batch Comparison

Compare multiple prompt versions at once:
```bash
/llm-eval --compare-batch v1,v2,v3,v4
```

### Feature 2: Regression Testing

Run evaluations on every prompt change to catch regressions:
```bash
/llm-eval --regression v2
```

Compares v2 against all previous versions and alerts if any score decreases.

### Feature 3: A/B Testing

Run multiple prompt versions in parallel and compare:
```bash
/llm-eval --ab-test v1 v2 --cases 100
```

### Feature 4: Export Reports

Generate markdown reports for documentation:
```bash
/llm-eval --export-report v2 --format markdown
```

Creates `llm-evals/reports/v2-report.md` with full analysis.

## Best Practices

1. **Start Simple**: Begin with 5-10 test cases, expand as needed
2. **Version Everything**: Tag each prompt version with changes
3. **Track Metrics**: Monitor scores over time to see improvement trends
4. **Diverse Test Cases**: Include edge cases, typical cases, and challenging cases
5. **Automate**: Run evals on every prompt change
6. **Document Failures**: Analyze why test cases fail for insights
7. **Iterate Quickly**: Use small, focused improvements between versions

## When to Use This Skill

✅ **Use when**:
- Developing system instructions for LLM features
- Optimizing prompt performance
- Testing changes to system prompts
- Comparing different prompt strategies
- Building confidence in prompt quality

❌ **Don't use when**:
- Testing application logic (use normal unit tests)
- Quick one-off prompt experiments (use chat directly)
- Non-LLM testing scenarios
