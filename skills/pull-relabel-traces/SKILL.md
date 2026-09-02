---
name: pull-relabel-traces
description: Refresh the PRE-3202 relabel decision-agent offline eval — pull staging traces from GCP Cloud Logging, rebuild the local HTML trace viewer, and report the trace count, outcomeStatus breakdown and trace-failure count. Use when the user says "pull relabel traces", "/pull-relabel-traces", "refresh the relabel trace viewer", "get the latest relabel decision agent traces".
---

# Pull relabel decision-agent traces

> **Review-by: 2026-10-22 (8-week TTL).** This skill exists only to support the PRE-3202 offline eval on top of the staging-only relabel-decision-agent trace logging in PR #11355. If that trace logging has been removed or the eval work is done by this date, delete this skill directory (`rm -rf ~/.claude/skills/pull-relabel-traces/`).
>
> Enforcement: cloud routine `trig_017tak9eRbp1aL2Q8nJ56QhF` ("PRE-3202 relabel-trace skill TTL — review or delete") fires once at 2026-10-22T08:07Z and asks for this check. If you extend the TTL, schedule a new one — the routine is one-shot.

## What to run

Working directory:
`/Users/joey/FyxerGh/fyxer-web-app-trees/fyxer-web-app-docs-private/agentic-labelling-architecture/`

```bash
cd /Users/joey/FyxerGh/fyxer-web-app-trees/fyxer-web-app-docs-private/agentic-labelling-architecture/
FRESHNESS=7d ./pull-relabel-traces.sh
```

`FRESHNESS` accepts any `gcloud --freshness` value (`13h`, `7d`, ...). Default is `13h`; pass whatever window the user asks for, else `7d`.

The script pulls both log streams, rebuilds `relabel-trace-viewer.html` in place, and opens it. All logic lives in `pull-relabel-traces.sh` and `build-viewer.py` — read them, don't reimplement them.

If the permission-mode classifier blocks running the `.sh` directly, read it and run its four commands inline instead (gcloud read traces → gcloud read failures → `python3 build-viewer.py` → `open`).

Auth: `gcloud logging read` uses the local **user** credential, not ADC. On "Reauthentication required", run `gcloud auth login` (not `gcloud auth application-default login`).

## Always open the viewer at the end

Whichever path you took (script, or the four commands run manually), finish by opening the rebuilt viewer in the browser:

```bash
open /Users/joey/FyxerGh/fyxer-web-app-trees/fyxer-web-app-docs-private/agentic-labelling-architecture/relabel-trace-viewer.html
```

The script already does this as its last line, so don't run it twice when the script succeeded. Only run it yourself if you took the manual fallback, or if the script's own `open` call failed/was skipped.

## What to report back

After it runs, summarise from `relabel-traces-all.json` and `relabel-trace-failures.json`:

```bash
jq 'length' relabel-traces-all.json
jq -r 'group_by(.outcomeStatus)[] | "\(.[0].outcomeStatus // "null"): \(length)"' relabel-traces-all.json
jq -r '[.[] | select(.priorLogicalLabel != .finalLogicalLabel)] | length' relabel-traces-all.json
jq -r 'min_by(.timestamp).timestamp, max_by(.timestamp).timestamp' relabel-traces-all.json
jq 'length' relabel-trace-failures.json
```

Report: trace count, actual time span covered, outcomeStatus breakdown, how many actually changed label, and the `relabel_decision_trace_failed` count (should be 0 — a non-zero count means the trace's own logging is erroring, which is different from `outcomeStatus=failed`).

## Gotchas

- The trace query is capped at `--limit=500`. If the count comes back at exactly 500 the window is truncated — say so, and raise the limit in the script rather than reporting 500 as the real number.
- Traces are staging-only by design (never prod — deliberate PII exception, see the header comment in `functions/src/features/labels/logic/relabelDecisionAgent/logRelabelDecisionTrace.ts`). Everything the script writes contains real staging email bodies: keep it local, never publish or upload it.
- Logging only started when PR #11355 hit staging (~2026-08-25), so a window wider than that returns nothing extra.
