---
name: eval-sheet-gws
description: Build a Google Sheet (via the gws CLI) of real meetings from before and after a speaker-naming change, with each speaker label's name, source, share of words and sample lines, plus blank review columns and a self-counting Tally tab, so a person can judge the names by eye and the verdicts can be read back as evidence. Staff room meetings, customer room meetings, and customer 1:1 calls that contain a "Speaker N". Parameters: before-start, deploy-day skip window, until, sample sizes per stratum, seed. Use when Joey says "sheet to review speakers before and after", "eyeball the speaker naming", "speaker naming eval sheet", or "/eval-sheet-gws".
---

# Eval sheet (gws): speaker naming

Reads prod BigQuery only, writes a CSV, uploads it to Google Sheets with `gws`. Nothing goes to a model provider, and you must not read row-level transcript text yourself (at most one staff row to check the layout). The sheet holds real transcripts, so it stays private to Joey and inside Fyxer.

Built for PR 14640 and 14647 (room system names flooding every voice; declined invitees marked), shipped in prod tag main-7.136.2 on 13 Oct 2026. The script is `build_review_sheet.py` beside this file.

## Limits to say out loud

- Before and after are different meetings. Stored transcripts keep the names from whichever code ran at the time, so this shows whether the pattern changed, not the same meeting named twice. A true like-for-like needs a replay of the old code, which calls a model on prod transcripts and needs the prod key (`provider-keys` skill); ask Joey first.
- Google calendar meetings only (bot to recording joins through `provider_event_id`).
- Per-segment speaker source and id are not in BigQuery. The sheet uses per-meeting turns by source from the naming log plus a derived "match to calendar" per label (invitee with response, room resource, looks like room name, Speaker N, not an invitee name). Exact name matches only.

## Parameters

| Flag | Default | Meaning |
|---|---|---|
| `--before-start` | 2026-10-05 | First BEFORE day. |
| `--skip-start`, `--skip-end` | 2026-10-13, 2026-10-14 | Deploy day to leave out. Change both per release. |
| `--until` | tomorrow | Exclusive end of AFTER, UTC date. |
| `--n-a`, `--n-b`, `--n-c` | 15, 10, 10 | Per period: A staff room meetings, B customer room meetings, C customer 1:1 with a "Speaker N". |
| `--per-user-cap` | 2 | Most meetings from one owner per stratum and period. |
| `--seed` | date | Fixed seed for the random sample. |
| `--name` | Oct 2026 title | Sheet title. |
| `--out-dir` | next to the script | Pass a gitignored folder, for example `.scratch/<slug>/review-sheet`. |
| `--no-upload` | off | Stop at the CSV. |
| `--upload-only` | off | Skip BigQuery, upload the existing `review_rows.csv`. |

The staff org id is a constant in the script (`STAFF_ORG`). The README tab text in the script names this change (PR numbers, tag); edit it for a new change.

## Run

Needs `bq` and `gcloud` logins and a working `gws` login. If `bq` fails on auth, tell Joey to run `gcloud auth login` and `gcloud auth application-default login`. If `gws` returns 403 insufficient scopes, tell Joey to run `gws auth login` then `rm ~/.config/gws/token_cache.json` (same gotcha as `drafts-experiment-eval-sheet`).

```bash
cd <repo root> && python3 ~/.claude/skills/eval-sheet-gws/build_review_sheet.py \
  --out-dir .scratch/<slug>/review-sheet
```

It creates a new sheet each run. A staff AFTER stratum is small right after a release; rerun later to pick up more.

## The sheet

- **Review**: one row per meeting. Stratum, period, date, bot and recording id, org kind (staff or customer, no customer org names), attendees with invite response, distinct speaker count, per label name, source, word share and 2 to 3 sample lines. Blank dropdown columns for Joey: room flood Y/N; names right (all / most / some / none / can't tell); wrong because (mention-vs-speaker / invitee who did not attend / device name / split one person in two / other); for 1:1s, is each Speaker N a real extra person; notes.
- **Tally**: COUNTIFS by stratum and period, % flood and % names all or most.
- **README**: purpose, limits, how to fill in, delete-when-done note.

Customer strata B and C exclude anyone with access to the recording who has any membership with `is_model_training_allowed = FALSE` (matched by email, since the recording mirror has no user_id). Staff are exempt. Report the count excluded.

## Read the verdicts back

After Joey fills it in, read the numbers and turn them into evidence (write them into the impact result or evidence-pull file, with the date window):

```bash
gws sheets spreadsheets values get --params '{"spreadsheetId":"<ID>","range":"Tally!A1:U7"}'
gws sheets spreadsheets values get --params '{"spreadsheetId":"<ID>","range":"Review!A1:U200"}'
```

Tally rows 2 to 7 are A, B, C by BEFORE and AFTER. Columns: meetings, reviewed, flood Y and N, names all/most/some/none/can't tell, the five wrong-because causes, the Speaker N answers, then % flood and % names all or most. Quote counts only; keep case detail out of Slack and PRs.

## After the run

Tell Joey the sheet link, rows per stratum and period, opted-out count, and any short stratum with the reason. Remind him to delete the CSV in the work folder and the sheet when finished, and not to share it outside Fyxer.

## Checked on

First run 16 Oct 2026: 59 rows (A 15 before and 4 after, B 10 and 10, C 10 and 10), 464 people excluded. The impact result is in `docs-private/hybrid-speaker-naming-room-fix-impact-result.md`.
