---
name: research-design
description: Design something by running k parallel research agents (Sonnet) that debate for t turns, then an Opus synthesizer that merges their answers or picks the best one, then a parent improvement pass, then an Excalidraw diagram to review. Use when the user says "/research-design", "research this design with k agents", "get several agents to debate this design", or wants a multi-agent design exploration rather than a single opinion.
---

# research-design

Multi-agent design exploration. k Sonnet agents design the same thing from different lenses, see each other's answers each turn, then one Opus agent merges or picks. Parent verifies and diagrams.

## Arguments

Parse from the invocation; ask only if `task` is missing.

| Arg | Meaning | Default |
|---|---|---|
| `k` | number of research agents | 4 |
| `t` | discussion turns before the final answer (total turns = `t + 1`) | 2 |
| `mode` | `merge` or `best` | `merge` |
| `task` | what to design (free text; may be a Linear ticket, PRD, file path) | required |

Accepts `k=5 t=3 mode=best <task>` or plain English ("5 agents, 3 turns, pick the best — design X"). Echo back the resolved values in one line before starting.

Guardrails: `k` 2–6, `t` 1–4. Beyond that, say the cost (`k × (t+1) + 1` agent runs) and ask before proceeding.

## 0. Ground the task first

Before spawning anything, spend a few tool calls establishing shared facts: read the ticket/PRD, grep the code the design touches, note the relevant conventions. Put them in the brief. Agents that start from different guesses about the current system produce fake disagreement, which is the main failure mode of this skill.

## 1. Spawn k agents (one message, so they run concurrently)

`Agent` with `model: "sonnet"`, `subagent_type: "general-purpose"`, `run_in_background: true`, `description: "design lens N"`.

Each brief is identical except the lens. Assign lenses by index, cycling:

1. **Simplest thing that works** — fewest moving parts, YAGNI, delete before adding.
2. **Failure modes** — what breaks at scale, edge cases, data integrity, partial failure.
3. **Reuse** — what already exists in this repo or in a third-party provider; don't build it.
4. **Data model first** — entities, invariants, migration path, query shapes.
5. **User value** — does this serve the ICP; cognitive load, discoverability, trust.
6. **Cost and latency** — token/compute/query cost, hot paths, what runs per-event.

Brief template:

```
You are one of {k} independent design agents working on the same problem. Your lens: {lens}.

TASK: {task}
ESTABLISHED FACTS (do not re-litigate, do verify if load-bearing): {grounding}
CONVENTIONS: {relevant rules — coding standards, product philosophy, repo layout}

You may read code and search. Do not write, edit, or run mutating commands.

Answer in under 300 words, in this shape:
APPROACH: 3-6 bullets.
KEY DECISION: the one call that most shapes the design, and the alternative you rejected.
TOP RISK: the thing most likely to make this wrong.
CONFIDENCE: low | medium | high, and what would raise it.

Your lens is a bias to argue from, not a blindfold — if it leads somewhere wrong, say so.
This is turn 1 of {t+1}. You will see the other agents' answers and be asked to respond.
Your final text is the return value; no preamble.
```

## 2. Discussion turns (repeat t−1 times, then the final turn)

Wait for all k to report. Build one digest: each agent's answer verbatim-but-trimmed, labelled `Agent 3 (failure modes)`. Then load `SendMessage` via ToolSearch and send the same digest to every agent (one message, concurrent):

```
Turn {n} of {t+1}. The group's answers from turn {n-1}:

{digest}

Respond in under 250 words:
CHANGED MY MIND: what you now think differently, and which agent caused it (or "nothing, because…").
DISAGREE: name at least one specific point from another agent you think is wrong, and why. Do not manufacture a disagreement if you genuinely have none — say "no substantive disagreement" and explain why the group is converging.
REVISED APPROACH: your design now, as bullets.
```

Never paraphrase an agent's position in the digest — pass their words. Paraphrase is where the parent's own opinion leaks in and collapses the diversity.

