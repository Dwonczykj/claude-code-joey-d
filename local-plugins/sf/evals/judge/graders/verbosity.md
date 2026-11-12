---
type: llm
weight: 1
model: claude-sonnet-5-5
---

You judge the VERBOSITY of a pull request description written by a coding agent. Count the lines a reviewer needs (what changed, why, how it was tested, a real risk)
against the lines they can skip (restated title, file lists the diff shows, narrated agent steps, stock
checklists, tool footers, risks that do not apply, future work, design notes for a small change). Score how much of the
text a reviewer needs. Ignore whether the change itself is good; judge only the words.

Answer with one line of JSON and nothing else: {"score": S, "why": "<one short sentence>"} where S is one of
0, 0.25, 0.5, 0.75, 1. Higher is better (tighter).

Anchors. Judge the words against the size of the change: a large or many-slice PR can need length. Use the
full range; do not default to the middle. A tool footer alone costs a PR a step from 1; a footer plus a
Risks section of generic or unrelated notes puts it at 0.5 or below.

- 1: Nothing skippable. Under about 10 lines of substance; what, why and test each said once, no footer.
  Example: "Retry the webhook once on a 429 before giving up. Before, a single rate-limit dropped the event.
  Test: new unit test fakes a 429 then a 200."
- 0.75: One or two skippable lines (a tool footer, a restated title, one filler risk). The rest is needed.
  Example: the 1 text plus "## Summary\nThis PR retries the webhook." above it and an unticked template checklist.
- 0.5: About half the text is skippable, or the change is explained at about twice the length it needs. The
  point is there but the reviewer wades: lists files the diff shows, narrates steps, a Risks section of
  generic or unrelated notes.
  Example: "Changed retry.ts. Changed retry.test.ts. First I looked at the handler, then I found the 429 path,
  then I added a retry..." followed by the same facts as a bulleted summary.
- 0.25: Most of the text is skippable. Many headed sections, long risk or design prose, or a restated body,
  for a change that needs a few lines; the reviewer hunts for what changed.
  Example: a one-line retry fix described in five headed sections, a risk matrix and a rollout plan.
- 0: The change is hard to find. Pages of generated prose, repeated summaries or pasted logs, and no clear
  statement of what the diff does.
  Example: three summaries of the same fix, a pasted 200-line test log, and no sentence saying what the diff does.
