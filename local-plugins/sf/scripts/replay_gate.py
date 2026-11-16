#!/usr/bin/env python3
"""Replay gate: does a change to sf make it better on a fixed set of past tasks?

    python3 replay_gate.py pick [--records DIR] [-n 10]      # one-off: writes ../evals/replay/held-out.json
    python3 replay_gate.py run --before REF [--records DIR]  # REF's sf vs the working tree's sf, same tasks
    python3 replay_gate.py --self-check

The task is one past PR: given its title and diff, write the PR description (the step sf's PR skills own).
It is not a rebuild of the PR, which would need a checkout of the repo at the base commit per task. Each task
becomes one `claude plugin eval` case, built at run time from extractor records (never ~/.claude/projects)
inside a temp copy of each plugin, so no PR text lands in git. Two LLM graders per case, both on one pinned
model: does the text cover the known merged PR's what/why/test, and the judge's verbosity rubric
(evals/judge/graders/, never edited here: R11). `--ablation with-without` is on, so the no-plugin arm shows
run-to-run noise. Scores are the with-plugin arm's. Verdict: no task worse and the total up by at least MARGIN (0.10, just above the noise of an A/A run).

held-out.json is the marker the doctor reads: it must never learn from, or patch for, a listed PR
(`held_out()`; `python3 replay_gate.py held-out REPO NUMBER` exits 0 when listed).
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile

import judge_sessions as judge

HERE = os.path.dirname(os.path.abspath(__file__))
PLUGIN = os.path.dirname(HERE)
HELD_OUT = os.path.join(PLUGIN, "evals", "replay", "held-out.json")
MODEL = "claude-sonnet-5-5"  # the one pinned model: agent runs and graders both
DIFF_CAP = 30_000
MARGIN = 0.10  # an A/A run (same sf both sides) moved the total +0.08 by noise alone, so "better" must beat that
COVERS = ("Pass only if the agent's reply is a PR description that says what changed, why, and how it was "
          "tested (when the diff has tests), and nothing in it contradicts the reference below, the real merged "
          "PR's description. Wording may differ.\n\nReference:\n")
TIGHT = "Pass only if the text below would score 0.75 or 1 on this rubric.\n\n"


def held_out():
    """-> [(repo, number)] of the frozen task set."""
    return [(t["repo"], t["number"]) for t in json.load(open(HELD_OUT))]


def merged(repo, number):
    p = subprocess.run(["gh", "pr", "view", str(number), "-R", repo, "--json", "state"], capture_output=True, text=True)
    return p.returncode == 0 and json.loads(p.stdout)["state"] == "MERGED"


def pick(records, n):
    """n merged one-PR sessions, evenly spaced over diff size; skips diffs the extractor cut and this repo's own PRs."""
    cands = [c for c in judge.candidates(records) if len(c["diff"]) < 200_000 and "claude-code-joey-d" not in c["repo"]]
    cands = [c for c in sorted(cands, key=lambda c: (len(c["diff"]), c["session_id"])) if merged(c["repo"], c["number"])]
    return [{"repo": c["repo"], "number": c["number"], "session_id": c["session_id"], "title": c["title"]}
            for c in judge.pick_even(cands, n)]


def write_cases(dest, records):
    """One case dir per held-out PR under dest. Fails loudly if a record is missing."""
    by_key = {(c["repo"], c["number"]): c for c in judge.candidates(records)}
    gs = {m: judge.grader(m) for m in judge.METRICS}
    for repo, number in held_out():
        c = by_key[(repo, number)]  # KeyError = record gone; do not run a smaller set
        d = os.path.join(dest, "replay-%s-%d" % (repo.split("/")[1], number))
        os.makedirs(os.path.join(d, "graders"))
        prompt = ("Write the pull request description for this merged change. Reply with the description only.\n\n"
                  "Title: %s\n\nDiff:\n%s\n" % (c["title"], c["diff"][:DIFF_CAP]))
        open(os.path.join(d, "case.yaml"), "w").write(  # JSON is valid YAML, so json.dumps quotes the prompt safely
            'schema_version: "1.0"\nname: %s\nexecution:\n  prompt: %s\n  runs: 3\n  max_turns: 3\n'
            % (os.path.basename(d), json.dumps(prompt)))
        for name, text in (("covers", COVERS + c["body"]), ("tight", TIGHT + gs["verbosity"]["rubric"])):
            open(os.path.join(d, "graders", name + ".md"), "w").write("---\ntype: llm\nweight: 1\n---\n" + text + "\n")


