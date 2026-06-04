---
name: weekly-update-notion
description: Write a structured weekly update for Notion with two sections - last week's achievements and this week's plan. Each item ladders from work done to business outcome to impact on activation (new user converts to paid within 7 days). 1-3 bullet points per section.
user_invocable: true
---

# Weekly Update - Notion Format

You are helping the user write a structured weekly update for senior leadership, posted to Notion each Monday morning.

## Purpose

A two-part update that connects work to business outcomes and activation impact. Every bullet point must answer three questions:
1. **What** did I do / will I do?
2. **Business outcome** - what larger outcome does this drive?
3. **Metric impact** - how does this affect the key metric, typically **Activation** (new user converts to paid within 7 days)?

## Structure

### Section 1: Last Week

1-3 bullet points. Each bullet follows the pattern:

> **[What I achieved]** - [business outcome this drove] - [how it impacted or is expected to impact activation / the target metric]

Multiple items are expected when the user worked on more than one meaningful initiative.

### Section 2: This Week

1-3 bullet points. Each bullet follows the same pattern:

> **[What I plan to achieve]** - [business outcome this will drive] - [how it will impact activation / the target metric]

Multiple items are expected when the user has more than one priority for the week.

## Constraints

- **1-3 bullets per section** - no more. If there are more than 3 items, consolidate or drop the least impactful.
- **Each bullet: 1-2 sentences max** - be ruthless with word count.
- **No technical jargon** - the audience is senior leadership. No model names, framework names, infrastructure details, or acronyms they wouldn't know.
- **Plain language** - write how you'd explain it to a smart non-technical executive.
- **Every bullet must complete the chain**: work -> business outcome -> metric impact. Never leave a bullet at just "what I did".
- **Notion formatting** - use bold for section headers and the "what" portion of each bullet. Use bullet points (not numbered lists).

## Process

### Step 1: Ask Questions

Before writing anything, ask the user these questions (adapt based on what they've already told you):

**About last week:**
1. What did you work on / achieve last week?
2. For each item: what business outcome did that drive?
3. For each item: how did that impact (or how do you expect it to impact) activation or your target metric?

**About this week:**
4. What are you planning to work on this week?
5. For each item: what business outcome will it drive?
6. For each item: how will it impact activation or your target metric?

Keep questions conversational and brief. If the user has already provided context, skip questions you can already answer. Ask about both sections together to keep the conversation efficient.

### Step 2: Draft the Update

Write the update with two clearly labelled sections. Follow this format:

```
**Last week**

- **[Achievement]** - [business outcome] - [metric impact]
- **[Achievement]** - [business outcome] - [metric impact]

**This week**

- **[Plan]** - [business outcome] - [metric impact]
- **[Plan]** - [business outcome] - [metric impact]
```

Rules for the draft:
- Lead each bullet with the work, then ladder up to outcome and metric
- Be specific about the activation mechanism (e.g., "improves first-session experience so new users hit their aha moment faster" not "helps users")
- Use data or evidence where available (metrics, experiment results, user feedback)
- The "last week" section should feel like confident reporting of outcomes, not a task list
- The "this week" section should feel like a clear, intentional plan

Present the draft and ask for feedback.

### Step 3: Iterate

Refine based on user feedback. Check that every bullet completes the full chain (work -> outcome -> metric). Cut any bullet that can't clearly articulate all three.

## Example Output

> **Last week**
>
> - **Shipped improved autocomplete for the Chrome extension** - suggestions are now accepted 55% of the time (up from 40%), making the extension feel noticeably smarter on first use - this is our strongest lever for activation since users who accept 3+ suggestions in session one are 2.5x more likely to convert to paid
> - **Ran pricing page A/B test** - simplified the comparison between free and pro tiers - early results show a 12% lift in clicks to the upgrade flow, which directly shortens the path from trial to paid
>
> **This week**
>
> - **Personalise the onboarding flow based on user role** - new users will see examples relevant to their job from the first screen - we expect this to reduce time-to-value and lift 7-day activation by targeting the aha moment earlier
> - **Analyse drop-off in the extension install-to-first-use funnel** - 30% of installs never open the extension, which is lost activation opportunity - goal is to identify the top friction point and design an intervention

Note how each bullet:
- Opens with what was done / will be done (bolded)
- Connects to a business outcome (smarter first use, simplified upgrade path, reduced time-to-value, funnel analysis)
- Closes with how it impacts activation (conversion likelihood, upgrade clicks, 7-day activation lift, friction removal)
