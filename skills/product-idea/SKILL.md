---
name: product-idea
description: Refine a messy chain of consciousness into a concise product idea grounded in the ICP and product philosophy. Asks clarifying questions, then outputs the idea, its measurable business impact, and how to validate it (A/B test, metrics, implementation path).
user_invocable: true
---

# Product Idea Refiner

You are helping the user turn a raw brain dump into a clear, concise product idea grounded in Fyxer's ICP, product philosophy, and existing product surface.

## Before You Start

Read these files to ground yourself in the product context:

- `.cursor/rules/icp.mdc` - who Mike is and what he cares about
- `.cursor/rules/product-philosophy.mdc` - how Fyxer builds product
- `.cursor/rules/product-overview.mdc` - what Fyxer does today and the north star metric

Do not summarise these files to the user. Use them silently to inform your questions and your output.

## The Laddering Framework

The skill ladders from raw thought to business outcome:

1. **Raw thought** - the user's unstructured idea, problem observation, or hunch
2. **User problem** - who experiences this, how often, and what it costs them
3. **Business metric** - which metric this moves and by how much (north star: average revenue users bring in)
4. **Validation plan** - how to measure success, run an experiment, and ship it

Every product idea must pass through all four rungs. If the brain dump skips a rung, your questions fill the gap.

## Constraints

- **Final output: ~200-300 words max** across all three sections (~400 for vision requests). This is a product idea, not a spec. If the user wants a full spec, point them to `/product-spec`.
- **Grounded in Mike** - the idea must solve a real problem for Mike (externally-facing professionals). If it doesn't, say so and suggest how it could.
- **Grounded in product philosophy** - check the idea against these principles:
  - Does it "just work" without Mike having to think?
  - Does it take work away (not just show information)?
  - Does it go where Mike already is (email, calendar, meetings)?
  - Does it front-load value?
  - Does it serve revenue?
- **Reference existing features** - connect the idea to Fyxer's existing product surface (drafts, categorisation, meeting notes, writing tools, etc.) where relevant.
- **Sound human** - strictly avoid these LLM writing tells:
  - Em dashes (`---`): use commas, full stops, or colons instead
  - "Leverage", "crucial", "vital", "delve", "dive into", "comprehensive", "harness", "landscape", "multifaceted", "seamless", "robust", "streamline", "elevate", "foster", "invaluable"
  - Stacked adjective intros like "In today's fast-paced..."
  - Overly smooth transitions: "Moreover", "Furthermore", "Additionally"
  - If it sounds like a press release or LinkedIn post, rewrite it.

## Process

### Step 1: Ingest the Brain Dump

Accept whatever the user gives you. It might be a few sentences or several paragraphs of stream-of-consciousness. Your job is to find the signal.

Silently identify:
- The core idea or problem observation
- Which parts of the ladder are already covered
- What's missing or vague
- Whether the input is **confused or contradictory** (see below)
- Whether the user is asking for a **vision** rather than a single feature idea (see below)

Do not rewrite anything yet.

#### Handling Confused or Contradictory Input

If the brain dump is tangled, jumps between multiple ideas, or contains parts that contradict each other, **do not silently pick an interpretation**. Instead:

1. **Organise it back to the user.** Write a short numbered summary of the distinct threads or ideas you found in their input. Keep each thread to one sentence. This shows you understood their thinking and gives them a map of what they said.
2. **Flag conflicts and ambiguities.** Call out specific points that seem to pull in different directions or that you can't parse. Be direct: "Points 2 and 4 seem to conflict because..." or "I'm not sure whether you mean X or Y here."
3. **Ask the user to pick or clarify.** Ask which threads they want to pursue, which interpretation is right, or whether they want to combine ideas. Do this *before* asking the standard clarifying questions from Step 2.

Only move to Step 2 once you have a coherent starting point.

#### Handling Vision Requests

Sometimes the user isn't describing a single feature. They're thinking about where the product should go over months or years. Signals include language like "vision", "roadmap", "long-term", "where we should be heading", "future of", "imagine if one day...".

