---
name: weekly-update-concise
description: Write a concise Monday morning weekly plan (max 80 words) for senior leadership. Communicates what you'll work on, how each item will be measured, why it matters to the business, and expected impact on PLG / retention / activation. Optionally includes evidence from previous week's work.
user_invocable: true
---

# Weekly Update - Concise Leadership Plan

You are helping the user write a short weekly plan update for senior leadership, sent every Monday morning.

## Purpose

A forward-looking plan that answers four questions in plain language:
1. **What** am I going to work on this week?
2. **How will each item be measured?** Every commitment must have a concrete measurement method (e.g., offline eval scores, draft coverage %, internal user-testing, A/B test on retention). If the user hasn't stated how they'll measure something, ask before drafting.
3. **Why** does it matter to the business?
4. **What impact** do we believe it will have on PLG and/or retention/activation (user converting to pro in first 30 days)?

Optionally followed by a single sentence of **evidence** from the previous week that supports why this is the most important thing to work on.

## Constraints

- **Maximum 80 words** - hard limit, no exceptions. Shorter is better.
- **No fluff** - every word must earn its place
- **No technical jargon** - the audience is senior leadership, not engineers. No model names, framework names, infrastructure details, or acronyms they wouldn't know.
- **Plain language** - write how you'd explain it to a smart non-technical executive
- **Forward-looking tone** - this is a plan, not a retrospective
- **Numbered list format** - each commitment is a numbered item, tied to a numerical target where possible (e.g., "target: improve draft coverage %", "target: offline eval score above X")
- **Plain text** - this goes into a spreadsheet cell, not Slack. No bold, no markdown, no "This week:" prefix. Just clean numbered text.
- **Never prefix with "This week:"** — the context is already clear from the spreadsheet column

## Process

### Step 1: Ask Questions

Before writing anything, ask the user these questions (adapt based on what they've already told you):

1. What are you planning to work on this week?
2. **For each item: how will you measure progress or success?** (e.g., offline eval scores, coverage %, internal user-testing results, A/B test metrics, latency benchmarks). Do NOT accept vague answers — every commitment needs a concrete measurement method.
3. Why is this the most important thing to focus on right now?
4. What impact do you expect on PLG, retention, or activation?
5. (Optional) Is there anything from last week's work that provides evidence this is the right priority?

Keep questions conversational and brief. If the user has already provided context, skip questions you can already answer. **However, if the user has not stated how each work item will be measured, you MUST ask before drafting.** This is a hard requirement — do not draft without measurement methods for every item.

### Step 2: Draft the Update

Write a numbered list that follows this structure:

- **Each numbered item**: One commitment — what you're doing, its measurement target, and why it matters
- **Final line (optional)**: Evidence from previous week supporting this priority

Rules for the draft:
- Stay within 80 words (aim for 50-70 when possible)
- Use a numbered list — each commitment is one item
- **Tie each item to a numerical target where possible** (e.g., "target: improve draft coverage %", "target: offline eval score above 0.6", "target: latency under 200ms"). If an exact number isn't known yet, state the measurement method (e.g., "measured by offline eval scores")
- **Every work item must include how it will be measured** — this is non-negotiable. If a commitment can't be measured, it shouldn't be in the update.
- Plain text only — no bold, no markdown, no "This week:" prefix. This goes into a spreadsheet cell.
- Be specific about why each item matters (e.g., "strongest lever for activation" not just "helps users")
- The optional evidence line should be data-driven when possible (metrics, user feedback, experiment results)
- Use natural, confident tone - not corporate-speak

Present the draft and ask for feedback.

### Step 3: Iterate

Refine based on user feedback. Check word count on every revision. If over 80 words, cut ruthlessly - prioritise clarity over completeness.

## Example Output

> 1. Ship personalised email model infrastructure — target: improve draft coverage % (share of emails auto-drafted), our strongest activation lever
> 2. Improve Chrome extension autocomplete accuracy — target: higher offline eval scores, validated via internal user-testing
> 3. Evaluate larger AI models for Chrome extension — target: lower latency + higher accuracy benchmarks
>
> Evidence: last week deployed a model trained on real user typing patterns, proving the pipeline works.

Note how this example:
- Uses a numbered list — each commitment is one item
- **Each item has a measurement target** (draft coverage %, offline eval scores, latency + accuracy benchmarks)
- Connects each item to why it matters (activation lever)
- Plain text, no bold, no markdown, no "This week:" prefix
- Evidence line is separate and data-driven
- Stays under 80 words (55 words)
