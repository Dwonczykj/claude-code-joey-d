#!/bin/bash
# Block git push operations from agents

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // empty')

# Block git push from agents (identified by agent_id)
if [ -n "$AGENT_ID" ] && echo "$COMMAND" | grep -qE '(^|\s|&&|\|)git\s+push'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Agents are not allowed to run git push. Only human users can push code."
    }
  }'
  exit 0
fi

exit 0
