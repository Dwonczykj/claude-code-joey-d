# Drafts Experiment Results

Ask the user which experiment flag name to analyse, then run both BigQuery queries and present the results.

## Step 1 — Ask for the experiment name

Before doing anything else, use `AskUserQuestion` to prompt:

> "Which experiment flag name should I query? (e.g. `include-draft-learnings`, `draft-sys-inst-5.4high-autoresearch`)"

Wait for the answer. Store it as `EXPERIMENT_FLAG`.

## Step 2 — Run raw stats query

Use `mcp__bigquery__execute_sql` with the SQL below, substituting every occurrence of `EXPERIMENT_FLAG` with the value the user provided.

```sql
WITH base AS (
  SELECT
    JSON_VALUE(se.experiment_variates, '$."EXPERIMENT_FLAG"') AS variate,
    COALESCE(
      se.draft_acceptance_score >= 0.5,
      CASE
        WHEN se.cosine_distance IS NOT NULL
          THEN (1 - LEAST(CAST(se.cosine_distance AS FLOAT64) / 0.2, 1)) >= 0.5
      END,
      FALSE
    ) AS draft_used,
    se.levenshtein_distance
  FROM `prod_dbt_intermediate.int_posthog__send_email_in_thread` se
  LEFT JOIN `prod_dbt_intermediate.int_firestore__system_created_draft` sd
    ON sd.system_created_draft_id = se.system_created_draft_id
  WHERE JSON_VALUE(se.experiment_variates, '$."EXPERIMENT_FLAG"') IS NOT NULL
    AND se.email_sent_count_after_draft_created = 0
)

SELECT
  variate,
  COUNT(*) AS sample_size,
  COUNTIF(draft_used) AS draft_used_count,
  AVG(CASE WHEN draft_used THEN 1.0 ELSE 0.0 END) AS mean,
  VARIANCE(CASE WHEN draft_used THEN 1.0 ELSE 0.0 END) AS var,
  AVG(CAST(levenshtein_distance AS FLOAT64)) AS mean_levenshtein,
  VARIANCE(CAST(levenshtein_distance AS FLOAT64)) AS var_levenshtein,
  COUNTIF(levenshtein_distance IS NOT NULL) AS levenshtein_n
FROM base
GROUP BY 1
ORDER BY 1;
```

## Step 3 — Run significance test query

If there are exactly two variates (control + one test arm), use the original pivot approach. If there are more than two variates, use the CROSS JOIN approach below so every test arm is compared against control. Substitute `EXPERIMENT_FLAG` in all `JSON_VALUE` calls.

