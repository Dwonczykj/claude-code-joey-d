---
name: firestore-collection-to-dbt
description: End-to-end recipe for making a new Fyxer Firestore collection queryable in BigQuery/dbt — register the sync in web-app sync-functions, create the raw changelog landing table, then add the dbt source, staging and intermediate models with schema docs. Use when asked to "add <Collection> to data-platform", "make <Collection> queryable", "add an intermediate table for <Collection> docs", "create the raw changelog table in BigQuery", "add a dbt source for a Firestore collection", or when a data-platform model needs a Firestore collection that is not yet synced. Covers the partitioning rules that are easy to get wrong.
---

# Firestore collection → BigQuery → dbt

Three things must exist, **in this order**. Skipping ahead means red CI.

1. **web-app**: a `handleSyncDocument` registration streaming the collection to BigQuery.
2. **BigQuery**: the raw changelog landing table (created manually — no code does this).
3. **data-platform**: dbt source entry + `stg_` model + `int_` model + schema docs.

data-platform CI runs `dbt build --state . --defer --favor-state -s state:modified+` against real
BigQuery, so a dbt PR **cannot pass** until 1 and 2 have landed. Say so up front rather than letting
the user discover it in a failed check.

## 1. web-app sync registration

`fyxer-web-app/sync-functions/src/index.ts`, next to its closest sibling:

```ts
export const syncUserLabelChangeEvent = handleSyncDocument<UserLabelChangeEvent>({
  name: "syncuserlabelchangeevent",           // lowercase, no separators
  collectionName: CollectionName.USER_LABEL_CHANGE_EVENT,
  fieldsToExclude: [],                        // prune large/secret fields, e.g. ["refreshToken"]
});
```

Add the type to the alphabetical `@fyxer-ai/shared` import block. No test needed — `index.test.ts`
only exercises `syncEmailMessage`'s `shouldDisregardUpdate` behaviour, and this is a declarative
registration identical to ~40 siblings.

**Table name**: `getAnalyticsTableName` in
`sync-functions/src/triggers/firestore/handleSyncDocument.ts` returns
`toSnakeCase(collectionName) + "_changelog"`. So `UserLabelChangeEvent` →
`user_label_change_event_changelog`. Seven legacy high-volume collections carry a `raw_` prefix via
explicit overrides in that function — **do not add an eighth**; new collections use the default.

Sync only runs when `getEnvironment()` is PROD or STAGING, writing to `prod_firestore` and
`staging_firestore` in project `fyxer-ai-analytics`.

## 2. Raw changelog table DDL

Streaming inserts fail if the table is absent, and nothing in either repo creates it. Run once per
environment (`prod_firestore` **and** `staging_firestore`):

```sql
create table if not exists `fyxer-ai-analytics.prod_firestore.<snake_collection>_changelog`
(
    documentId string options(description = "Firestore document ID."),
    operation string options(description = "Firestore operation: CREATE, UPDATE, DELETE or IMPORT."),
    documentData string options(description = "JSON.stringify of the Firestore document, with excluded fields pruned."),
    insertedAt timestamp options(description = "Time the sync function wrote this row. Partition key.")
)
partition by date(insertedAt)
options(
    description = "Raw changelog for the <Collection> Firestore collection. Populated by sync-functions sync<Collection>.",
    require_partition_filter = false
);
```

Why each choice:

- `require_partition_filter = false` — the `stg_` model only filters `insertedAt` on incremental
  runs; a prod `--full-refresh` scans everything and `true` would break it.
- **All columns nullable** — these are streaming inserts, so a `not null` violation silently drops
  the event. dbt `not_null` tests catch the same problem without losing data.
- `documentData` is `string`, not `json` — the sync function sends `JSON.stringify(...)`;
  `json_extract_scalar` / `json_value` read a string fine.
- No clustering on the raw table; the dbt models cluster their own output.

Diff against a sibling before running:
`bq show --schema --format=prettyjson fyxer-ai-analytics:prod_firestore.raw_inbox_event_changelog`

## 3. data-platform dbt models

Four files. Read the two closest existing analogues first and copy their shape — for an append-only
event collection that is `stg/int_firestore__inbox_event` and
`stg/int_firestore__system_labelled_email`.

