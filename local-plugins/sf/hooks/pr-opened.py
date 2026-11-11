#!/usr/bin/env python3
"""PostToolUse hook on Bash: keep a Build Room's PRs in step with what its sessions do, in code.

After a `gh pr` create, ready, merge, close or reopen in a worktree that a room ticket names (by worktree path or
branch), it records a newly opened PR on that ticket (`room link-pr`) and re-reads the room's PRs from GitHub in the
background (`room prs`, which holds a lock, so a second run just exits). Changes made on GitHub itself (CI, merge
conflicts, a merge in the browser) are the Build Room server's 5-minute check's job. Never blocks the tool call.
"""
import glob
import json
import os
import re
import subprocess
import sys

GH_PR = re.compile(r"\bgh\s+pr\s+(create|ready|merge|close|reopen)\b")
PR_URL = re.compile(r"https://github\.com/[\w.-]+/[\w.-]+/pull/\d+")
BUILD_ROOM = os.path.expanduser(os.environ.get("BUILD_ROOM_HOME", "~/FyxerGh/build-room"))
ROOM = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts", "room")


def git(cwd, *args):
    try:
        return subprocess.run(["git", "-C", cwd, *args], capture_output=True, text=True, timeout=5).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def main():
    data = json.load(sys.stdin)
    if data.get("tool_name") != "Bash":
        return
    verb = GH_PR.search((data.get("tool_input") or {}).get("command") or "")
    if not verb:
        return
    cwd = data.get("cwd") or os.getcwd()
    top = os.path.realpath(git(cwd, "rev-parse", "--show-toplevel") or cwd)
    branch = git(cwd, "rev-parse", "--abbrev-ref", "HEAD")
    by_tree, by_branch = [], []
    for tickets in glob.glob(os.path.join(BUILD_ROOM, "*", "tickets.json")):
        try:
            with open(tickets, encoding="utf-8") as f:
                rows = json.load(f).get("tickets") or []
        except (OSError, ValueError, AttributeError):
            continue
        for t in rows:
            if not isinstance(t, dict) or t.get("source"):
                continue  # an adopted run's ticket is read-only here
            wt = t.get("worktree") and os.path.realpath(os.path.expanduser(t["worktree"]))
            if wt == top:
                by_tree.append((os.path.dirname(tickets), t["id"]))
            elif branch and branch != "HEAD" and t.get("branch") == branch:
                by_branch.append((os.path.dirname(tickets), t["id"]))
    # a worktree match is certain; a branch match counts only when no other ticket in any room shares the name
    hit = by_tree[0] if by_tree else by_branch[0] if len(by_branch) == 1 else None
    if not hit:
        return
    d, ticket = hit
    url = PR_URL.search(json.dumps(data.get("tool_response") or ""))
    if verb[1] == "create" and url:
        subprocess.run(["python3", ROOM, "link-pr", "--dir", d, "--ticket", ticket, "--url", url[0]],
                       capture_output=True, timeout=10)
    subprocess.Popen(["python3", ROOM, "prs", "--dir", d], stdout=subprocess.DEVNULL,
                     stderr=subprocess.DEVNULL, start_new_session=True)


if __name__ == "__main__":
    try:
        main()
    except Exception:  # a hook must never break the session's tool call
        pass
