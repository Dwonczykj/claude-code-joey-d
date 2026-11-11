---
description: "Print a Build Room's open PRs and unbuilt tickets as a markdown table, after reading them from GitHub. Pass the room name; --cached skips GitHub."
---
Room: $ARGUMENTS (a room name under the Build Room home, e.g. `custom-integrations`; add `--cached` to skip GitHub). With no room, use the room this session belongs to, else list the rooms and ask.

Run, then show the output exactly as printed:

```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/room" prs --dir "$HOME/FyxerGh/build-room/<room>" --print
```
