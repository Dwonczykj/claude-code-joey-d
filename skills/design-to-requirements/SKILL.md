---
name: design-to-requirements
description: Turn a finished design artefact (slide deck, design doc, PRD, architecture diagram, long chat thread) into a subsectioned bullet list of buildable requirements, without reading or tracing the codebase. Use when the user points at a deck/doc/spec and says "break this into requirements", "what do we need to build from this", "turn this into a requirements list", "/design-to-requirements". Read-only on the source, writes no code.
---

# Design to Requirements

Read one design artefact, emit every commitment it makes as a short requirement bullet, grouped into subsections. The artefact is the only source of truth. No codebase tracing, no invention.

Not the same as `gather-requirements`: that one interviews the user and traces code to *decide* scope. This one extracts scope that has already been decided and written down.

## Hard rules

- **Read the whole artefact first.** Every slide, every speaker note, every aside box. Notes and side panels usually carry the constraint the main body omits.
- **The artefact is the boundary.** Do not add requirements it does not state, and do not drop ones that are inconvenient. If something is stated only in a note, it still counts.
- **One bullet, one requirement.** Short statement, present tense, testable. Split compound bullets.
- **Keep the concrete values.** Numbers, thresholds, field names, model names, path names, latency and cost budgets, function/file references. These are the requirement; paraphrasing them away makes the list useless.
- **Never trace or edit code.** Reading the artefact is the whole input. The user can run `gather-requirements` afterwards if reuse mapping is needed.

## Process

1. **Separate current state from target state.** Most decks open by describing what exists today. Those slides are context, not requirements. Say in one line which slides you treated as current-state, so the user can correct you.
2. **Walk the artefact in order and collect every commitment.** A commitment is anything that constrains the build: a step, a field, a limit, a fallback, a metric, a deletion, a deferral.
3. **Group into subsections by pipeline stage or subsystem**, following the artefact's own order where it has one. Typical spine: contract/invariants, each processing stage in sequence, validation and failure, side effects, observability, learning loops, UI surface, migration and compatibility, budgets, evaluation, deferred.
4. **Give every subsection a heading that names the thing**, not the slide title.
5. **Capture the negative requirements too.** Anything the artefact drops on purpose, rejects, or defers is a requirement: it stops someone rebuilding it. Give each its stated reason.
6. **Close with open questions.** At most two or three: the decisions the artefact leaves unresolved that would change the build. State why each one moves the work. No decisions the artefact already made.

## Subsection headings that earn their place

- `## Contract (unchanged)` for the invariants the change must not break.
- One `##` per stage, in execution order, named for what it does.
- `## Backwards compatibility` for the old-to-new mapping when the design replaces something.
- `## Deferred, not in v1` for the explicit non-goals.

## What a good requirement looks like

- Good: "Validate schema, chosen label inside the allowed subset, winner present in `eligibleLogicalLabels`, confidence above floor."
- Good: "Deadlines: 1.5s on the model, 2s on the whole classification."
- Bad (vague): "The system should be observable."
- Bad (lost the value): "Enforce a latency budget."
- Bad (invented): a requirement the artefact never states, however sensible.

## Output

Markdown in the chat response, subsectioned as above. Only write it to a file if the user asks.
