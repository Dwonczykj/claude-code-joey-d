#!/usr/bin/env python3
"""LLM judge for sf sessions: verbosity of the PR body, redundant tests in the PR's test hunks.

    python3 judge_sessions.py sheet  [--records DIR] [--state DIR] [-n 20]   # writes <state>/labels/sheet.md
    python3 judge_sessions.py judge  [--records DIR] [--state DIR]          # judges the sheet's PRs -> labels/judge.jsonl
    python3 judge_sessions.py agree  [--state DIR]                          # Joey's labels vs judge -> labels/agreement.md
    python3 judge_sessions.py --self-check

Reads extractor records only (extract_sessions.py). The unit judged is one PR: a session's score is the mean
of its PRs, but the labelled sample takes one-PR sessions only, so it leans to smaller sessions. Rubrics and the pinned model live in ../evals/judge/graders/*.md (claude plugin eval grader
format). They are frozen: change one only by re-running `agree` against Joey's labels and re-freezing by hand,
never through the doctor or the replay gate.

`judge` runs each call through headless Claude Code (`claude -p`, no tools, no settings, no MCP) on the
grader's pinned model; Joey chose this route for R7. The CLI has no temperature flag, so reruns can differ a little.
Labels and judge outputs stay in the state dir, never in git.
"""
import argparse
import glob
import hashlib
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
GRADERS = os.path.join(HERE, "..", "evals", "judge", "graders")
STATE = os.path.expanduser("~/FyxerGh/build-room/sf-outer-loop")
ANCHORS = (0.0, 0.25, 0.5, 0.75, 1.0)
METRICS = ("verbosity", "redundant_tests")
TEST_RE = re.compile(r"(^|/)(test_[^/]*|[^/]*[._-](test|spec)\.\w+)$|__tests__/|(^|/)tests?/")
CAP = 8000  # chars of test hunks shown to Joey and the judge alike


def grader(metric):
    path = os.path.join(GRADERS, metric.replace("_", "-") + ".md")
    text = open(path, encoding="utf-8").read()
    head, body = text.split("---\n", 2)[1:]
    meta = dict(l.split(": ", 1) for l in head.strip().splitlines())
    return {"model": meta["model"], "rubric": body.strip(),
            "sha": hashlib.sha256(text.encode()).hexdigest()[:12]}


def test_hunks(diff):
    blocks = re.split(r"(?m)^(?=diff --git )", diff or "")
    out = "".join(b for b in blocks if b.startswith("diff --git") and TEST_RE.search(b.split("\n", 1)[0]))
    return out[:CAP] + ("\n[... cut at %d chars]" % CAP if len(out) > CAP else "")


def parse_score(s):
    """'0.75' / 0.75 / 'na' -> float or None; anything else raises."""
    s = str(s).strip().lower()
    if s in ("na", "n/a"):
        return None
    v = float(s)
    if v not in ANCHORS:
        raise ValueError("not an anchor: %r" % s)
    return v


def candidates(records):
    """One-PR sessions whose PR fetched cleanly and is under the extractor's diff cap."""
    out, seen = [], set()
    for f in sorted(glob.glob(os.path.join(records, "*.json"))):
        r = json.load(open(f))
        if len(r["prs"]) != 1:
            continue
        p = r["prs"][0]
        key = (p["repo"], p["number"])
        if p.get("error") or not p.get("diff") or len(p["diff"]) >= 200_000 or key in seen:
            continue
        seen.add(key)
        out.append({"session_id": r["session_id"], "repo": p["repo"], "number": p["number"],
                    "url": "https://github.com/%s/pull/%d" % key, "body": p["body"] or "", "tests": test_hunks(p["diff"])})
    return out


def pick(cands, n):
    """Evenly spaced over test-hunk size, so the sample runs from no tests to many."""
    cands = sorted(cands, key=lambda c: (len(c["tests"]), c["session_id"]))
    if len(cands) <= n:
        return cands
    return [cands[round(i * (len(cands) - 1) / (n - 1))] for i in range(n)]


FENCE = "~~~~~~"


def write_sheet(items, path):
    lines = ["# Judge labelling sheet", "",
             "Score each PR on both rubrics (local-plugins/sf/evals/judge/graders/): one of 0, 0.25, 0.5, 0.75, 1;",
             "redundant_tests may be `na` when no tests were added. Higher is better. Fill the two lines under each PR.", ""]
    for i, c in enumerate(items, 1):
        lines += ["## %d. %s" % (i, c["url"]), "session: `%s`" % c["session_id"], "",
                  "verbosity: ", "redundant_tests: ", "", "### PR body", FENCE, c["body"].replace(FENCE, "~~~ ~~~"), FENCE, "",
                  "### Test hunks", FENCE + "diff", c["tests"].replace(FENCE, "~~~ ~~~") or "(no test files in the diff)", FENCE, ""]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w", encoding="utf-8").write("\n".join(lines))


