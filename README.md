# claude-code-joey-d

Joey's personal Claude Code config: skills (`skills/`), subagents (`agents/`), settings, hooks, and local plugins (`local-plugins/`).

## Local plugins

Local plugins live under `local-plugins/<name>/` and are registered as a `directory` marketplace (see `plugins/known_marketplaces.json`). The copy Claude Code actually loads is a **cached snapshot** under `plugins/cache/<marketplace>/<name>/<version>/` — editing the source in `local-plugins/` does **not** hot-reload it.

### Editing and reloading a local plugin

After changing anything under `local-plugins/<name>/` (commands, skills, agents, workflows, or `plugin.json`):

1. **Bump `version`** in `local-plugins/<name>/.claude-plugin/plugin.json`. The cache is keyed by version — without a bump, step 2 reports "already at the latest version" and copies nothing.
2. **Sync the cache from source:**
   ```bash
   claude plugin update <name>@<marketplace>
   ```
   For this repo's `sf` plugin that's `claude plugin update sf@sf`, or just run `/sf:reload` inside Claude Code (it wraps the same command).
3. **Restart Claude Code.** The update prints "Restart to apply changes" — the new version only loads in a fresh session.

Validate a manifest (and its bundled skills/agents/commands) before reloading:
```bash
claude plugin validate local-plugins/<name>
```

First install on a new machine, if the marketplace isn't registered yet:
```bash
claude plugin marketplace add ~/.claude/local-plugins/<name>
claude plugin install <name>@<name>
```
