---
name: gcp-prod-impersonate
description: Investigate prod GCP and Firestore data by impersonating the read-only fyxer-investigator service account. Use whenever you need to read prod logs, monitor Cloud Functions, check for errors after a change, or inspect Firestore data in prod — especially when your own account lacks access or has too much. Trigger on "impersonate the investigator", "check prod logs", "what errors are the X functions throwing", "how are my changes doing in prod", or any read-only prod investigation.
---

# GCP Prod Impersonation

`fyxer-investigator@fxyer-ai.iam.gserviceaccount.com` is a service account with read-only prod permissions. Impersonate it for prod investigation so you use exactly the right access — not your own account, which may lack access or have too much.

Project is `fxyer-ai` (note the spelling: `fxyer`, not `fyxer`).

## How it works

Append this flag to any `gcloud` command:

```
--impersonate-service-account=fyxer-investigator@fxyer-ai.iam.gserviceaccount.com
```

Prerequisite: the human must be authenticated (`gcloud auth login`). If a command fails with an auth or `IAM_PERMISSION_DENIED` / `unable to impersonate` error, tell the user to run `gcloud auth login` and stop — you cannot run interactive auth yourself.

Read-only only. Never run a mutating command (create/update/delete/deploy/set) under this identity. It exists to observe prod, not change it.

## Examples

Last 10 distinct error messages from a feature's Cloud Functions (the canonical use case):

```bash
gcloud logging read 'resource.type="cloud_function" AND severity>=ERROR AND resource.labels.function_name:"spaces"' \
  --impersonate-service-account=fyxer-investigator@fxyer-ai.iam.gserviceaccount.com \
  --project=fxyer-ai --limit=100 --freshness=1d \
  --format='value(jsonPayload.message)' | sort -u | head -10
```

Errors from a single function since your deploy:

```bash
gcloud logging read 'resource.labels.function_name="onThreadCreated" AND severity>=ERROR' \
  --impersonate-service-account=fyxer-investigator@fxyer-ai.iam.gserviceaccount.com \
  --project=fxyer-ai --limit=50 --freshness=2h \
  --format='json(timestamp,severity,jsonPayload.message,jsonPayload.code)'
```

Mint a token for the Firestore REST API (to read prod documents):

```bash
TOKEN=$(gcloud auth print-access-token \
  --impersonate-service-account=fyxer-investigator@fxyer-ai.iam.gserviceaccount.com)
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://firestore.googleapis.com/v1/projects/fxyer-ai/databases/(default)/documents/<collection>/<docId>"
```

## Notes

- `resource.labels.function_name:"spaces"` uses `:` for substring match to catch every function whose name contains the feature. Use `=` for an exact function name.
- Prefer `--freshness=<Nd/Nh>` over open-ended reads so queries stay fast.
- The gcloud CLI's function-name index for logs is the fastest way to scope to a feature; if you don't know the function names for a feature, grep `functions/src/**` for the trigger export first (see `.claude/skills/investigate-notetaker/SKILL.md` for the deeper log-tracing patterns).