```sql
WITH base AS (
  SELECT
    JSON_VALUE(se.experiment_variates, '$."EXPERIMENT_FLAG"') AS variate,
    COALESCE(
      se.draft_acceptance_score >= 0.5,
      CASE
        WHEN se.cosine_distance IS NOT NULL
          THEN (1 - LEAST(CAST(se.cosine_distance AS FLOAT64) / 0.2, 1)) >= 0.5
      END,
      FALSE
    ) AS draft_used,
    se.levenshtein_distance
  FROM `prod_dbt_intermediate.int_posthog__send_email_in_thread` se
  LEFT JOIN `prod_dbt_intermediate.int_firestore__system_created_draft` sd
    ON sd.system_created_draft_id = se.system_created_draft_id
  WHERE JSON_VALUE(se.experiment_variates, '$."EXPERIMENT_FLAG"') IS NOT NULL
    AND se.email_sent_count_after_draft_created = 0
),

stats AS (
  SELECT
    variate,
    COUNT(*) AS sample_size,
    AVG(CASE WHEN draft_used THEN 1.0 ELSE 0.0 END) AS mean,
    VARIANCE(CASE WHEN draft_used THEN 1.0 ELSE 0.0 END) AS var,
    AVG(CAST(levenshtein_distance AS FLOAT64)) AS mean_lev,
    VARIANCE(CAST(levenshtein_distance AS FLOAT64)) AS var_lev,
    COUNTIF(levenshtein_distance IS NOT NULL) AS lev_n
  FROM base
  GROUP BY 1
),

control_stats AS (
  SELECT mean AS mean_c, var AS var_c, sample_size AS n_c,
         mean_lev AS mean_lev_c, var_lev AS var_lev_c, lev_n AS lev_n_c
  FROM stats WHERE variate = 'control'
),

test_variants AS (
  SELECT variate, mean AS mean_t, var AS var_t, sample_size AS n_t,
         mean_lev AS mean_lev_t, var_lev AS var_lev_t, lev_n AS lev_n_t
  FROM stats WHERE variate != 'control'
),

zscores AS (
  SELECT
    t.variate,
    (t.mean_t - c.mean_c) / SQRT(c.var_c / c.n_c + t.var_t / t.n_t) AS z_draft,
    (t.mean_lev_t - c.mean_lev_c) / SQRT(c.var_lev_c / c.lev_n_c + t.var_lev_t / t.lev_n_t) AS z_lev,
    t.mean_t - c.mean_c AS lift_draft,
    t.mean_lev_t - c.mean_lev_c AS lift_lev
  FROM test_variants t CROSS JOIN control_stats c
),

pvals AS (
  SELECT
    variate, lift_draft, z_draft, lift_lev, z_lev,
    2 * (
      (EXP(-0.5 * z_draft * z_draft) / SQRT(2 * ACOS(-1))) *
      (
        0.319381530 * (1.0 / (1.0 + 0.2316419 * ABS(z_draft))) +
        -0.356563782 * POW(1.0 / (1.0 + 0.2316419 * ABS(z_draft)), 2) +
        1.781477937 * POW(1.0 / (1.0 + 0.2316419 * ABS(z_draft)), 3) +
        -1.821255978 * POW(1.0 / (1.0 + 0.2316419 * ABS(z_draft)), 4) +
        1.330274429 * POW(1.0 / (1.0 + 0.2316419 * ABS(z_draft)), 5)
      )
    ) AS p_draft,
    2 * (
      (EXP(-0.5 * z_lev * z_lev) / SQRT(2 * ACOS(-1))) *
      (
        0.319381530 * (1.0 / (1.0 + 0.2316419 * ABS(z_lev))) +
        -0.356563782 * POW(1.0 / (1.0 + 0.2316419 * ABS(z_lev)), 2) +
        1.781477937 * POW(1.0 / (1.0 + 0.2316419 * ABS(z_lev)), 3) +
        -1.821255978 * POW(1.0 / (1.0 + 0.2316419 * ABS(z_lev)), 4) +
        1.330274429 * POW(1.0 / (1.0 + 0.2316419 * ABS(z_lev)), 5)
      )
    ) AS p_lev
  FROM zscores
)

SELECT
  variate,
  'draft_used' AS metric,
  lift_draft AS lift,
  z_draft AS z_score,
  p_draft AS p_value,
  CASE
    WHEN p_draft < 0.05 AND lift_draft > 0 THEN 'TEST WINS'
    WHEN p_draft < 0.05 AND lift_draft < 0 THEN 'CONTROL WINS'
    ELSE 'NO SIGNIFICANT WINNER'
  END AS result
FROM pvals
UNION ALL
SELECT
  variate,
  'levenshtein' AS metric,
  lift_lev AS lift,
  z_lev AS z_score,
  p_lev AS p_value,
  CASE
    WHEN p_lev < 0.05 AND lift_lev < 0 THEN 'TEST WINS (lower distance)'
    WHEN p_lev < 0.05 AND lift_lev > 0 THEN 'CONTROL WINS (lower distance)'
    ELSE 'NO SIGNIFICANT WINNER'
  END AS result
FROM pvals
ORDER BY variate, metric;
```

## Step 4 — Present results

Show two sections:

### Raw Stats

A markdown table with columns: `variate`, `sample_size`, `draft_used_count`, `draft_used_rate` (mean as %), `mean_levenshtein`.

### Significance Test

A markdown table with columns: `variate`, `metric`, `lift`, `z_score`, `p_value`, `result`.

### Summary

2–3 sentences interpreting the outcome — which variant(s) won on which metrics, whether the results are significant, and any notable observations (e.g. "control wins on draft usage but test wins on Levenshtein").

## Notes

- `draft_used` rate: higher is better (user accepted the draft)
- `levenshtein` distance: lower is better (user edited less)
- Significance threshold: p < 0.05 (two-tailed)
- Filter `email_sent_count_after_draft_created = 0` excludes rows where the user sent before the draft was ready
