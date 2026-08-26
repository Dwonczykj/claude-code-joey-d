## Skill File Structure

When creating Claude skills, each skill must live in its own directory under `~/.claude/skills/` and the skill file must be named `SKILL.md`. For example: `~/.claude/skills/slack-update/SKILL.md`. Never place skill files directly in `~/.claude/skills/` — they will not be read unless they are at `~/.claude/skills/<skill-name>/SKILL.md`.

## Bot-comment triage

A bot flags a symptom, not a mandate. Before fixing, weigh the fix against the code it adds. Fix it when the finding is a real defect on a path that runs, or the fix is roughly as small as the bug. Decline it when guarding the edge case costs more code than the edge case costs in practice: a branch, a null-guard, or a config toggle added for an input that can't occur, or whose failure is trivial and self-correcting. A PR that grows to satisfy a linter-bot is a worse PR. When you decline, reply on the thread with the reason (intentional / can't-occur / cost outweighs benefit) and resolve it. Silence reads as an oversight; a one-line "won't fix, because X" reads as a decision.
