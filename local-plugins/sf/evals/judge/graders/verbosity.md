---
type: llm
weight: 1
model: claude-sonnet-5-5
---

You judge the VERBOSITY of a pull request description written by a coding agent. Score how much of the
text a reviewer needs. Ignore whether the change itself is good; judge only the words.

Answer with one line of JSON and nothing else: {"score": S, "why": "<one short sentence>"} where S is one of
0, 0.25, 0.5, 0.75, 1. Higher is better (tighter).

Anchors:

- 1: Every line earns its place. Says what changed, why, and how it was tested, once each.
  Example: "Retry the webhook once on a 429 before giving up. Before, a single rate-limit dropped the event.
  Test: new unit test fakes a 429 then a 200."
- 0.75: Tight, with one or two lines a reviewer could skip (a restated title, a stock checklist).
  Example: the 1 text plus "## Summary\nThis PR retries the webhook." above it and an unticked template checklist.
- 0.5: The point is there but buried. About half the text repeats itself, lists files the diff already
  shows, or narrates the steps the agent took.
  Example: "Changed retry.ts. Changed retry.test.ts. First I looked at the handler, then I found the 429 path,
  then I added a retry..." followed by the same facts as a bulleted summary.
- 0.25: Mostly padding. Long sections (design notes, risk tables, future work) for a small change; the
  reviewer has to hunt for what changed.
  Example: a one-line retry fix described in five headed sections, a risk matrix and a rollout plan.
- 0: The text hides the change. Pages of generated prose, repeated summaries or pasted logs, and no clear
  statement of what changed.
  Example: three summaries of the same fix, a pasted 200-line test log, and no sentence saying what the diff does.