## 3. Final turn

Same broadcast mechanism, but ask for the submission:

```
Final turn. Submit your design. Under 600 words:
APPROACH / COMPONENTS / DATA MODEL / KEY DECISIONS with rejected alternatives / RISKS / OPEN QUESTIONS.
Then a diagram spec, exactly:
DIAGRAM:
NODES: id | label | kind (store|service|ui|external|decision)
EDGES: fromId -> toId | label
This is your own best design, not a summary of the group. Where you still disagree with the group, keep your position and say so in one line.
```

## 4. Synthesizer (one Opus agent)

`Agent` with `model: "opus"`, `run_in_background: false`. Pass all k final designs verbatim, labelled by agent and lens.

**mode=merge** — brief it to produce one design, not a survey: a single APPROACH / COMPONENTS / DATA MODEL / RISKS / OPEN QUESTIONS, plus a CONFLICTS section listing each real disagreement, the call taken, and why, plus one unified `DIAGRAM:` block. Where agents disagree it must decide, not present both.

**mode=best** — brief it to pick one agent's design as the winner and return it whole, with a WHY (2-3 sentences), a LOSERS line naming what each rejected design was better at, and the winner's `DIAGRAM:` block. No grafting.

## 5. Parent improvement pass

You now own the design. Do not pass the synthesizer's output straight through.

- Verify every factual claim about the codebase — file paths, existing helpers, "there is no X". Agents hallucinate infrastructure. Fix or drop what doesn't check out.
- Apply the ladder: cut anything speculative, anything with one implementation, anything a provider or an existing helper already does.
- Check it against the repo conventions and product philosophy that actually apply.
- State your own disagreements with the synthesizer explicitly rather than silently editing them out.

Then update the `DIAGRAM:` block to match what you actually believe.

## 6. Excalidraw

Generate with a throwaway Python script (never hand-write JSON) into the scratchpad as `<slug>.excalidraw`. Requirements:

- `"fontFamily": 2` on every text element, `"roughness": 0` on every element.
- Element array order: arrows → arrow labels → shapes → bound text → free text, so edges render behind nodes.
- **Every arrow is pinned at both ends.** Set `startBinding` and `endBinding` to the element ids the edge joins (each with a `fixedPoint`, and `mode` `"orbit"` for an edge anchor or `"inside"` for a point within the shape), and add `{"id": "<arrowId>", "type": "arrow"}` to each bound shape's `boundElements`. Loose-coordinate arrows look correct until a node is dragged, then detach silently. For a symmetric relationship use ONE arrow with both `startArrowhead` and `endArrowhead` set. Two separate one-way arrows are correct only when each direction carries a different payload.
- Validate before delivering: no dangling `startBinding` / `endBinding` / `containerId` / `boundElements` ids, no arrow missing either binding, no overlapping node rectangles, no free text over a node, z-order bands monotonic.
- Then copy to the clipboard, since a file on disk isn't usable in the web app:

```bash
python3 -c "
import json,sys
d = json.load(open(sys.argv[1]))
print(json.dumps({'type':'excalidraw/clipboard','elements':d['elements'],'files':d.get('files',{})}))
" <path> | pbcopy
```

Report: the resolved args, the design (or a path to it), where the agents disagreed and how it was resolved, your own changes in the improvement pass, the open questions, and that the diagram is on the clipboard ready to paste.

## Notes

- Agents inherit the session's reasoning effort (the `Agent` tool takes `model` but not `effort`). If the session is running at low effort, say so up front — a debate between four low-effort agents is worse than one careful answer.
- One shared digest per turn, broadcast to all — not pairwise messages. k agents × k inboxes is quadratic for no extra signal.
- If two agents converge to the same design by turn 2, say so and drop to `best` mode rather than paying for more turns of agreement.
- If an agent dies or never reports, continue with the survivors and say which one was lost. Don't respawn mid-debate — a fresh agent has none of the discussion context and skews the round.
