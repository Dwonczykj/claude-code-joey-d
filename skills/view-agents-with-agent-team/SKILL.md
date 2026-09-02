---
name: view-agents-with-agent-team
description: Open the agent-team dashboard in the browser, starting its dev server first if it isn't already running. Use when the user says "view agents", "show me the agents", "open agent-team", "/view-agents-with-agent-team", or wants to see the Agent Command office view.
---

# View agents with agent-team

Open `http://127.0.0.1:7777/` in the browser, starting the `agent-team` server first if port 7777 isn't already serving it.

## Steps

1. Check whether the server is already up:

   ```bash
   curl -sf -o /dev/null http://127.0.0.1:7777/ && echo RUNNING || echo DOWN
   ```

2. If `DOWN`, start it in the background from the repo:

   ```bash
   cd ~/FyxerGh/agent-team && npm start
   ```

   Run this with `run_in_background: true`, then poll the curl check above (a few seconds apart) until it returns `RUNNING`.

3. Once `RUNNING`, open the dashboard:

   ```
   mcp__Claude_Browser__preview_start with url: http://127.0.0.1:7777/
   ```

Don't restart the server if step 1 already reports `RUNNING` — just open the browser.
