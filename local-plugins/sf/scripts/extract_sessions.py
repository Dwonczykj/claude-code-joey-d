#!/usr/bin/env python3
"""Turn Claude Code session transcripts into one compact JSON record per sf session.

    python3 extract_sessions.py [--projects DIR] [--out DIR] [--since YYYY-MM-DD] [--no-gh] [--force]
    python3 extract_sessions.py --self-check

Reads <projects>/*/<session>.jsonl (default ~/.claude/projects), keeps a session when it used an
`sf:` skill, ran in an sf checkout (cwd contains local-plugins/sf), or touched a build-room id
(a `build-room/<id>` path in its cwd or a Bash command). Writes <out>/<session_id>.json (default
~/FyxerGh/build-room/sf-outer-loop/records). Records hold tool inputs, so keep them out of git:
the default output is outside every repo. An existing record is skipped unless --force or its transcript has grown since.

Later slices (thrash metrics, judge, replay gate, doctor) read ONLY these records, never the
transcripts, so a cloud move swaps only where this script reads from. Record format, version 1:

    {"version": 1,
     "session_id": str, "project": str (transcript folder name), "cwd": str|null,
     "git_branch": str|null, "start": ISO str|null, "end": ISO str|null, "wall_seconds": float|null,
     "why_sf": {"skills": [str], "sf_cwd": bool, "rooms": [str]},
     "tool_calls": [{"name": str, "input": str (<=120 chars), "error": bool}],   # in call order
     "repeated": [{"name": str, "input": str, "count": int}],   # identical call (whole input) seen 2+ times
     "retries": int,        # calls identical (whole input) to an earlier call of the same session that errored
     "tokens": {"input": int, "output": int, "cache_read": int, "cache_write": int},
     "cost_usd": float|null,   # the transcript's own total, subagent models included; null when it has none
                               # (tokens above are this transcript's main thread only)
     "prs": [{"repo": str, "number": int, "title": str|null, "body": str|null,   # null with --no-gh
              "diff": str|null (<=200 KB), "error": str|null}]}   # only when the session ran `gh pr create`

`input` is the Bash command, the Skill name, or the first of file_path/path/pattern/url/description/
prompt/query. `error` is the tool result's is_error flag. Prompt and reply text is never stored.
"""
import argparse
import collections
import datetime
import glob
import json
import os
import re
import sys
import tempfile
import importlib.machinery
from importlib import util

HERE = os.path.dirname(os.path.abspath(__file__))
spec = util.spec_from_loader("room", importlib.machinery.SourceFileLoader("room", os.path.join(HERE, "room")))  # no .py extension
room = util.module_from_spec(spec)
spec.loader.exec_module(room)  # for gh, GhError and write_json
DEFAULT_OUT = os.path.expanduser("~/FyxerGh/build-room/sf-outer-loop/records")
DEFAULT_PROJECTS = os.path.expanduser("~/.claude/projects")
INPUT_KEYS = ("command", "skill", "file_path", "path", "pattern", "url", "description", "prompt", "query")
COMMAND_RE = re.compile(r"<command-name>/?(sf:[\w-]+)")  # a slash command leaves no Skill tool call
# real rooms only: not file names inside a repo's own build-room/ folder, and not the records dir
ROOM_RE = re.compile(r"FyxerGh/build-room/([A-Za-z0-9][\w-]*)(?![\w.-]|/records)")
SF_CWD_RE = re.compile(r"/local-plugins/sf(/|$)")
PR_RE = re.compile(r"github\.com/([\w.-]+/[\w.-]+)/pull/(\d+)")
DIFF_CAP = 200_000


def short_input(inp):
    inp = inp if isinstance(inp, dict) else {}
    for k in INPUT_KEYS:
        if isinstance(inp.get(k), str):
            return inp[k][:120]
    return ""


def result_text(block):
    c = block.get("content")
    if isinstance(c, list):
        c = " ".join(b.get("text", "") for b in c if isinstance(b, dict))
    return c if isinstance(c, str) else ""


def fetch_pr(pr):
    """Fill title, body and diff on a {repo, number} entry; a gh failure lands in pr["error"]."""
    repo, n = pr["repo"], str(pr["number"])
    try:
        view = json.loads(room.gh("pr", "view", n, "--repo", repo, "--json", "title,body"))
        pr["title"], pr["body"] = view["title"], view["body"]
        pr["diff"] = room.gh("pr", "diff", n, "--repo", repo)[:DIFF_CAP]
    except (room.GhError, ValueError, KeyError) as e:
        pr["error"] = str(e)