**a. `sources/firestore/_firestore__source.yml`** — append `- name: <snake_collection>_changelog`
to the end of `tables` (the list is append-ordered).

**b. `sources/firestore/stg_<...>_changelog.sql`** — 1:1 with the raw table:

```sql
{{ config(
    materialized='incremental',
    incremental_strategy='insert_overwrite',
    unique_key='<thing>_changelog_id',
    partition_by={'field': 'inserted_at', 'data_type': 'timestamp', 'granularity': 'day'},
    cluster_by=['connection_id', 'provider_email_id']
) }}

select
    -- id fields
    concat(c.documentId, c.operation, c.insertedAt) as <thing>_changelog_id
    , c.documentId as <thing>_id
    , json_extract_scalar(c.documentData, "$.userId") as user_id

    -- time fields
    , c.insertedAt as inserted_at
    , parse_timestamp("%Y-%m-%dT%H:%M:%E*SZ", json_extract_scalar(c.documentData, "$.createdAt")) as created_at

    -- dimensions
    , c.operation as firestore_operation
    , ...
from {{ source('firestore', '<snake_collection>_changelog') }} as c
where c.operation != 'DELETE'
{% if is_incremental() %}
    and date(c.insertedAt) >= current_date() - interval 3 day
{% elif target.name != 'prod' %}
    and {{ non_prod_lookback_condition('date(c.insertedAt)', 'firestore_non_prod_lookback_days') }}
{% endif %}
```

Timestamps are ISO strings from `formatISO`, so `parse_timestamp("%Y-%m-%dT%H:%M:%E*SZ", ...)`.
Filter `operation != 'DELETE'` when documents are only deleted by cleanup jobs (check
`handleOauthConnectionDeleted/.../deleteRelatedData.ts`); otherwise carry an `is_deleted` flag.

**c. `models/firestore/intermediate/int_firestore__<thing>.sql`** — latest row per document:
incremental `merge` on the document id, `qualify row_number() over (partition by <thing>_id order by
inserted_at desc) = 1`, with the incremental filter
`where inserted_at >= timestamp(current_date() - interval {{ var('firestore_backfill_safety_days', 3) }} day)`.
Note the existing int models are **singular** despite the style guide's plural rule — follow the
directory.

**d. Schema docs** — `sources/firestore/_firestore__schema.yml` for the staging model and
`models/firestore/_firestore_schema.yml` for the int model. Every column gets a description. Tests:
`unique` + `not_null` on the changelog id, `not_null` on the document id and `inserted_at`; on the
int model `not_null` + `unique` on the id plus `dbt_utils.recency` on the event timestamp at
`severity: warn`.

## Partitioning: the trap

**Never partition an `insert_overwrite` staging model on `created_at`.** The incremental window is in
`inserted_at` space, and `insert_overwrite` replaces exactly the partitions the select produces. A
3-day `inserted_at` reload emits rows with scattered older `created_at` values, so BigQuery wipes
those older `created_at` partitions and rewrites them with only the sliver in the window — silent
data loss.

So: **staging partitions on `inserted_at`; the `int_` model is where event-time partitioning goes.**
Partition the int model on `created_at` only when documents are immutable (written once with a
deterministic id, never updated — check for `.create()` vs `.set()`/`.update()` in the writer). If
they are mutable, follow the sibling convention of `inserted_at as last_updated_at` and partition on
that.

**No `incremental_predicates` on the int model's merge.** The merge key is the document id, which can
stay dormant longer than any time window; bounding `DBT_INTERNAL_DEST` on the partition field hides
older destination rows and lets a late changelog row insert a duplicate.

## PII

Sender email addresses and display names (`from.address`, `from.name`) live in the **non-sensitive**
layer — precedent is `stg_firestore__email_message_changelog.sent_from_email`. Only bodies, subjects
and attachments justify a `sen_stg_` / `sen_int_` model (routed to `*_sensitive_staging` /
`*_sensitive_intermediate` by `macros/db_object_names.sql`). Name the decision to the user rather
than deciding silently.

## Validation without BigQuery

`dbt parse` is the best offline check but needs the venv. If dbt is not installed, at minimum verify
the YAML parses, there are no duplicate model or source-table names, the documented columns match the
SQL exactly, and no line exceeds the 120-char `.sqlfluff` limit. Say plainly which checks you could
not run.
