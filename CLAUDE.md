# SuperClaude Entry Point

@COMMANDS.md
@FLAGS.md
@PRINCIPLES.md
@RULES.md
@MCP.md
@PERSONAS.md
@ORCHESTRATOR.md
@MODES.md

## Skill File Structure

When creating Claude skills, each skill must live in its own directory under `~/.claude/skills/` and the skill file must be named `SKILL.md`. For example: `~/.claude/skills/slack-update/SKILL.md`. Never place skill files directly in `~/.claude/skills/` — they will not be read unless they are at `~/.claude/skills/<skill-name>/SKILL.md`.
