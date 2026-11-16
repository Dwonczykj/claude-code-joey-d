#!/usr/bin/env python3
"""The deterministic parts of the sf doctor skill (skills/doctor/SKILL.md): which sessions to learn from, and the PR gate.

    python3 doctor.py select [--records DIR] [--state DIR]     # JSON: sessions scoring < 0.5, grouped by sf skill
    python3 doctor.py open-pr --before REF TITLE SESSION_ID... # replay gate, then a DRAFT PR only on PASS
    python3 doctor.py --self-check

Reads extractor records, the judge's labels/judge.jsonl and thrash metrics; never ~/.claude/projects (R10).
Session score = mean of the judge's non-na scores (when the session was judged) and a thrash score in 0..1.
Held-out PRs and sessions (evals/replay/held-out.json) are never selected, and open-pr refuses sessions on that list (R11).
open-pr refuses edits outside skills/ (rubrics, judge, gate and held-out set stay out of the doctor's reach), needs a
committed tree so the PR is what the gate scored, and only ever creates a draft. It never merges.
"""
import argparse
import glob
import json
import os
import subprocess
import sys

import judge_sessions as judge
import replay_gate as gate
import thrash_report as thrash

PLUGIN = gate.PLUGIN
LOW = 0.5
THRASH_HALF = 20  # a thrash score of 20 (about the 75th percentile of 200 sessions) maps to 0.5


def thrash_01(score):
    return 1 / (1 + score / THRASH_HALF)


def held_out_session(r):
    sessions = {t["session_id"] for t in json.load(open(gate.HELD_OUT))}
    return r["session_id"] in sessions or any((p["repo"], p["number"]) in gate.held_out() for p in r["prs"])


def scored(records, judged):
    """-> [{session, score, skills, judge, thrash}] for every record not held out."""
    out = []
    for path in glob.glob(os.path.join(records, "*.json")):
        r = json.load(open(path))
        if held_out_session(r):
            continue
        t = thrash.metrics(r)
        parts = [v for v in judged.get(r["session_id"], []) if v is not None] + [thrash_01(t["score"])]
        out.append({"session": r["session_id"], "score": round(sum(parts) / len(parts), 2), "skills": t["skills"],
                    "judge": judged.get(r["session_id"]), "thrash": t["score"], "failed": t["failed"],
                    "repeats": t["repeats"], "top_repeat": t["top_repeat"]})
    return out


def judged_scores(state):
    """{session_id: [verbosity, redundant_tests]} from the judge's rows made with the current rubrics."""
    rows = judge.latest_rows(os.path.join(state, "labels", "judge.jsonl"), {m: judge.grader(m) for m in judge.METRICS})
    by_session = {}
    for r in rows.values():
        by_session.setdefault(r["session_id"], []).extend(r[m] for m in judge.METRICS)
    return by_session


def select(records, state):
    low = sorted((s for s in scored(records, judged_scores(state)) if s["score"] < LOW), key=lambda s: s["score"])
    clusters = {}
    for s in low:
        for k in s["skills"] or ["(none)"]:
            clusters.setdefault(k, []).append(s["session"])
    files = {k: p for k in clusters for p in [skill_file(k)] if p}
    return {"low": low, "clusters": dict(sorted(clusters.items(), key=lambda kv: -len(kv[1]))), "skill_files": files}


def skill_file(name):
    """'sf:plan' -> the skill's or command's file inside this plugin, or None (skills from other plugins are not ours to edit)."""
    n = name.split(":", 1)[-1] if name.startswith("sf:") else None
    for p in (n and ("skills/%s/SKILL.md" % n, "commands/%s.md" % n)) or ():
        if os.path.exists(os.path.join(PLUGIN, p)):
            return p
    return None