def extract(path, use_gh=True):
    """Return the record for one transcript, or None when it is not an sf session."""
    rec = {"version": 1, "session_id": os.path.basename(path)[:-6], "project": os.path.basename(os.path.dirname(path)),
           "cwd": None, "git_branch": None, "start": None, "end": None, "wall_seconds": None,
           "why_sf": {"skills": [], "sf_cwd": False, "rooms": []}, "tool_calls": [], "repeated": [],
           "retries": 0, "tokens": {"input": 0, "output": 0, "cache_read": 0, "cache_write": 0},
           "cost_usd": None, "prs": []}
    why = rec["why_sf"]
    calls, keys, by_id, usage, pr_ids, prs = [], [], {}, {}, set(), {}
    stamps = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            try:
                d = json.loads(line)
            except ValueError:
                continue
            if not isinstance(d, dict):
                continue
            if d.get("timestamp"):
                stamps.append(d["timestamp"])
            if d.get("cwd"):
                rec["cwd"] = rec["cwd"] or d["cwd"]
                if SF_CWD_RE.search(d["cwd"]):
                    why["sf_cwd"] = True
                why["rooms"] += ROOM_RE.findall(d["cwd"])
            rec["git_branch"] = rec["git_branch"] or d.get("gitBranch")
            if d.get("type") == "cost-state":
                rec["cost_usd"] = d.get("totalCostUSD", rec["cost_usd"])
            msg = d.get("message")
            if not isinstance(msg, dict):
                continue
            if d.get("type") == "user":
                why["skills"] += COMMAND_RE.findall(result_text(msg))
            if not isinstance(msg.get("content"), list):
                continue
            if d.get("type") == "assistant" and isinstance(msg.get("usage"), dict):
                usage[msg.get("id") or d.get("uuid")] = msg["usage"]  # one message can span several lines
            for b in msg["content"]:
                if not isinstance(b, dict):
                    continue
                if b.get("type") == "tool_use":
                    inp = b.get("input")
                    call = {"name": b.get("name", ""), "input": short_input(inp), "error": False}
                    calls.append(call)
                    keys.append(json.dumps(inp, sort_keys=True))  # identical means the whole input, not the shown prefix
                    by_id[b.get("id")] = call
                    if call["name"] == "Skill" and call["input"].startswith("sf:"):
                        why["skills"].append(call["input"])
                    if call["name"] == "Bash":
                        cmd = (inp or {}).get("command", "")
                        why["rooms"] += ROOM_RE.findall(cmd)
                        if re.search(r"\bgh pr create\b", cmd):
                            pr_ids.add(b.get("id"))
                elif b.get("type") == "tool_result":
                    call = by_id.get(b.get("tool_use_id"))
                    if call and b.get("is_error"):
                        call["error"] = True
                    if b.get("tool_use_id") in pr_ids and not b.get("is_error"):  # a failed create names a PR that already existed
                        for repo, n in PR_RE.findall(result_text(b)):
                            prs[(repo, int(n))] = {"repo": repo, "number": int(n), "title": None, "body": None, "diff": None, "error": None}
    why["skills"] = sorted(set(why["skills"]))
    why["rooms"] = sorted(set(why["rooms"]))
    if not (why["skills"] or why["sf_cwd"] or why["rooms"]):
        return None
    rec["tool_calls"] = calls
    seen, errored = collections.Counter(), set()
    shown = {}
    for c, k in zip(calls, keys):
        key = (c["name"], k)
        shown[key] = c["input"]
        if key in errored:
            rec["retries"] += 1
        seen[key] += 1
        if c["error"]:
            errored.add(key)
    rec["repeated"] = [{"name": key[0], "input": shown[key], "count": n} for key, n in seen.most_common() if n > 1]
    for u in usage.values():
        t = rec["tokens"]
        t["input"] += u.get("input_tokens") or 0
        t["output"] += u.get("output_tokens") or 0
        t["cache_read"] += u.get("cache_read_input_tokens") or 0
        t["cache_write"] += u.get("cache_creation_input_tokens") or 0
    if stamps:
        rec["start"], rec["end"] = min(stamps), max(stamps)
        t0, t1 = (datetime.datetime.fromisoformat(s.replace("Z", "+00:00")) for s in (rec["start"], rec["end"]))
        rec["wall_seconds"] = (t1 - t0).total_seconds()
    rec["prs"] = list(prs.values())
    if use_gh:
        for pr in rec["prs"]:
            fetch_pr(pr)
    return rec


def run(projects, out, since, use_gh, force):
    files = sorted(glob.glob(os.path.join(projects, "*", "*.jsonl")), key=os.path.getmtime, reverse=True)
    os.makedirs(out, exist_ok=True)
    kept = 0
    for path in files:
        if since and datetime.date.fromtimestamp(os.path.getmtime(path)) < since:
            break  # newest first, so every later file is older too
        dest = os.path.join(out, os.path.basename(path)[:-6] + ".json")
        if os.path.exists(dest) and not force and os.path.getmtime(dest) >= os.path.getmtime(path):  # a live session is redone
            kept += 1
            continue
        rec = extract(path, use_gh)
        if rec:
            room.write_json(dest, rec)
            kept += 1
    print(f"{kept} sf sessions in {out}")


