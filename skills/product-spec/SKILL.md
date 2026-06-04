---
name: product-spec
description: Interactive product specification writer that gathers requirements through questions and produces comprehensive design specs following a template
---

# Product Spec Writer

**Command:** `/product-spec`

**Purpose:** Interactive product specification writer that gathers requirements through questions and produces comprehensive design specs following your template.

---

## How It Works

1. **Discovery Phase:** Asks targeted questions about the feature, business impact, stakeholders, and technical approach
2. **Code Analysis:** If working on a feature branch, analyzes existing changes via `git diff staging` and `git diff --staged`
3. **Spec Generation:** Writes a complete design spec following the template at `/Users/joey/.claude/skills/docs/design-spec-template.md`
4. **Iteration:** Offers to refine specific sections based on feedback

---

## Execution Instructions

When `/product-spec` is invoked:

### Phase 1: Context Gathering

Check if we're on a feature branch and analyze existing changes:

```bash
# Get current branch
git branch --show-current

# If not on main/staging, check for changes
git diff staging
git diff --staged
```

### Phase 2: Interactive Discovery

Ask questions systematically to understand:

**Feature Overview:**

- What is the feature name?
- What problem does this solve?
- Who experiences this problem and how frequently?

**Evidence & Research:**

- What user research supports this? (interviews, surveys, support tickets)
- What data/metrics show the problem's scope?
- How do competitors handle this (if relevant)?

**Business Impact:**

- What metrics will this affect? (conversion rate, support tickets, revenue, etc.)
- What's the current state of each metric?
- What's the expected impact and confidence level?

**Stakeholders:**

- Who are the key stakeholders?
- What are their roles?
- Who requires sign-off vs who should be informed?
- What does each stakeholder need to see to approve?

**Solution Design:**

- What's the proposed solution from the user's perspective?
- Why this approach over alternatives?
- What alternatives were considered and why rejected?

**Technical Approach:**

- What are the key components/systems affected?
- What dependencies exist (external services, other teams, features)?
- What are the technical or product risks?
- What mitigations are planned?

**Roadmap & Strategy:**

- How does this fit into the broader product roadmap?
- What OKRs or strategic priorities does this support?

**Scope & Timeline:**

- What phases/deliverables are planned?
- What's the estimated duration for each?
- What's explicitly OUT of scope?

**Open Questions:**

- What questions remain about scope, priority, or approach?
- What edge cases or business rules need clarification?

### Phase 3: Spec Writing

Using the gathered information and code analysis:

1. Create the design spec following the template structure
2. If code changes exist, reference them in the Technical Overview section
3. Populate all sections with specific, actionable content
4. Include concrete metrics, timelines, and deliverables
5. Save the spec to an appropriate location (suggest: `dataScience/platform/models/[feature-name]/DESIGN-SPEC.md` or similar based on the feature)

### Phase 4: Review & Refinement

After writing the spec:

- Ask if any sections need more detail
- Offer to add wireframes, diagrams, or technical details to the Appendix
- Confirm stakeholder list and sign-off requirements are complete

---

## Question Flow Strategy

**Use a conversational, adaptive approach:**

- Start with high-level questions (feature name, problem statement)
- Drill into specifics based on answers
- If user provides detailed answers early, skip redundant questions
- For technical features, focus more on technical risks and dependencies
- For business features, focus more on metrics and user impact
- Always ask about code changes if on a feature branch

**Example Question Sequences:**

_Initial Questions:_

1. "What's the name of the feature you want to spec?"
2. "What problem does this solve? Who experiences it?"
3. "I see you're on branch `[branch-name]`. Let me check what changes exist..."

_Follow-up based on context:_

- If ML/data science: "What training data is needed? What's the model architecture?"
- If API: "What endpoints are affected? What's the data schema?"
- If UI: "What's the user flow? Are there mockups or wireframes?"

_Business Impact:_ 4. "What metrics will this move? What's the current baseline?" 5. "What's the expected impact and your confidence level?"

_Stakeholders:_ 6. "Who needs to sign off on this? What does each stakeholder need to see?"

_Technical Approach:_ 7. "What's the high-level technical approach?" 8. "What are the main risks and how will you mitigate them?" 9. "What alternatives did you consider?"

_Timeline & Scope:_ 10. "What's the timeline? Can this be phased?" 11. "What's explicitly OUT of scope?"

---

## Output Format

Always save the spec to a logical location based on the feature:

- ML models: `dataScience/platform/models/[feature-name]/DESIGN-SPEC.md`
- Backend features: `functions/src/features/[feature-name]/DESIGN-SPEC.md`
- Frontend features: `app/src/routes/[feature-name]/DESIGN-SPEC.md`
- General features: `docs/specs/[feature-name]-DESIGN-SPEC.md`

Include in Technical Overview section:

- Summary of code changes found via `git diff staging`
- List of files modified with brief description of changes
- Any patterns or approaches already implemented

---

## Example Usage

```
User: /product-spec

Assistant: Great\! Let me help you create a product spec. First, let me check what branch we're on...

[Runs git branch --show-current]

Assistant: I see you're on the `joeydwonczyk/relationship-interaction-classifier` branch. Let me analyze the existing changes...

[Runs git diff staging and git diff --staged]

Assistant: I can see significant ML model work for relationship classification. Now let me ask you some questions:

1. What's the feature name?
User: Relationship Classifier for Customer Relationships

2. What problem does this solve?
User: Downstream models need to know whether an external entity is a customer, supplier, partner, etc. to predict deal actions accurately.

[Continues through discovery questions...]

Assistant: Based on your answers and the code changes, I'll now write the design spec...

[Writes DESIGN-SPEC.md to dataScience/platform/models/customer-relationships/DESIGN-SPEC.md]

Assistant: I've created the design spec at `dataScience/platform/models/customer-relationships/DESIGN-SPEC.md`. Would you like me to:
- Add more detail to any section?
- Include technical diagrams in the Appendix?
- Refine the stakeholder list?
```

---

## Key Features

- **Adaptive Questioning:** Skips redundant questions if user provides comprehensive early answers
- **Code-Aware:** Analyzes existing changes to inform Technical Overview section
- **Template-Compliant:** Follows exact structure from design-spec-template.md
- **Context-Sensitive:** Adjusts questions based on feature type (ML, API, UI, etc.)
- **Stakeholder-Focused:** Ensures each stakeholder's sign-off criteria are captured
- **Iterative:** Offers refinement after initial spec generation

---

## Tips for Best Results

1. **Be Specific:** Provide concrete metrics, timelines, and examples when answering questions
2. **Think Business Impact:** Have rough estimates of how this affects key metrics
3. **Know Your Stakeholders:** Understand what each person needs to see for approval
4. **Consider Alternatives:** Think through why you're choosing this approach over others
5. **Define Scope Clearly:** Be explicit about what's IN and OUT of scope
6. **Have Evidence Ready:** User research, data, or competitive analysis strengthens the spec