def open_pr(before, title, sessions, records):
    for sid in sessions:
        if held_out_session(json.load(open(os.path.join(records, sid + ".json")))):
            sys.exit("%s is in the held-out set: the doctor must not learn from it" % sid)
    git = lambda *a: subprocess.run(["git", "-C", PLUGIN, *a], capture_output=True, text=True, check=True).stdout
    outside = [f for f in git("diff", "--name-only", "--relative", before).split() if not f.startswith("skills/")]
    if outside:
        sys.exit("the doctor may only edit skills/ (rubrics, judge, gate, held-out set are off limits); also changed: %s" % outside)
    if git("status", "--porcelain"):
        sys.exit("commit the skill diffs first: the gate must score what the PR will contain")
    p = subprocess.run([sys.executable, os.path.join(gate.HERE, "replay_gate.py"), "run", "--before", before,
                        "--records", records], capture_output=True, text=True)
    print(p.stdout)
    if p.returncode:
        sys.exit("gate did not pass (or failed to run): no PR. %s" % p.stderr.strip()[-300:])
    body = "Drafted by the sf doctor from sessions %s.\n\nReplay gate, sf at `%s` vs this branch:\n\n%s\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n" % (
        ", ".join(s[:8] for s in sessions), before, p.stdout.strip())
    subprocess.run(["git", "-C", PLUGIN, "push", "-u", "origin", "HEAD"], check=True)
    subprocess.run(["gh", "pr", "create", "--draft", "--title", title, "--body", body], cwd=PLUGIN, check=True)


def self_check():
    import tempfile
    assert thrash_01(0) == 1 and thrash_01(20) == 0.5 and thrash_01(310) < 0.07
    with tempfile.TemporaryDirectory() as tmp:
        rec, state = os.path.join(tmp, "rec"), os.path.join(tmp, "state")
        os.makedirs(rec)
        os.makedirs(os.path.join(state, "labels"))
        keep, gate.HELD_OUT = gate.HELD_OUT, os.path.join(tmp, "h.json")
        json.dump([{"repo": "o/r", "number": 7, "session_id": "held"}], open(gate.HELD_OUT, "w"))
        mk = lambda sid, fails, skills, prs=(): json.dump(
            {"session_id": sid, "start": "2026-01-01", "tool_calls": [{"name": "Bash", "input": "x", "error": True}] * fails,
             "repeated": [], "why_sf": {"skills": skills}, "prs": list(prs)}, open(os.path.join(rec, sid + ".json"), "w"))
        mk("good", 0, ["sf:plan"])
        mk("thrashy", 20, ["sf:plan", "sf:build"])  # score 60 -> 0.25
        mk("held", 20, ["sf:plan"])
        mk("viapr", 20, ["sf:plan"], [{"repo": "o/r", "number": 7}])
        mk("judged", 0, ["sf:review-seat"])  # thrash 1.0 + judge .25, .25 -> mean 0.5: not low
        mk("judged2", 0, ["sf:review-seat"])  # thrash 1.0 + judge 0, 0 -> 0.33: low
        g = {m: judge.grader(m) for m in judge.METRICS}
        with open(os.path.join(state, "labels", "judge.jsonl"), "w") as f:
            for sid, v in (("judged", .25), ("judged2", 0)):
                f.write(json.dumps({"session_id": sid, "url": "u" + sid, **{m: v for m in judge.METRICS},
                                    **{m + "_rubric": g[m]["sha"] for m in judge.METRICS}}) + "\n")
        out = select(rec, state)
        assert [s["session"] for s in out["low"]] == ["thrashy", "judged2"], out["low"]
        assert out["clusters"] == {"sf:plan": ["thrashy"], "sf:build": ["thrashy"], "sf:review-seat": ["judged2"]}, out["clusters"]
        assert all(os.path.exists(os.path.join(PLUGIN, f)) for f in out["skill_files"].values())
        for sid in ("held", "viapr"):
            try:
                open_pr("main", "t", [sid], rec)
                raise AssertionError("learned from held-out " + sid)
            except SystemExit as e:
                assert "held-out" in str(e)
        gate.HELD_OUT = keep
    print("self-check ok")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("cmd", nargs="?", choices=("select", "open-pr"))
    ap.add_argument("args", nargs="*")
    ap.add_argument("--records", default=os.path.join(judge.STATE, "records"))
    ap.add_argument("--state", default=judge.STATE)
    ap.add_argument("--before")
    ap.add_argument("--self-check", action="store_true")
    a = ap.parse_args()
    if a.self_check:
        self_check()
    elif a.cmd == "select":
        print(json.dumps(select(a.records, a.state), indent=1))
    elif a.cmd == "open-pr" and a.before and len(a.args) > 1:
        open_pr(a.before, a.args[0], a.args[1:], a.records)
    else:
        ap.print_help()
