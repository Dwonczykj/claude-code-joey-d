---
name: explain-feature
description: Explain what a feature PR does at a product level, in plain terminology with no jargon or vernacular. Handles a stacked PR (a chain where later PRs build on earlier ones) by first explaining each PR on its own, then how they combine into one user-facing behaviour. Use when Joey points at a PR (or a stack) and says "explain this feature", "what does this do at a product level", "explain-feature", "/explain-feature", or wants a plain-English account of a change before testing or announcing it.
user_invocable: true
---

# Explain a Feature PR at a Product Level

Given a PR (which may be one of a stack), explain what it does for the user in plain terms. The reader knows the product but not this code. The output is understanding, not a walkthrough of files.

## Input

A PR number, URL, or branch. If none is given, ask for one. If the PR is stacked (its base is another feature branch, not `staging`/`main`), treat the whole chain as the feature.

## Steps

1. Read the PR: `gh pr view <n> --repo Fyxer-AI/web-app --json title,body,baseRefName,commits,files`.
2. Detect a stack: if `baseRefName` is another feature branch, read that PR too, and repeat up the chain until the base is `staging` or `main`. Note the order (earliest at the bottom).
3. Read enough of the diff to state the real behaviour, not the PR author's framing. Verify the gates and triggers in code — what actually has to be true for the user to see this. Do not trust the description alone; it may name constants or conditions that differ from the code.
4. Write the explanation using the rules below.

## Language rules (strict)

- No jargon, no vernacular, no internal names. Not "promoter", "lookalike", "BM25", "namespace", "OTel", "gate", "flag", "dark ship", "FTS index". If a concept needs a name, describe it in ordinary words the first time and reuse that phrase.
- No metaphors that inflate importance. State what happens and let it stand.
- Full sentences and short paragraphs. Bullets only for a genuine list (for example, the conditions that must hold).
- Say who the user is and what they observe, not what the code does internally. "The next email from that sender is already filed correctly" — not "the classifier appends a suffix".
- British English.

## Output shape

1. **One-sentence summary** — what the feature does for the user, top line.
2. **How it works** — two to four short paragraphs in plain terms. If stacked, first give one plain sentence per PR in the chain (bottom to top: "The first change… The second change…"), then one paragraph on how they combine into the single behaviour the user experiences.
3. **When it applies** — the conditions that must be true for a user to see it, as a short list, in plain words (mailbox type, email type, prior actions, and so on). This is where the real triggers from the code go.
4. **Limits worth knowing** — one short paragraph: what it does not do, and what would make a user think it is broken when it is working as designed.

Keep the whole thing to what the question needs. A single small PR gets a few sentences; a stack gets the full shape.
