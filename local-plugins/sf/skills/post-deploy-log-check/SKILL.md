---
name: post-deploy-log-check
description: Catch prod and staging errors that a merged PR caused, from gcloud logs, using queries written down before the merge. Two steps. "write" (before merge) lists the PR's new or changed backend entry points and the exact gcloud queries that would show them failing. "run" (after the PR reaches staging, then again after it reaches prod) runs only those queries for the first hour after the deploy and reports what is new. Use from sf:orchestrate and start-feature when a large feature PR is about to merge or has merged, or when Joey says "check the logs for this PR", "post-deploy check", "did my change break anything in prod".
---

# Post-deploy log check

Sentry is off in web-app (#15795), so nothing alerts on a new error that a PR brings in. On 12 Nov `onRadarItemWrittenForWriteRules` (#17236) threw about 600 errors an hour for a day before anyone looked. This check closes that gap. It is read-only.

The work is split so the check itself is cheap. The PR's author, who knows the code, writes the queries before the merge. After the deploy, the check only runs them.

## write: before the merge

Run this once the PR is green, before Joey merges it. Write `<state dir>/logchecks/<ticket>.md` in a build room, or `.scratch/<slug>/logchecks/<pr>.md` outside one, and paste the same block into the PR body under `## Post-deploy checks`.

1. List what the PR deploys and could fail at run time, from `git diff origin/staging...HEAD`:
   - every Cloud Function export it adds or changes in any `services/*/src/index.ts` (its Cloud Run service name is the export lowercased);
   - every new or changed log `code` it emits at warn or error level;
   - every scheduler, task queue or trigger it adds.
2. For each one, write one gcloud query that would show it failing. Use the repo's investigator pattern:

   ```bash
   gcloud logging read '<filter>' --project=<project> --freshness=2h --limit=500 \
     --impersonate-service-account=fyxer-investigator@<project>.iam.gserviceaccount.com \
     --format='value(timestamp,severity,jsonPayload.code,jsonPayload.message)'
   ```

   Filters:
   - a function: `resource.labels.service_name="<export lowercased>" severity>=WARNING`;
   - a code: `jsonPayload.code="<code>"`;
   - a function's success line, to prove it ran: `resource.labels.service_name="<name>" jsonPayload.finished=true`.

   Projects: staging `fyxer-ai-staging`, prod `fxyer-ai`. INFO is dropped from `_Default` in prod, so check prod for WARNING and above; info events with an `analytics.` code live in the `analytics-events` bucket.
3. Next to each query, write what a healthy result looks like: "0 ERROR lines" or "at least one finished:true line within the hour". Name the pre-existing baseline when the function already existed: run the same query over the hour before the merge and note its count.

Keep it to the PR's own surface. A query for code the PR didn't touch is noise.

## Ask Joey

After a large feature PR merges, ask Joey whether to run the check: through `room ask` in a build room (header `Log check`, options "Check staging now" and "Skip"), else with `AskUserQuestion`. When the release carrying it reaches prod, ask again for prod (options "Check prod now" and "Skip"). Small PRs (no new function, trigger or error code) need no ask.

## run: after the deploy

1. Confirm the PR's code is live: staging deploys from `staging` after merge, and prod ships from a `release/<version>` branch, so check the deploy workflow run (`gh run list --workflow <deploy workflow> --branch <branch>`) has finished after the merge commit.
2. Wait until about 45 minutes after the deploy finished. Then run each query from the logchecks file against that environment, over the window since the deploy.
3. Compare each result with its healthy line and baseline. Report in one short table: query, count, verdict (ok, new errors, never ran). For any failure, quote one log line's code and message (no PII) and name the PR.
4. In a build room, log `room log --type note --note "log check <env> <ticket>: <ok | n new error groups>"`, and raise a failure to Joey as a `room ask` card with a fix or revert as options. Never revert or push anything yourself.

If impersonation is denied, name the command Joey must run (`gcloud auth login`) and stop.
