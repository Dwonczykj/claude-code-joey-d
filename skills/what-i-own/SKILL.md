---
name: what-i-own
description: Registry of things Joey has explicitly taken ownership or maintenance of, so any agent recognizes a listed area is already spoken for. Use before flagging something as unowned, assigning it to someone else, filing a ticket asking "who owns this", or when a task touches one of the listed areas and prior context would change the approach.
---

# What I Own

Things Joey has told a team, in Slack or elsewhere, that he owns or will maintain — plus long-running areas he built and keeps up. Not a task list; a "don't reassign this, check with me / use this context" list.

Check this when:
- a PR, Linear issue, or Slack thread is about to name someone else as owner of one of these areas
- a task touches one of these areas and existing design/history would change the approach
- deciding whether a gap is actually unowned before raising it as one

## Entries

- **Braintrust PII redaction** — before any data reaches Braintrust (not wired in yet, but planned for LLM tracing), redact special-category PII (religion, sexual orientation, ethnicity, political opinion, trade union membership, etc. — via Google DLP/SDP, the same detector already used on desktop screen captures) so enabling Braintrust later never exposes it. Committed in the ToS/fine-tuning Slack thread, 2026-09-17: [Slack thread](https://fyxerai.slack.com/archives/C0BN9597H28/p1789629845322939?thread_ts=1789569923.514559&cid=C0BN9597H28).

- **Relabel learning** — the agentic labelling / relabel-capture pipeline (SFT experts as priors behind one decision agent, model pricing, capture-misattribution and contention incidents). See [[project_agentic_labelling_design]], [[reference_relabel_agent_model_pricing]].

- **Hybrid diarization** — the diarization eval page and roster/speaker-attribution work (staging dogfood page, Recall provider roster divergence, transcript speaker gaps). See [[project_hybrid_diarization_eval_page]], [[project_hybrid_diarization_roster_per_bot_divergence]].

- **ElevenLabs vendor relationship** — the $420k/yr commitment and the direct-STT migration risk review. See [[project_elevenlabs_commitment]], [[project_elevenlabs_direct_stt_migration_risk_review]].

## Adding an entry

One bullet: what it is, the commitment/ownership in one line, a date if it came from a specific thread, and a link (Slack thread and/or `[[memory-file]]` for detail already captured elsewhere). Don't duplicate memory content here — link to it.