def score(plugin_ref, records, out):
    """Run the replay against one plugin copy. plugin_ref None = the working tree."""
    with tempfile.TemporaryDirectory() as tmp:
        tmp = os.path.realpath(tmp)  # eval refuses a plugin path with a symlink in it (macOS /var)
        if plugin_ref:
            tar = subprocess.run(["git", "-C", PLUGIN, "archive", plugin_ref], capture_output=True, check=True)  # from a subdir, archives just that subdir
            subprocess.run(["tar", "-x", "-C", tmp], input=tar.stdout, check=True)
            subprocess.run(["chmod", "-R", "go-w", tmp], check=True)  # git archive writes group-writable files; eval will not load those
        else:
            shutil.copytree(PLUGIN, tmp, dirs_exist_ok=True, ignore=shutil.ignore_patterns("results", "__pycache__"))
        write_cases(os.path.join(tmp, "evals"), records)
        subprocess.run(["claude", "plugin", "eval", tmp, "--case", "replay-*", "--model", MODEL, "--judge-model", MODEL,
                        "--ablation", "with-without", "-j", "4", "--threshold", "0", "--trust-plugin", "--no-publish",
                        "--json", out], check=True, stdout=subprocess.DEVNULL)
    scores = {c["name"]: c["aggregates"]["score"] for c in json.load(open(out))["cases"]}
    assert len(scores) == len(held_out()), "ran %d of %d tasks" % (len(scores), len(held_out()))
    return scores


def table(before, after):
    """-> (markdown table, verdict ok)."""
    rows = ["| task | before | after | change |", "|---|---|---|---|"]
    for k in before:
        rows.append("| %s | %.2f | %.2f | %+.2f |" % (k, before[k], after[k], after[k] - before[k]))
    tb, ta = sum(before.values()) / len(before), sum(after.values()) / len(after)
    rows.append("| **total (mean)** | %.2f | %.2f | %+.2f |" % (tb, ta, ta - tb))
    ok = all(after[k] >= before[k] for k in before) and ta - tb >= MARGIN
    rows.append("\nVerdict: %s" % ("PASS, no task worse and the total up by %.2f or more" % MARGIN if ok else "FAIL"))
    return "\n".join(rows), ok


def self_check():
    t, ok = table({"a": 0.5, "b": 1.0}, {"a": 1.0, "b": 1.0})
    assert ok and "+0.25" in t
    assert not table({"a": 0.5, "b": 1.0}, {"a": 0.55, "b": 1.0})[1]  # better, but inside the noise margin
    assert not table({"a": 0.5, "b": 1.0}, {"a": 1.0, "b": 0.67})[1]  # one task worse
    assert not table({"a": 0.5}, {"a": 0.5})[1]  # total not better
    with tempfile.TemporaryDirectory() as tmp:
        global HELD_OUT
        keep, HELD_OUT = HELD_OUT, os.path.join(tmp, "h.json")
        json.dump([{"repo": "o/r", "number": 7}], open(HELD_OUT, "w"))
        rec = os.path.join(tmp, "rec")
        os.makedirs(rec)
        json.dump({"session_id": "s", "prs": [{"repo": "o/r", "number": 7, "title": "fix: x", "body": "Why x.",
                                                "diff": "diff --git a/a b/a\n+1\n", "error": None}]},
                  open(os.path.join(rec, "s.json"), "w"))
        write_cases(os.path.join(tmp, "ev"), rec)
        d = os.path.join(tmp, "ev", "replay-r-7")
        assert "Why x." in open(os.path.join(d, "graders", "covers.md")).read()
        assert "fix: x" in open(os.path.join(d, "case.yaml")).read()
        assert held_out() == [("o/r", 7)]
        HELD_OUT = keep
    print("self-check ok")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("cmd", nargs="?", choices=("pick", "run", "held-out"))
    ap.add_argument("args", nargs="*")
    ap.add_argument("--records", default=os.path.join(judge.STATE, "records"))
    ap.add_argument("--before")
    ap.add_argument("-n", type=int, default=10)
    ap.add_argument("--self-check", action="store_true")
    a = ap.parse_args()
    if a.self_check:
        self_check()
    elif a.cmd == "pick":
        if os.path.exists(HELD_OUT):
            sys.exit("%s exists: the set is frozen" % HELD_OUT)
        os.makedirs(os.path.dirname(HELD_OUT), exist_ok=True)
        json.dump(pick(a.records, a.n), open(HELD_OUT, "w"), indent=1)
        print(open(HELD_OUT).read())
    elif a.cmd == "held-out":
        sys.exit(0 if (a.args[0], int(a.args[1])) in held_out() else 1)
    elif a.cmd == "run" and a.before:
        with tempfile.TemporaryDirectory() as out:
            b = score(a.before, a.records, os.path.join(out, "b.json"))
            t, ok = table(b, score(None, a.records, os.path.join(out, "a.json")))
        print(t)
        sys.exit(0 if ok else 1)
    else:
        ap.print_help()
