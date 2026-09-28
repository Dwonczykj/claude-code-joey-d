---
name: create-posthog-internal-fyxer-staff-only
description: Create a PostHog feature flag that is on for everyone in dev/staging but off in production except for the internal Fyxer staff organisation. Use when the user asks to create a PostHog flag "for internal/staff only", "dogfooding flag", "staff-only flag", or says "/create-posthog-internal-fyxer-staff-only".
---

# Create a Fyxer-staff-only PostHog flag

Creates one flag key in **both** Fyxer PostHog projects, with different targeting per project — this is how per-environment values work here, since dev and staging share a project and prod is separate (there are no PostHog "environments" within a project).

- **Dev/Staging** project **21785**: flag active, 100% rollout, person-level (no release conditions) — on for everyone.
- **Prod** project **13839**: flag active, but the only release condition matches the internal Fyxer org via its group key — off for every other org.

Internal Fyxer org id: `15364650-3cc5-4510-8dca-51a99cbffdbb` (matches on PostHog's `company` group type, group_type_index `0`).

## 1. Get the flag key

Use the name the user gave, or infer one from the feature under discussion in the conversation. Convert to kebab-case (PostHog flag keys, e.g. `my-new-feature-rollout`). If nothing sensible can be inferred, ask.

Also write a one-line `name` (description) for the flag — what it gates.

## 2. Create it in Dev/Staging (project 21785)

```
switch-project { "projectId": 21785 }
create-feature-flag {
  "key": "<flag-key>",
  "name": "<description>",
  "active": true,
  "filters": { "groups": [{ "properties": [], "rollout_percentage": 100 }] }
}
```

## 3. Create it in Prod (project 13839), gated to the Fyxer org

```
switch-project { "projectId": 13839 }
create-feature-flag {
  "key": "<flag-key>",
  "name": "<description>",
  "active": true,
  "filters": {
    "groups": [{
      "properties": [{
        "key": "$group_key",
        "type": "group",
        "group_type_index": 0,
        "operator": "exact",
        "value": ["15364650-3cc5-4510-8dca-51a99cbffdbb"]
      }],
      "rollout_percentage": 100,
      "aggregation_group_type_index": 0
    }]
  }
}
```

There is exactly one release condition group and it only matches that org's `$group_key` — every other org falls through to no match, i.e. off. Don't add a second, unconditioned group; that would turn it on for everyone.

## 4. Verify (optional but cheap)

`feature-flags-evaluation-reasons-retrieve` in the prod project with `groups: {company: "15364650-3cc5-4510-8dca-51a99cbffdbb"}` should return `condition_match`; with any other org id, `no_condition_match`.

## Notes

- This only creates the PostHog flag objects. Reading it in code must use a real PostHog-backed helper — `posthogFlag({flagKey, userId, organisationId})` or `posthog().isFeatureEnabled(key, distinctId, {groups: {company: orgId}})` in `functions/src/clients/posthog.ts` — not `abtest()`/`mvtest()`, which read GrowthBook despite the filename.
- Skip this whole flow if a GrowthBook flag is what's actually wanted (that's the default for backend experiments here); only use PostHog when the user specifically asks for a PostHog flag.
