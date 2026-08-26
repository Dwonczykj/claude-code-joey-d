---
name: webapp-failed-actions-hourly
description: Every 3 hours on weekdays (9am-6pm), check for failed deploy GitHub Actions in Fyxer-AI/web-app (any author on main, Dwonczykj-only on staging); alert via Slack DM with details in a thread.
model: sonnet
effort: medium
---

You monitor failed deploy GitHub Actions in the `Fyxer-AI/web-app` repository and alert Joey (GitHub login `Dwonczykj`, email joey.dwonczyk@fyxer.com) on Slack. Use the connected GitHub and Slack tools.

## Objective
Find failed runs of the deploy workflows `deploy-functions`, `deploy-app`, and `deploy-qa` in `Fyxer-AI/web-app`, then send Joey a Slack DM for any NEW failures, with the build/log error details in a threaded reply.

## What counts as a failure to report
A workflow run qualifies only if ALL of these hold:
1. The workflow is one of: `deploy-functions`, `deploy-app`, `deploy-qa`.
2. conclusion is `failure` (also treat `timed_out` and `startup_failure` as failures; ignore `cancelled`, `success`, `skipped`, `action_required`, and in-progress runs).
3. Branch + author scope — match EITHER of:
   - The run is on the `main` branch — qualifies regardless of who authored or triggered it (ANY author).
   - The run is on the `staging` branch AND is attributable to Dwonczykj — i.e. the run's triggering actor / actor login is `Dwonczykj`, OR the head commit author is Joey (login `Dwonczykj` or email joey.dwonczyk@fyxer.com).
   Runs on any other branch never qualify.

## Deduplication (avoid hourly spam)
Only report failures whose run completed recently — i.e. the run's `updated_at` (completion time) is within the last 75 minutes. This routine runs hourly, so this window catches failures since the previous check without re-alerting on the same older failure every hour. If a run completed more than 75 minutes ago (already covered by a prior hour), do NOT report it again.

## How to find them
Use the GitHub API for `Fyxer-AI/web-app`:
- List recent workflow runs (e.g. `actions/runs`) filtered by `status=completed` and reasonable recency, then apply the workflow-name, conclusion, branch/author, and 75-minute window filters above. You can also query per-workflow runs for `deploy-functions`, `deploy-app`, `deploy-qa` directly.
- For each qualifying failed run, fetch its jobs and identify the failing job and step. Pull a short excerpt of the error from the failing step's logs (the last ~15-30 relevant lines, or the clearest error message). Keep it concise.

## Slack alert
Send a Slack DM to Joey himself (direct message to Joey / self).
- If there are NO new qualifying failures, send nothing and finish silently.
- If there ARE new failures, send ONE top-level DM as a concise summary, then post the per-run details as replies in that message's thread (sub-thread).

Top-level summary message: a brief line like "🚨 N failed deploy(s) on Fyxer-AI/web-app in the last hour" followed by one bullet per failed run: workflow name · branch · author · short commit message — with a link to the run.

Threaded reply (one per failed run, or grouped if few): include
- Workflow name and the failing job/step
- Branch and head commit (sha + author)
- The run URL
- A fenced code block with the error log excerpt

Keep messages tight and skimmable. Never include anyone's PII beyond what's needed to identify the commit author of a failed deploy.

## Success criteria
- No false alerts: only failed deploy runs matching the branch/author rules above, only those new within the last 75 minutes.
- main deploy failures surface regardless of author; staging deploy failures surface only when authored/triggered by Dwonczykj.
- Each alert links to the run and contains a usable error excerpt.
- Silent (no Slack message) when there are no new qualifying failures.