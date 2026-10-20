---
name: drafts-experiment-eval-sheet
description: Sample served reply drafts from each variant of a drafts experiment (for example Luna vs the fine-tune), with the email thread each was drafted from, and put them in a Google Sheet via the gws CLI so a person can read them side by side or feed an eval. By default only users who have NOT opted out of model training; pass include-all-users to override. Parameters: experiment key, sample size per variant, include-all-users. Use when Joey says "pull examples from the experiment", "sample drafts per variant", "reply drafts eval sample", "sheet of Luna vs control drafts", or "/drafts-experiment-eval-sheet".
---

# Drafts experiment eval sheet

Builds a CSV of real served drafts per experiment variant, then uploads it to Google Sheets with `gws`. Data comes from prod BigQuery only; nothing goes to a model provider. The sheet holds real customer email, so it stays private to Joey and inside Fyxer.

## Parameters

Ask for or infer these. Only the first two have no default.

| Parameter | Default | Meaning |
|---|---|---|
| `experiment` | none | Key in `experiment_variates`, for example `draft-gpt-6-luna-rhigh`. Draft experiments live in code (`domains/drafts/src/flows/drafts/prompts/DraftExperimentAssigner.ts`), not GrowthBook. |
| `since` | none | UTC start of the experiment, for example `2026-10-06 09:40:00`. Find it in the release or the Slack thread. |
| `n` (sample size per variant) | 25 | Drafts per variant. |
| `include-all-users` | off | OFF: exclude every user with any membership where `is_model_training_allowed = FALSE`. ON: include them. Turn it on only when Joey explicitly says to include all users in the experiment. |
| `until` | now | UTC end, exclusive. |
| `per-user-cap` | 2 | Most drafts taken from one user, so heavy users do not dominate. |
| `prior` | 7 | Previous emails shown per thread (newest first). |
| `label` | variant value | `variant=Label` names, for example `control=Fine-tune` `test=Luna`. |

## The opt-out rule

The model-training choice is the membership field `isModelTrainingAllowed` (BigQuery `prod_dbt_intermediate.int_firestore__membership.is_model_training_allowed`). The choice belongs to the person, so one membership set to `FALSE` excludes the user, and deleted memberships count (`optOutEveryMembershipOfModelTraining` sets them all). A missing or `TRUE` value means allowed. Organisation policy `managedSettings.modelTraining` is stamped onto each membership, so the membership field is the single source. Report how many users were excluded.

## Run

Needs `bq` and `gcloud` logins and a working `gws` login. If `bq` fails on auth, stop and tell Joey to run `gcloud auth login` and `gcloud auth application-default login`. Work in a git-ignored folder, for example `.scratch/<slug>/eval-sheet/`.

```bash
cd <repo root> && python3 ~/.claude/skills/drafts-experiment-eval-sheet/fetch_eval_sheet.py \
  --experiment draft-gpt-6-luna-rhigh --since '2026-10-06 09:40:00' --n 25 \
  --label control=Fine-tune --label test=Luna \
  --out-dir .scratch/<slug>/eval-sheet \
  --name "Luna vs fine-tune drafts: 25 per variant"
```

Add `--include-opted-out` only when Joey said to include all users. Add `--no-upload` to stop at the CSV.

What the script does:

1. Gets each user's variant from `int_posthog__send_email_in_thread` (sends carry `experiment_variates`). Users with two variants are dropped.
2. Gets the opted-out user ids and excludes them unless told not to.
3. Pulls served drafts that have a user-sent version from `fxyer-ai.analyticslink._AllLogs` (europe-west1): milestone `CREATED_DRAFT_IN_INBOX_METADATA` joined to flow `LOG_METADATA_OF_SENT_DRAFT` on `systemCreatedDraftId`. It skips drafts that used meeting summaries or the first-interaction flag. The model is `metadata.modelUsedName`.
4. Samples `n` drafts per variant, at most `per-user-cap` per user, random users, fixed seed. A variant keeps fallbacks (for example Luna users who got the fine-tune) because that is how users were assigned.
5. Reads the thread from the logged prompt, because the dbt tables hold no email bodies. The prompt's `<thread>` holds `<message from to cc bcc sent-at>` with `<email-body>` and `<forwarded>`; `<current-email>` is the email being replied to.
6. Writes the CSV and uploads it: `gws drive files create` with `mimeType application/vnd.google-apps.spreadsheet` and `--upload`, then a `sheets spreadsheets batchUpdate` to freeze the header and two columns, wrap text and widen columns.

Sheet columns: variant, model, edit distance vs sent, DRAFT (served), SENT by user, EMAIL REPLIED TO, then PREVIOUS EMAIL 1 to N (newest first). Each email cell reads `from / to / cc / bcc / sent-at`, a blank line, the body, a blank line, then `forwarded_content:`. Cells are capped at 45,000 characters (Sheets allows 50,000).

## gws gotchas

- `gws auth status` can list Drive and Sheets scopes while every call returns 403 "insufficient authentication scopes". A stale `~/.config/gws/token_cache.json` is the cause. After a fresh `gws auth login`, run `rm ~/.config/gws/token_cache.json`, then retry. Ask Joey to run these, since they touch his auth files.
- The CSV has multi-line quoted cells; the Drive upload conversion handles them.
- Joey's older helper functions (`driveUploadFile`, `sheetsUpdateValues`) are in `dataScience-copy-do-not-change/utils/gwsCli.ts` in his iCloud Downloads, if a different call shape is needed.

## After the run

Tell Joey the sheet link, rows per variant, eligible users per variant and the number of opted-out users excluded. Remind him to delete the CSV in the work folder and the sheet when finished, and not to share it outside Fyxer.

Optional extension, not part of this skill's run: an LLM judge over the same rows (intent, tone, natural, factual). Customer text goes only to a provider under the prod RO key; read the `provider-keys` skill first.

## Checked on

Built from the Luna vs fine-tune drafts experiment (6 to 12 Oct 2026). The experiment key, `since` and arm names change per experiment; check the assigner file for the live keys.
