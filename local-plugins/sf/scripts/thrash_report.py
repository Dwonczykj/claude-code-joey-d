#!/usr/bin/env python3
"""Deterministic thrash metrics per sf session, from extractor records only (never the transcripts).

    python3 thrash_report.py [--records DIR] [--limit 50] [--top 10] [--out FILE]
    python3 thrash_report.py --self-check

Per session: failed tool calls, identical repeated calls (extra runs beyond the first), and tool
calls per slice (calls / sf skills run, min 1: the record has no finer slice marker).
Score = failed + repeats; worst sessions first. The report names real sessions: keep it out of git.
"""
import argparse
import glob
import json
import os

DEFAULT_RECORDS = os.path.expanduser("~/FyxerGh/build-room/sf-outer-loop/records")


def metrics(r):
    calls = r["tool_calls"]
    failed = sum(c["error"] for c in calls)
    repeats = sum(x["count"] - 1 for x in r["repeated"])
    skills = r["why_sf"]["skills"]
    return {"session": r["session_id"], "start": r["start"], "skills": skills, "calls": len(calls), "failed": failed,
            "repeats": repeats, "per_slice": round(len(calls) / max(len(skills), 1), 1), "score": failed + repeats,
            "top_repeat": r["repeated"][0] if r["repeated"] else None}


def load(records, limit):
    recs = [json.load(open(p)) for p in glob.glob(os.path.join(records, "*.json"))]
    recs.sort(key=lambda r: r["start"] or "", reverse=True)
    return [metrics(r) for r in recs[:limit]]


def report(ms, top):
    ms = sorted(ms, key=lambda m: m["score"], reverse=True)
    n = len(ms) or 1
    out = [f"# sf thrash baseline ({len(ms)} sessions)", "",
           f"Totals: {sum(m['calls'] for m in ms)} calls, {sum(m['failed'] for m in ms)} failed, "
           f"{sum(m['repeats'] for m in ms)} repeated. Mean score {sum(m['score'] for m in ms) / n:.1f}.", "",
           "Score = failed calls + repeated calls. Slice = one sf skill run (min 1 per session).", "",
           f"## Worst {top}", "", "| session | start | skills | calls | failed | repeats | calls/slice | most repeated |", "|---|---|---|---|---|---|---|---|"]
    for m in ms[:top]:
        t = m["top_repeat"]
        rep = f"{t['name']} x{t['count']}: {t['input'][:50]}".replace("|", "/") if t else ""
        out.append(f"| {m['session'][:8]} | {(m['start'] or '')[:10]} | {', '.join(m['skills']) or '-'} | {m['calls']} | "
                   f"{m['failed']} | {m['repeats']} | {m['per_slice']} | {rep} |")
    return "\n".join(out) + "\n"


def self_check():
    c = lambda e: {"name": "Bash", "input": "x", "error": e}
    r = lambda sid, calls, rep, skills: {"session_id": sid, "start": "2026-01-01", "tool_calls": calls, "repeated": rep,
                                         "why_sf": {"skills": skills}}
    a = metrics(r("a", [c(True), c(True), c(False), c(False)], [{"name": "Bash", "input": "x", "count": 3}], ["sf:plan", "sf:build"]))
    assert (a["failed"], a["repeats"], a["per_slice"], a["score"]) == (2, 2, 2.0, 4), a
    b = metrics(r("b", [c(False)], [], []))
    assert (b["score"], b["per_slice"]) == (0, 1.0), b
    text = report([b, a], 1)
    assert text.index("| a |") and "| b |" not in text and "sf:plan, sf:build" in text
    print("self-check ok")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--records", default=DEFAULT_RECORDS)
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument("--top", type=int, default=10)
    ap.add_argument("--out")
    ap.add_argument("--self-check", action="store_true")
    a = ap.parse_args()
    if a.self_check:
        self_check()
    else:
        text = report(load(a.records, a.limit), a.top)
        if a.out:
            open(a.out, "w").write(text)
        else:
            print(text)
