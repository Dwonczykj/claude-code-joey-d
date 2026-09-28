#!/bin/bash
# Governs `git push` for agents (calls carrying an agent_id). Humans are unaffected.
# Policy: allow pushes only to branches under the joeydwonczyk/ prefix; always deny the
# protected branches (qa/staging/main/master); deny anything else. Deny on any ambiguity.

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
AGENT_ID=$(echo "$INPUT" | jq -r '.agent_id // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

PREFIX="joeydwonczyk/"
PROTECTED_RE='^(qa|staging|main|master)$'

emit() { # $1 = allow|deny, $2 = reason
  jq -n --arg d "$1" --arg r "$2" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:$d,permissionDecisionReason:$r}}'
  exit 0
}

# Only govern agent-issued git push; everything else passes through untouched.
if [ -z "$AGENT_ID" ] || ! echo "$COMMAND" | grep -qE '(^|\s|&&|\|)git\s+push'; then
  exit 0
fi

# More than one push in one call is too much to parse safely.
if [ "$(echo "$COMMAND" | grep -oE 'git[[:space:]]+push' | wc -l | tr -d ' ')" -gt 1 ]; then
  emit deny "Multiple git push commands in one call; run them separately so each can be checked."
fi

current_branch() { [ -n "$CWD" ] && git -C "$CWD" rev-parse --abbrev-ref HEAD 2>/dev/null; }

# Positional args after 'git push' (drop flags; stop at shell operators/redirections).
ARGS=$(echo "$COMMAND" | sed -E 's/.*git[[:space:]]+push[[:space:]]*//')
POSITIONAL=()
for tok in $ARGS; do
  case "$tok" in
    '&&'|'||'|'|'|'&'|';') break ;;
    *'>'*|*'<'*) break ;;
    --) ;;
    -*) ;;
    *) POSITIONAL+=("$tok") ;;
  esac
done

# Resolve destination branch(es): explicit refspecs, else the current branch.
DESTS=()
if [ "${#POSITIONAL[@]}" -le 1 ]; then
  DESTS+=("$(current_branch)")
else
  for ((i = 1; i < ${#POSITIONAL[@]}; i++)); do
    ref="${POSITIONAL[$i]}"
    dest="${ref##*:}" # right of ':' for a src:dst refspec, else the whole token
    { [ "$dest" = "HEAD" ] || [ -z "$dest" ]; } && dest="$(current_branch)"
    DESTS+=("$dest")
  done
fi

for d in "${DESTS[@]}"; do
  [ -z "$d" ] && emit deny "Could not determine the target branch for git push."
  echo "$d" | grep -qE "$PROTECTED_RE" && emit deny "Agents may not push to protected branch '$d' (qa/staging/main/master)."
  case "$d" in
    "$PREFIX"*) : ;;
    *) emit deny "Agents may only push branches under '$PREFIX'; '$d' is not allowed." ;;
  esac
done

emit allow "Agent push to '${DESTS[*]}' permitted (${PREFIX} prefix, non-protected)."
