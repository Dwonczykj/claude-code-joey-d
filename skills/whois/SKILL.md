---
name: whois
description: Surface what Joey knows about a person — their bio, role, recent activity, and relationship history — from the synthesized relationship observations in the Obsidian vault. Use when a query references a colleague, teammate, or external contact by name, alias, @handle, or email — both for explicit lookups ("who is X", "what do I know about X", "tell me about X", "remind me about X") and proactively when context about that person would materially help the task (drafting or replying to them, prepping for a call / 1:1 / meeting with them, deciding tone or approach). Read-only.
---

Resolve a person referenced in the query to their synthesized relationship file and surface the right amount of context. The relationship files are maintained by the `synthesize-relationships` scheduled routine; this skill only reads them.

=== PATHS ===
RELS_DIR: /Users/joey/Library/Mobile Documents/iCloud~md~obsidian/Documents/Notes/_observations/relationships
INDEX_FILE: {RELS_DIR}/_index.json

=== IDENTITY (never look up Joey) ===
Me: Joey Dwonczyk · joey.dwonczyk@fyxer.com · GitHub Dwonczykj. Never surface a relationship card about myself.
The internal domain is fyxer.com (colleagues); any other email domain is an external contact.

=== WHEN TO FIRE ===
- Explicit: "who is X", "what do I know about X", "tell me about X", "remind me who X is", "full context on X".
- Proactive: when the task centres on a specific person and their context would change how I act — drafting/replying to them, prepping for a call or 1:1, judging tone/seniority/approach, or making sense of their role in a thread. In the proactive case, lead with a compact card (a few lines) before doing the task.
- Do NOT fire for: trivial mentions where context adds nothing (e.g. "cc Richard on this"), or for me (Joey).

=== RESOLUTION ===
1. Pull the person reference from the query: a full name, alias, first name, @slack handle, github username, or email.
2. Read INDEX_FILE. Match strongest → weakest: by_email → by_github → by_slack_id → by_slack_handle → by_linkedin → by_alias_normalized (lowercase + trim the reference; this map also holds first-name keys like "richard").
3. Resolve to a slug, then read {RELS_DIR}/<slug>.md and surface from it.
4. Index-stale fallback: if nothing matches but a file might exist, kebab-case the reference and check {RELS_DIR}/<kebab>.md directly before concluding no match.

=== AMBIGUITY (pick strongest, note it) ===
When a reference plausibly matches more than one person (e.g. "Richard" → richard-kirsch and richard-hollingsworth), pick the one with the highest `strength` (tie-break on most-recent `last_interaction`), surface that person, and add a one-line note: `_(Also matched: <Other Name> — <their role/company> — say which if you meant them.)_`. Only stop to ask instead of picking when the query context clearly points at the other person or the strengths are tied and both are plausible.

=== OUTPUT (adaptive) ===
DEFAULT — compact card (~4–6 lines):
- **<display_name>** — <role> @ <company> · strength <n>/5 · last contact <date> (<relative, e.g. "2 days ago">)
- One line on who they are, taken from the first sentence of the BIO block.
- 1–2 most recent relationship items, from the latest `## Episodes` bullets or the SYNTHESIS "Recent trajectory".
- A clickable link to the source file.

FULL — when I explicitly ask for more ("tell me everything", "full context", "more on X"):
- The BIO block (identity + relationship arc).
- The SYNTHESIS block (how we know each other / work / personal / trajectory).
- The last ~5 episodes and top co-occurrences (`[[other-slug]]`).
- Key frontmatter: github, slack, linkedin, role, company, first/last interaction, `bio_source` + `bio_last_generated` (flag if the bio is stale, >30 days old, or `source: none`).

If I ask where a fact came from, cite the file's own provenance — the BIO carries source links and the SYNTHESIS carries `[ep:...]` references.

=== NO MATCH (report not found) ===
If the reference resolves to no slug (and no direct file), say plainly in one line that there's no synthesized relationship record for that person yet, and that the nightly `synthesize-relationships` routine will pick them up once they appear in collected episodes. Do NOT grep episodes, Slack, Gmail, or the web — this skill is a fast index lookup only.

=== PII GUARD ===
Per org policy, never emit a customer's personal contact identifiers in a response. For external contacts (non-`fyxer.com`), refer to them by name / role / company and omit raw email addresses and phone numbers from the rendered card (they remain in the file, which I can open). Internal `@fyxer.com` colleagues' work identifiers are fine to show.

=== RULES ===
- Read-only: never write to RELS_DIR or any vault file. Read the index once, then only the one resolved file.
- Never surface a card about Joey.
- Be fast and quiet: in proactive mode, keep it to a compact card and get on with the task; don't dump full context unless asked.
