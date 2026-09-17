---
name: explain-feature
description: Explain what a feature PR does, either at a product level (default) or as engineering stages. Handles a stacked PR (a chain where later PRs build on earlier ones) by first explaining each PR on its own, then how they combine. Use when Joey points at a PR (or a stack) and says "explain this feature", "what does this do at a product level", "explain the stages", "explain-feature", "/explain-feature", or wants a plain account of a change before testing or announcing it.
user_invocable: true
---

# Explain a Feature PR

Given a PR (which may be one of a stack), explain what it does. The reader knows the product but not this code.

Two output modes, same investigation:

- **product** (default) — what the feature does for the user, in plain terms. The output is understanding, not a walkthrough of files. Reach for this before testing or announcing.
- **stages** — how the feature works as a sequence of engineering stages: what happens where, in order, mapped onto the code. Reach for this to understand or debug the mechanism.

Pick `stages` only if Joey asks for it — "in stages", "engineering stages", "how each stage works", "explain-feature stages". Otherwise use `product`.

## Input

A PR number, URL, or branch, plus an optional mode word. If no PR is given, ask for one. If the PR is stacked (its base is another feature branch, not `staging`/`main`), treat the whole chain as the feature.

## Steps (both modes)

1. Read the PR: `gh pr view <n> --repo Fyxer-AI/web-app --json title,body,baseRefName,commits,files`.
2. Detect a stack: if `baseRefName` is another feature branch, read that PR too, and repeat up the chain until the base is `staging` or `main`. Note the order (earliest at the bottom).
3. Read enough of the diff to state the real behaviour, not the PR author's framing. Verify the gates and triggers in code — what actually has to be true for the user to see this. Do not trust the description alone; it may name constants or conditions that differ from the code.
4. Write the explanation using the mode's rules below.

## Mode: product

Language rules (strict):

- No jargon, no vernacular, no internal names. Not "promoter", "lookalike", "BM25", "namespace", "OTel", "gate", "flag", "dark ship", "FTS index". If a concept needs a name, describe it in ordinary words the first time and reuse that phrase.
- No metaphors that inflate importance. State what happens and let it stand.
- Full sentences and short paragraphs. Bullets only for a genuine list (for example, the conditions that must hold).
- Say who the user is and what they observe, not what the code does internally. "The next email from that sender is already filed correctly" — not "the classifier appends a suffix".
- British English.

Output shape:

1. **One-sentence summary** — what the feature does for the user, top line.
2. **How it works** — two to four short paragraphs in plain terms. If stacked, first give one plain sentence per PR in the chain (bottom to top: "The first change… The second change…"), then one paragraph on how they combine into the single behaviour the user experiences.
3. **When it applies** — the conditions that must be true for a user to see it, as a short list, in plain words (mailbox type, email type, prior actions, and so on). This is where the real triggers from the code go.
4. **Limits worth knowing** — one short paragraph: what it does not do, and what would make a user think it is broken when it is working as designed.

Keep the whole thing to what the question needs. A single small PR gets a few sentences; a stack gets the full shape.

## Mode: stages

Language rules (looser than product, on purpose — this mode maps onto the code):

- Plain-first: describe each concept in ordinary words the first time it appears, then you may use its real name (function, trigger, collection, flag) once it has been introduced. The aim is to connect the explanation to the code, so the real names earn their place here.
- Still no metaphors that inflate importance, and no internal names dropped cold without the plain description first.
- British English.

Output shape:

1. **One-sentence summary** — what the feature does, top line.
2. **The stages** — a numbered list, one entry per stage of the mechanism in the order it runs. For each stage: what triggers it, what it does, and where it lives (file or function). If stacked, note which PR in the chain introduced or changed each stage. A stage that only exists under a condition says so.
3. **What has to be true** — the gates and triggers, verified from code, that decide whether the whole flow runs at all.
4. **Where it can go wrong** — one short paragraph: the stages most likely to fail or surprise, and what a failure looks like from outside.
5. **What to actually review** — always include this, unmasked in every `stages` output, not only when asked. Sort every file the PR/stack touches into three buckets:
   - **Read carefully** — the files that carry the actual logic of the feature, each as a table row: stage(s) it belongs to, a markdown link to the file (with the specific line range that matters, e.g. `file.ts:20-37`), and its line count. Group multiple hunks of the same file as separate rows if they belong to different stages.
   - **Glance at** — files worth a skim, not a close read: constants/config whose values matter but whose logic doesn't, type/model shape files. Name each with a one-line reason.
   - **Skip entirely** — everything else (test files, registration boilerplate, generated-shape plumbing, one-line wiring). List them so Joey knows they were considered, not just omitted, but don't table them.
   
   The point is telling Joey which files carry real decisions worth his attention versus which are mechanical — so he doesn't have to open every file in a PR that touches dozens.

Trace the real path end to end before writing. If the PR touches a shared function, name the callers so the stage list reflects every path that runs, not only the one the PR describes.