def read_sheet(path):
    """-> {url: {"session_id", "verbosity"?, "redundant_tests"?}} for every PR on the sheet; skips fenced text."""
    labels, url, fenced = {}, None, False
    for line in open(path, encoding="utf-8"):
        line = line.rstrip("\n")
        if line.startswith(FENCE):
            fenced = not fenced
            continue
        if fenced:
            continue
        m = re.match(r"## \d+\. (\S+)", line)
        if m:
            url = m.group(1)
            labels[url] = {}
            continue
        m = re.match(r"session: `(\S+)`", line)
        if m and url:
            labels[url]["session_id"] = m.group(1)
        m = re.match(r"(verbosity|redundant_tests):\s*(\S+)", line)
        if m and url:
            labels[url][m.group(1)] = parse_score(m.group(2))
    return labels


def filled(labels):
    return {u: l for u, l in labels.items() if all(k in l for k in METRICS)}


def ask(g, text):
    p = subprocess.run(["claude", "-p", "--model", g["model"], "--system-prompt", g["rubric"], "--tools", "",
                        "--setting-sources", "", "--strict-mcp-config", "--no-session-persistence"],
                       input=text, capture_output=True, text=True, timeout=300)
    if p.returncode:
        raise OSError("claude -p exit %d: %s" % (p.returncode, (p.stderr or p.stdout).strip()[:200]))
    return parse_reply(p.stdout)


def parse_reply(text):
    """The rubric asks for one JSON line; tolerate prose around it."""
    ans = json.loads(text[text.index("{"):text.rindex("}") + 1])
    return parse_score(ans["score"]), ans.get("why", "")


def judge(records, state):
    sheet = os.path.join(state, "labels", "sheet.md")
    if not os.path.exists(sheet):
        sys.exit("no %s: run `sheet` first" % sheet)
    on_sheet = read_sheet(sheet)
    items = [c for c in candidates(records) if c["url"] in on_sheet]
    gs = {m: grader(m) for m in METRICS}
    path = os.path.join(state, "labels", "judge.jsonl")
    done = set(latest_rows(path, gs))
    with open(path, "a", encoding="utf-8") as f:
        for c in items:
            if c["url"] in done:
                continue
            row = {"session_id": c["session_id"], "url": c["url"]}
            try:
                for m, text in (("verbosity", c["body"] or "(empty PR body)"),
                                ("redundant_tests", c["tests"] or "(no test files in the diff)")):
                    row[m], row[m + "_why"] = ask(gs[m], text)
                    row[m + "_rubric"] = gs[m]["sha"]
            except (OSError, ValueError, KeyError, IndexError) as e:  # one bad PR must not stop the run; rerun retries it
                print(c["url"], "failed:", e, file=sys.stderr)
                continue
            row["model"] = gs["verbosity"]["model"]
            f.write(json.dumps(row) + "\n")
            print(row["url"], row["verbosity"], row["redundant_tests"])


def latest_rows(path, gs):
    """Last judge row per PR made with the current (frozen) rubrics; rows from older rubrics are ignored."""
    rows = {}
    if os.path.exists(path):
        for line in open(path, encoding="utf-8"):
            row = json.loads(line)
            if all(row.get(m + "_rubric") == gs[m]["sha"] for m in METRICS):
                rows[row["url"]] = row
    return rows


def agreement(pairs):
    """pairs: [(joey, judge)] with None for na. -> (n, mean abs error, share within 0.25, na mismatches)."""
    both = [(a, b) for a, b in pairs if a is not None and b is not None]
    errs = [abs(a - b) for a, b in both]
    na_miss = sum((a is None) != (b is None) for a, b in pairs)
    if not errs:
        return 0, None, None, na_miss
    return len(errs), sum(errs) / len(errs), sum(e <= 0.25 for e in errs) / len(errs), na_miss