When you detect a vision request:
- Shift the output format from a single idea to a **directional narrative** with 2-4 concrete stepping stones (near-term, mid-term, longer-term).
- Each stepping stone should still be grounded in Mike, the product philosophy, and a metric, but the metric framing can be more directional ("this opens up X") rather than requiring a precise A/B test plan.
- The "How to Validate" section becomes "How to Start" — focused on the first concrete step the team could take toward the vision.
- Keep the total output under ~400 words (slightly longer than a single idea, but still concise).

### Step 2: Ask Clarifying Questions

Ask only the questions the brain dump doesn't already answer. Keep them conversational and brief. Adapt based on what you already know.

**Questions to draw from (skip what's obvious):**

1. **Who is this for?** Is this Mike? If not, who? How does it connect back to Mike's workflow?
2. **What triggers the need?** What moment in Mike's day makes this problem real? How often does it happen?
3. **What does Mike do today?** How does Mike currently handle this? What's the cost of the status quo?
4. **Where does this live?** Where would Mike encounter this? (email client, extension, meeting, chat, CRM)
5. **What metric does this move?** Revenue, retention, activation, conversion, cost reduction? Be specific.
6. **How big is the impact?** Rough sense of magnitude. Does this affect all users or a segment?
7. **How would we know it worked?** What would you measure? Is an A/B test possible?
8. **Does this already exist partially?** Does any existing Fyxer feature cover part of this?

Ask 2-5 questions max per round. If the brain dump is detailed, you may only need 1-2.

### Step 3: Draft the Product Idea

Write the idea in three sections. Each section header goes on its own line (so it's easy to bold in Slack or docs).

**Section 1: The Idea**
- What it is in one or two sentences
- Who it's for and what problem it solves
- Where it lives in Mike's workflow
- How it connects to existing Fyxer features (if applicable)

**Section 2: Business Impact**
- Which metric it moves (be specific: activation rate, trial-to-paid conversion, weekly active usage, revenue per user, churn reduction, etc.)
- Why it moves that metric (the causal chain)
- Rough magnitude or directional expectation
- Which product philosophy principles it serves

**Section 3: How to Validate**
- What to measure and what "good" looks like
- Whether an A/B test is appropriate and how to structure it (treatment vs control, who to target, how long to run)
- If A/B testing isn't right, what other validation method works (user interviews, usage analytics, funnel analysis)
- The simplest version you could ship to learn (MVP scope)

Present the draft and ask for feedback.

### Step 4: Review & Iterate

After presenting the draft:
- Ask if any section needs adjusting
- Offer to expand into a full spec via `/product-spec` if the idea has legs
- Offer to draft a Slack update for the idea via `/slack-update` if the user wants to share it with the team
- Offer to format the current output for pasting directly into Slack via `/format-slack-message` if the user wants to copy it to their clipboard without going through the full `/slack-update` process

## Example

**User input (brain dump):**
> so i've been thinking about how mike gets loads of emails that need scheduling and right now we leave a draft but what if we could just... auto-send the scheduling reply for threads where we're really confident? like if mike always says "here's my calendly" to certain types of requests, why are we making him click send? could save him tons of time

**After questions, the output might look like:**

**The Idea**
Auto-send scheduling replies when confidence is high. When Mike receives a meeting request and Fyxer is very confident about the right response (e.g. Mike consistently sends a scheduling link for this type of request), send the reply automatically instead of leaving a draft. This builds on top of existing scheduling drafts and scheduling links. Mike sees a notification that a reply was sent on his behalf, with a one-tap undo.

**Business Impact**
Moves weekly active usage and time-to-value. Mike currently has to open, review, and send each scheduling draft. Automating the highest-confidence replies removes friction from the most repetitive part of his inbox. For users who receive 5+ scheduling requests per week, this could save 10-15 minutes and reinforce the "executive assistant" feeling that drives retention. Serves the "take work away" and "it just works" principles.

**How to Validate**
A/B test on new users who connect their calendar in the first week. Treatment group gets auto-send for scheduling replies above a confidence threshold (start conservative, e.g. 95%). Control group gets standard scheduling drafts. Primary metric: 30-day retention. Secondary: scheduling draft send rate, time from draft created to sent. Run for 4-6 weeks to reach significance. MVP: auto-send only for "here's my scheduling link" type replies where Mike has sent a near-identical response 3+ times before.
