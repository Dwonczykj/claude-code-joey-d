---
name: turn-off-labels-qa-digest-reminder
description: Monday reminder to turn off the still-live labels-qa relabel digest (unmerged PR #11071)
---

Remind Joey: it's time to turn off the internal "Labelling QA" digest email.

Context: it's a Cloud Scheduler-triggered Firebase function `sendLabelQaDigest` (functions-labels-qa codebase, project fxyer-ai, region europe-west1) that fires every day at 16:00 Europe/London and emails an allowlist of ~36 @fyxer.com staff a summary of that day's label/relabel events. It lives on branch joeydwonczyk/feat-labels-qa-digest / PR #11071 (https://github.com/Fyxer-AI/web-app/pull/11071), which was never merged to staging — it was deployed straight to prod from the branch, bypassing the dedicated (and never-actually-run) functions-labels-qa.yml dispatch workflow.

To turn it off, whoever has GCP IAM access to fxyer-ai Cloud Functions/Scheduler needs to run:
  firebase functions:delete sendLabelQaDigest --project fxyer-ai --region europe-west1
(or just disable the underlying Cloud Scheduler job if Joey wants to keep the option to re-enable it later, rather than deleting outright).

Note: last time this was checked (2026-08-21), Claude's own gcloud/firebase access to fxyer-ai didn't extend to Cloud Functions/Scheduler (BigQuery access doesn't carry the same IAM), so this may need to be done by hand or by someone with broader infra access — don't assume it can be automated away.

Just deliver this as a plain reminder message — don't take any action on GCP or the PR without Joey explicitly asking in that moment.