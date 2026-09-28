---
name: deployment-PR-check-my-comments
description: Triage the staging→production release PR for review comments assigned to Joey or touching his merged work, then approve and react in the deploy Slack thread. Use when Joey pastes the "Prod release" / "Deployment staging to main web-app" Slack link, says "check my comments on the release PR", "deployment PR check", or "/deployment-PR-check-my-comments".
---

# Deployment PR: check my comments

Joey gets tagged on the production release PR (staging → main) in the deploy Slack thread. His job is to clear any review comments assigned to him or on code he merged to staging, then unblock the release.

## Input

A Slack message link to the deploy thread (channel `C08J0D54FV2`, "Prod release: <github PR link> cc @…"). The release PR link is always in that message.

## Guiding principle

**Avoid blocking the release.** Only a comment showing that something Joey merged to staging **will break in production** blocks the deploy. Everything else is either resolved-and-replied now, or deferred to a fork-session that PRs to staging later — never a blocker.

## Steps

1. **Read the Slack thread** (`slack_read_thread`, channel + `message_ts` from the link). Note any comment explicitly assigned to someone, and confirm which are assigned to Joey (user `U08G4A2GR89`). Comments assigned to other people are theirs — do not touch them.

2. **Open the release PR** (`gh pr view <n> --repo Fyxer-AI/web-app --json title,body,author,...`). The body lists every contributing PR with author handles. Joey's handle is **`Dwonczykj`** — note which listed PRs are his; those are "his merged work".

3. **Pull all comments on the release PR**:
   - Review comments: `gh api repos/Fyxer-AI/web-app/pulls/<n>/comments --paginate`
   - Issue comments: `gh api repos/Fyxer-AI/web-app/issues/<n>/comments --paginate`
   - Reviews: `gh api repos/Fyxer-AI/web-app/pulls/<n>/reviews --paginate`
   Ignore bot boilerplate (Cursor "high-risk needs human review", Codex/Qodo summaries, walkthroughs, diagrams). Keep only substantive findings.

4. **Scope to Joey's work.** For each substantive comment, decide: is it assigned to Joey in Slack, OR does it point at a file/PR Joey merged? If neither, skip it — do not address other people's work.

5. **For each in-scope comment, classify and act:**
   - **Blocker** (his change will break in production): do NOT approve. Reply in the Slack thread with 🔴 and "blocker, [what] before release" + a link to the comment(s). A fix merged to staging ahead of release is critical here.
   - **Real but non-breaking**: fix it in a **fork-session** that PRs to staging (do not block), reply on the PR comment with the resolution, and resolve the thread.
   - **Not worth fixing / stale / can't-occur**: reply on the thread with the reason and resolve it.

6. **Unblock and report in Slack** (only after in-scope comments are handled):
   - **Approve the PR as Joey**: `gh pr review <n> --repo Fyxer-AI/web-app --approve`.
   - **React/reply in the deploy thread**:
     - Nothing was assigned to Joey and nothing to do → **✅**.
     - Comments were addressed → **"comments replied and actioned - not blocking ✅"**.
     - There's a blocker → **🔴** + "blocker, [detail]" + link to the comment(s), and do **not** approve.

## Slack reaction caveat

The Slack connector here exposes no add-reaction tool. Post the ✅ / message as a **thread reply** (`slack_send_message` with `thread_ts` = parent). Say in the reply-back to Joey that it's a reply not a native reaction, in case he wants to swap it for an emoji reaction himself.

## Notes

- Sending a Slack message and approving a PR are outward-facing actions — Joey's request to run this skill authorises them for this release only.
- Don't run `tsc --noEmit` in this repo; verify any fix by reading the diff.
- Fork-session fixes: agents can't push; leave the branch/PR for Joey to push and open.
