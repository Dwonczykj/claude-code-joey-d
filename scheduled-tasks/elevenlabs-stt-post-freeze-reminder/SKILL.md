---
name: elevenlabs-stt-post-freeze-reminder
description: One-time reminder to resume ElevenLabs direct-STT work after code freeze
---

Remind Joey: the ElevenLabs direct-STT migration work is due to resume now that last week's code freeze is over.

Context:
- Linear root ticket: PRE-2578 "Migrate in-person + imported transcription from Assembly to ElevenLabs" (https://linear.app/fyxer/issue/PRE-2578) — currently Backlog, deferred post-freeze.
- Open PRs (all Fyxer-AI/web-app, Joey's): #10603, #10604, #10605, #10606 (the 1–4 direct-STT stack, stacked in that order off staging) and #10579 (always-use-ElevenLabs, likely superseded by the gated stack — review before landing).
- Known blockers flagged earlier on #10605: keyterm-validation bypass bug and a bug treating a 429 as a permanent failure. Both need fixing before enable.

Action: post a short reminder summarising the above and asking Joey whether to move PRE-2578 back into progress and start reviewing/pushing the stack. Do not change any code or Linear state yourself — just remind.