def self_check():
    """Build a fake transcript and one non-sf transcript, extract, and assert on the records."""
    ev = lambda **k: json.dumps(k)
    use = lambda i, name, inp: {"type": "assistant", "timestamp": "2026-01-01T00:00:%02dZ" % i, "cwd": "/x/local-plugins/sf",
        "message": {"id": "m%d" % i, "usage": {"input_tokens": 3, "output_tokens": 4},
                    "content": [{"type": "tool_use", "id": "t%d" % i, "name": name, "input": inp}]}}
    res = lambda i, err, text="": {"type": "user", "timestamp": "2026-01-01T00:01:%02dZ" % i,
        "message": {"content": [{"type": "tool_result", "tool_use_id": "t%d" % i, "is_error": err, "content": text}]}}
    lines = [use(1, "Skill", {"skill": "sf:plan"}), res(1, False),
             use(2, "Bash", {"command": "pnpm test"}), res(2, True),
             use(3, "Bash", {"command": "pnpm test"}), res(3, False),
             use(4, "Bash", {"command": "gh pr create --draft"}), res(4, False, "https://github.com/o/r/pull/7"),
             use(5, "Bash", {"command": "gh pr create --draft"}), res(5, True, "https://github.com/o/r/pull/9"),
             use(6, "Edit", {"file_path": "/a", "old_string": "x"}), res(6, False),
             use(7, "Edit", {"file_path": "/a", "old_string": "y"}), res(7, False),
             use(7, "Bash", {"command": "ls /Users/j/FyxerGh/build-room/sf-outer-loop/records"}),
             use(8, "Bash", {"command": "ls /Users/j/FyxerGh/build-room/my-room --x; ls /r/build-room/public"}),
             {"type": "cost-state", "totalCostUSD": 1.5}]
    with tempfile.TemporaryDirectory() as tmp:
        proj = os.path.join(tmp, "p")
        os.makedirs(proj)
        with open(os.path.join(proj, "sess1.jsonl"), "w") as f:
            f.write("\n".join(ev(**l) for l in lines) + "\nnot json\n")
        with open(os.path.join(proj, "other.jsonl"), "w") as f:
            f.write(ev(type="user", cwd="/elsewhere", message={"content": "hi"}) + "\n")
        with open(os.path.join(proj, "slash.jsonl"), "w") as f:  # only trigger: a typed slash command
            f.write(ev(type="user", cwd="/elsewhere", message={"content": "<command-name>/sf:room</command-name>"}) + "\n")
        out = os.path.join(tmp, "out")
        run(tmp, out, None, False, False)
        assert sorted(os.listdir(out)) == ["sess1.json", "slash.json"], os.listdir(out)
        assert json.load(open(os.path.join(out, "slash.json")))["why_sf"]["skills"] == ["sf:room"]
        r = json.load(open(os.path.join(out, "sess1.json")))
    assert r["why_sf"] == {"skills": ["sf:plan"], "sf_cwd": True, "rooms": ["my-room"]}, r["why_sf"]
    assert [(c["name"], c["error"]) for c in r["tool_calls"]] [:4] == [("Skill", False), ("Bash", True), ("Bash", False), ("Bash", False)]
    assert r["repeated"] == [{"name": "Bash", "input": "pnpm test", "count": 2}, {"name": "Bash", "input": "gh pr create --draft", "count": 2}]  # the two Edits differ, so are not repeats and r["retries"] == 1
    assert r["tokens"]["input"] == 24 and r["tokens"]["output"] == 32 and r["cost_usd"] == 1.5
    assert r["wall_seconds"] == 66.0, r["wall_seconds"]
    assert r["prs"] == [{"repo": "o/r", "number": 7, "title": None, "body": None, "diff": None, "error": None}], r["prs"]  # not the failed create's PR 9
    print("self-check ok")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--projects", default=DEFAULT_PROJECTS)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--since", type=datetime.date.fromisoformat, help="skip transcripts last written before this date")
    ap.add_argument("--no-gh", action="store_true", help="skip the gh lookup of PR title, body and diff")
    ap.add_argument("--force", action="store_true", help="rewrite records that already exist")
    ap.add_argument("--self-check", action="store_true")
    a = ap.parse_args()
    if a.self_check:
        self_check()
    else:
        run(a.projects, a.out, a.since, not a.no_gh, a.force)