def agree(state):
    labels = filled(read_sheet(os.path.join(state, "labels", "sheet.md")))
    latest = latest_rows(os.path.join(state, "labels", "judge.jsonl"), {m: grader(m) for m in METRICS})
    rows = [(labels[u], latest[u]) for u in labels if u in latest]
    out = ["# Judge agreement with Joey's labels", "",
           "%d PRs labelled and judged. Model %s via claude -p." % (len(rows), rows[0][1]["model"] if rows else "-"), "",
           "| rubric | rubric sha | n | mean abs error | within 0.25 | na mismatches |", "|---|---|---|---|---|---|"]
    for m in METRICS:
        n, mae, w, na = agreement([(l[m], j[m]) for l, j in rows])
        sha = rows[0][1][m + "_rubric"] if rows else "-"
        out.append("| %s | %s | %d | %s | %s | %d |" % (m, sha, n, "-" if mae is None else "%.3f" % mae,
                                                     "-" if w is None else "%.0f%%" % (100 * w), na))
    out += ["", "| PR | Joey v | judge v | Joey t | judge t | judge why (tests) |", "|---|---|---|---|---|---|"]
    for l, j in rows:
        out.append("| %s | %s | %s | %s | %s | %s |" % (j["url"], l["verbosity"], j["verbosity"], l["redundant_tests"],
                                                      j["redundant_tests"], j["redundant_tests_why"].replace("|", "/")))
    path = os.path.join(state, "labels", "agreement.md")
    open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")
    print("\n".join(out[:8]))


def self_check():
    import tempfile
    assert parse_score("0.75") == 0.75 and parse_score(1) == 1.0 and parse_score("NA") is None
    for bad in ("0.3", "2", "", "good"):
        try:
            parse_score(bad)
            raise AssertionError("accepted %r" % bad)
        except ValueError:
            pass
    n, mae, w, na = agreement([(1.0, 0.75), (0.5, 0.0), (None, None), (None, 0.5), (0.25, 0.25)])
    assert (n, na) == (3, 1) and abs(mae - 0.25) < 1e-9 and abs(w - 2 / 3) < 1e-9, (n, mae, w, na)
    diff = "diff --git a/src/x.ts b/src/x.ts\n+a\ndiff --git a/src/x.test.ts b/src/x.test.ts\n+it()\n"
    assert not any(TEST_RE.search(f) for f in ("src/latest.ts", "lib/inspect.py", "src/respect.ts"))
    assert all(TEST_RE.search(f) for f in ("a/x.test.ts", "test_x.py", "a/__tests__/y.ts", "tests/z.py"))
    assert parse_reply('Sure: {"score": "0.5", "why": "x"} done') == (0.5, "x")
    assert test_hunks(diff) == "diff --git a/src/x.test.ts b/src/x.test.ts\n+it()\n"
    items = [{"session_id": "s1", "url": "https://github.com/o/r/pull/1", "body": "## Summary\n" + FENCE + "\nverbosity: 0\n" + FENCE, "tests": FENCE + "\nredundant_tests: 0\n" + FENCE}]
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, "labels", "sheet.md")
        write_sheet(items, p)
        assert filled(read_sheet(p)) == {} and list(read_sheet(p)) == ["https://github.com/o/r/pull/1"]  # unfilled; a fence and score line inside the body stay text
        s = open(p).read().replace("verbosity: \n", "verbosity: 0.5\n", 1).replace("redundant_tests: \n", "redundant_tests: na\n", 1)
        open(p, "w").write(s)
        assert read_sheet(p) == {"https://github.com/o/r/pull/1": {"session_id": "s1", "verbosity": 0.5, "redundant_tests": None}}
    for m in METRICS:
        g = grader(m)
        assert g["model"] == "claude-sonnet-5-5" and "0.25:" in g["rubric"]
    assert pick([{"session_id": str(i), "tests": "x" * i} for i in range(10)], 3)[1]["session_id"] == "4"
    print("self-check ok")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("cmd", nargs="?", choices=("sheet", "judge", "agree"))
    ap.add_argument("--records", default=os.path.join(STATE, "records"))
    ap.add_argument("--state", default=STATE)
    ap.add_argument("-n", type=int, default=20)
    ap.add_argument("--force", action="store_true", help="overwrite an existing sheet.md")
    ap.add_argument("--self-check", action="store_true")
    a = ap.parse_args()
    if a.self_check:
        self_check()
    elif a.cmd == "sheet":
        if os.path.exists(os.path.join(a.state, "labels", "sheet.md")) and not a.force:
            sys.exit("sheet.md exists and may hold Joey's labels; pass --force to overwrite")
        items = pick(candidates(a.records), a.n)
        write_sheet(items, os.path.join(a.state, "labels", "sheet.md"))
        print("%d PRs -> %s" % (len(items), os.path.join(a.state, "labels", "sheet.md")))
    elif a.cmd == "judge":
        judge(a.records, a.state)
    elif a.cmd == "agree":
        agree(a.state)
    else:
        ap.print_help()
