# claude-code-joey-d

Joey's personal Claude Code config. The one thing here worth installing is the **`sf` software factory** plugin — an `idea → open PR` pipeline of gated `sf:` commands. Everything else (skills, subagents, hooks, settings) is personal setup.

## Install the `sf` plugin

The plugin is published as its own repo, [`Dwonczykj/sf`](https://github.com/Dwonczykj/sf), so installing it doesn't pull this whole personal config. One line, shareable with anyone:

```bash
claude plugin marketplace add Dwonczykj/sf && claude plugin install sf@sf
```

Inside Claude Code: `/plugin marketplace add Dwonczykj/sf` then `/plugin install sf@sf`. (`install` takes `plugin@marketplace`, not a URL, so the marketplace is added first — the `&&` makes it one command.)

### Where the plugin lives, and publishing changes

The source of truth is `local-plugins/sf/` in **this** repo. `Dwonczykj/sf` is a `git subtree` mirror of that directory. Workflow:

1. Edit under `local-plugins/sf/`, bump its `plugin.json` version, commit here.
2. Publish the change to the standalone repo:
   ```bash
   git subtree push --prefix=local-plugins/sf sf-dist main
   ```
   (`sf-dist` is the remote for `Dwonczykj/sf`; add it once with `git remote add sf-dist https://github.com/Dwonczykj/sf.git`.)

For local dev against the working tree, point a marketplace at the directory: `claude plugin marketplace add ~/.claude/local-plugins/sf`.

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
