---
name: doctor
description: Find the sf sessions that went badly (judge and thrash scores below 0.5), read the sf skills they ran, draft skill edits on a branch, run the replay gate, and open a DRAFT PR only if no held-out task got worse and the total got better. Never merges. Use when the user says "run the doctor", "/doctor", "why did sf do badly on these sessions" or "patch sf from the bad sessions".
user_invocable: true
---

# doctor

Patch sf's own skills from sessions that went badly, and prove the patch helps before anyone reads it. You draft; Joey reviews and merges. Never merge, never mark ready.

Run commands from `local-plugins/sf`. All data comes from extractor records (`scripts/extract_sessions.py`), never `~/.claude/projects`. If records are stale, ask Joey to re-run the extractor.

## Hard limits

- Edit only files under `skills/` (and `commands/` is out too: `open-pr` rejects anything outside `skills/`). Never edit `evals/` (rubrics, held-out set), `scripts/judge_sessions.py` or `scripts/replay_gate.py`. Rubric or judge-model changes go through Joey's hand labels, not here.
- Never learn from a held-out task. `doctor.py` skips them and `open-pr` refuses them; do not work around it.
- Do not run this on a new class of session (for example the custom-integrations orchestrator sessions) until Joey says its rubric exists.

## Steps

1. **Select.** `python3 scripts/doctor.py select`. It prints sessions scoring below 0.5 (mean of the judge's scores and a thrash score; sessions the judge has not scored are thrash-only), grouped by sf skill, with each skill's file. If nothing is low, say so and stop.
2. **Cluster.** Pick one cluster: a skill that shows up across several low sessions with the same symptom (failed calls, a repeated command, a long PR body, redundant tests). Read each session's record under the records dir (`why_sf`, `tool_calls`, `repeated`, `prs`). Name the symptom in one sentence per session. One session alone is an anecdote: skip it unless it is far worse than the rest.
3. **Read the skills.** Read the skill files from `select`'s `skill_files` for that cluster. Find the instruction that caused or failed to prevent the symptom.
4. **Draft.** Cut a branch off the current one (`<prefix>/doctor-<skill>`). Make the smallest edit that removes the cause: delete or sharpen a line before adding one. One cluster per branch. Commit it (the gate must score what the PR will contain).
5. **Gate and PR.** `python3 scripts/doctor.py open-pr --before <base ref> "<title>" <session ids you learned from>`. It runs the replay gate (sf at the base ref vs this branch on the 10 held-out PRs) and opens a draft PR only on PASS (no task worse, total up by 0.10 or more), with the table in the body. On FAIL it prints the table and opens nothing: read it, try one narrower edit at most, then stop and report the table. The gate takes a while and costs model calls; run it in the background.
6. **Report** to Joey: the cluster and symptom, the diff in one line, the table, the PR link or "no PR, gate failed". Do not claim the patch fixes the symptom: the gate shows the PR-description task did not regress, which is weaker.
