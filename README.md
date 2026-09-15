# claude-code-joey-d

Joey's personal Claude Code config. The one thing here worth installing is the **`sf` software factory** plugin — an `idea → open PR` pipeline of gated `sf:` commands. Everything else (skills, subagents, hooks, settings) is personal setup.

## Install the `sf` plugin

```bash
claude plugin marketplace add ~/.claude/local-plugins/sf
claude plugin install sf@sf
```

Or, inside Claude Code: `/plugin marketplace add ~/.claude/local-plugins/sf` then `/plugin install sf@sf`.

Then run `/sf:install` once per machine to check its external deps (Cursor CLI, Codex CLI) and set your branch prefix. What each command does, and a diagram of how `start-feature` works, is in **[local-plugins/sf/README.md](local-plugins/sf/README.md)**.

## Editing and reloading the plugin

The copy Claude Code loads is a **cached snapshot** under `plugins/cache/sf/sf/<version>/` — editing the source in `local-plugins/sf/` does not hot-reload it. After changing anything under `local-plugins/sf/`:

1. **Bump `version`** in `local-plugins/sf/.claude-plugin/plugin.json` (the cache is keyed by version — without a bump, the update copies nothing).
2. **Sync the cache:** `claude plugin update sf@sf`, or `/sf:reload` inside Claude Code.
3. **Restart Claude Code** — the new version only loads in a fresh session.

Validate a manifest (and its bundled skills/agents/commands) before reloading:

```bash
claude plugin validate local-plugins/sf
```
