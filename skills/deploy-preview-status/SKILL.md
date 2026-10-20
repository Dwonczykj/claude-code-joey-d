---
name: deploy-preview-status
description: Check where a web-app PR's deploy-preview deployment is up to. Reports whether the deploy:preview label is set, finds the latest deploy-preview CI run, and shows each job with its current step (terraform first). Use when asked "is the preview deployed", "check the deploy-preview for PR N", "which step is terraform on", or "/deploy-preview-status <pr>".
---

Run the bundled script with the PR number. Add `--watch` to poll every 30s until the run finishes.

```bash
bash ~/.claude/skills/deploy-preview-status/status.sh <pr-number> [--watch]
```

It exits 2 if the `deploy:preview` label is missing (tell the user, do not add the label unless asked) and 3 if no run exists yet. A run whose sha differs from the PR head is marked STALE, which means a newer push has not started deploying.

Report the result in a few lines: label state, run state, and for any job still running, the step it is on. Terraform jobs are `terraform-core` and `terraform-secondary`.
