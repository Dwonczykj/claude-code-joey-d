---
name: csv-to-gdrive-sheet
description: Upload a local CSV to the user's Google Drive and convert it to a Google Sheet using the gws CLI. Use when the user asks to upload a CSV to Drive, convert a CSV to a Sheet on Drive, share a CSV with a team via Drive/Sheets, or says "gws upload", "push this csv to my drive", "make this csv a google sheet".
user_invocable: true
---

# CSV → Google Drive Sheet (via gws CLI)

Two-step pattern. Direct upload-with-conversion (`--upload <csv>` + `mimeType: application/vnd.google-apps.spreadsheet` in one call) returns HTTP 400 — do NOT try to collapse the steps.

## Inputs to confirm before running

- **Absolute path** to the CSV (no relative paths).
- **Sheet title** the team will see in Drive. Default: the CSV filename without `.csv`.
- **Destination folder** (optional). If the user names a folder, resolve its `fileId` first with `gws drive files list --params '{"q":"name = '\''<folder>'\'' and mimeType = '\''application/vnd.google-apps.folder'\''","supportsAllDrives":true}'` and add `"parents":["<folderId>"]` to the metadata of BOTH steps. Otherwise both files land in My Drive root.
- **Keep the raw CSV?** Default: keep both (some teams want the CSV for diffing). If user wants only the Sheet, delete the intermediate CSV at the end with `gws drive files delete`.

## Step 1 — upload the CSV

```bash
gws drive files create \
  --json '{"name":"<title>.csv"}' \
  --upload <absolute-path-to-csv> \
  --params '{"supportsAllDrives":true}'
```

Returns JSON with the uploaded file's `id`. Capture it — Step 2 needs it.

## Step 2 — copy with conversion to Google Sheet

```bash
gws drive files copy \
  --params '{"fileId":"<id-from-step-1>","supportsAllDrives":true}' \
  --json '{"name":"<title>","mimeType":"application/vnd.google-apps.spreadsheet"}'
```

Returns JSON with the Sheet's `id`. The shareable URL is `https://docs.google.com/spreadsheets/d/<sheet-id>`.

## Output to the user

Always surface both URLs in the reply (unless the user explicitly asked Sheet-only):

- Sheet: `https://docs.google.com/spreadsheets/d/<sheet-id>`
- CSV: `https://drive.google.com/file/d/<csv-id>`

## Gotchas

- The `gws` binary lives at `/Users/joey/.nvm/versions/node/v22.17.0/bin/gws` — already on PATH, but if a shell can't find it, use the absolute path.
- `supportsAllDrives: true` matters even for My Drive uploads — without it shared-drive folders silently won't resolve as parents.
- The file name in Step 1 should end in `.csv`; the Sheet name in Step 2 should NOT.
- Don't bother trying `application/vnd.google-apps.spreadsheet` in Step 1's metadata with `--upload` — it 400s. The copy-and-convert path is the supported route.
- If the CSV is large (>5MB), Step 1 still works (gws does a multipart upload), but Step 2's conversion can take a few seconds — the API returns immediately with the new ID.
