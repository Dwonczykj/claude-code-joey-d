---
name: complexity-reduction
description: Review one slice, PR or design for what it does not need, then propose a simpler design with less code. It checks the cost per event, asks what can be cut, finds hand-rolled code that should reuse an existing shared helper, and draws today's design next to the simpler one in Excalidraw. The skill improves itself: each run starts from the lessons of the last run and ends by writing new ones. Use when Joey says "complexity review", "complexity-reduction", "simplify this slice", "what isn't needed here", or "/complexity-reduction <PR or slice>".
---

# Complexity reduction

The review is read-only. It proposes cuts and does not build them. Joey decides what to cut, then building is a separate step that he starts.

## 0. Improve the skill first

Before you touch the target:

1. Read `~/.claude/skills/complexity-reduction/runs.md`, all of it.
2. Find the newest run's **Skill improvements for next run** list. Apply each item to this file (the checklist in step 2 or 3, or a step's wording), then mark the item `applied <date>` in runs.md. If an item no longer makes sense, mark it `dropped: <reason>`.
3. Read the feature's running model (see step 7), if one exists.
4. Read every past run's **Joey's decisions**. Those are precedent. If Joey cut something, propose cutting the same kind of thing here without re-arguing it. If he kept something, don't propose cutting the same kind of thing again unless this case is different, and say how.

## 1. Frame the target

- Name the target: the PR number, branch and slice, and what it stacks on.
- Read the feature's `progress.md` and requirements file before any code (slice 1's W1-W7 contract settled what had to stay). Then read the requirement in one sentence from its contract: `.scratch/<feature>/requirements.md`, the OpenSpec change, or the PR body. Write it down before reading any code.
- Read any investigation docs the progress log links (docs-private). Slice 2's Notion investigation had already answered "does anything need this?". Everything below is judged against that sentence.
- Read the code from `origin/<branch>` with `git show` / `git diff <merge-base> origin/<branch>`, or from a detached worktree of your own. Never edit, commit or switch branches in another session's worktree.
- Diff the slice requirements' "How it works" against the built code before anything else. Slice 3's said "reuse the push, filtered"; the build copied it instead, and that drift was the biggest finding.
- Run `git log --oneline <base>..origin/<branch>` and read each `fix:` commit. For every `feat:` commit after the first, ask which requirement it serves and which PR calls it (`818b14ea5d` in slice 3 served 4b). A fix often reverses a simplification or adds a guard for a case outside the requirement (ca3eb9dbce in slice 1, d763aed16b in slice 2).
- Fix commits that exist only to support one requirement (slice 4's ba6bb58bce, 8627dfe499 for auto-open) mark the costliest requirement. Name it in the report.
- If the PR is approved and its requirements were signed off item by item, say up front that any cut undoes a signed-off item, and name which (slice 4: R4/R6).
- In zsh, write `"${B}:path"`, never `$B:path`: `:s`, `:h` and `:t` are history modifiers and mangle the ref.
- Check for a hold (for example `project_pre_3286_complexity_review_hold` in memory). A hold blocks building, not reviewing.

## 2. Design pass (before the code)

Write down first, in two or three sentences, what the target does, why it matters and what impact it has for the user (step 6 item 1). Every cost below is weighed against that.

Draw the flow as it runs: what fires it, what it reads, what it calls, what it writes. For each part, ask **"what breaks for the user if this is gone?"** If the answer is "nothing yet" or "a nicer error", it is a candidate to cut.

Checklist. These come from past runs; step 0 adds new items.

- **Cost per event.** Does anything run for every meeting, email or user, even those that have no use for the feature? The cheapest check that a user has anything to do (a `limit(1)` read of their rules or config) must come before any queue, task, function start or provider call. A feature flag is not that check.
- **Cost per page view (UI slices).** List each network read the page makes and the local gate in front of it. Check whether the "done" state ever stops the reads (in slice 4 a rule made in settings never set the flag, so the reads repeat).
- **Never start a function that has nothing to do.** (Joey, slice 1.)
- **Never make a per-view read for a viewer who can never have a result.** Gate it locally on who can (owners, via `isViewerAnOwner`, in 4b). (Joey, slice 4b.) Find who can ever have a result from the writer (4b: the push writes deliveries only for `listAllOwnerUserIds`), then search for a local check of that set that already exists.
- **A read a later slice must reuse** (4c M6 over 4b) returns rows, not a count or filtered projection the later slice cannot use. One read per subject, shared through one cache. Check the return shape against the later slice's requirement before anything else in the read.
- **Pre-flight guards that repeat a failure the call already reports.** If the real call fails clearly, record and log that failure (at `error`) rather than adding a pre-check, a stored "broken" state and a UI badge for it.
- **Scope and filter options** (by space, team or label) that the first release doesn't need. Ship "all", and add the scope as its own slice.
- **Stored state that could be derived** from records that already exist.
- **New transport, method or kind support** (for example PATCH and PUT): is there a real integration, today, that needs it? Name it. If none, cut it or defer it.
- **Work in the PR that isn't the requirement**, such as chat tool polish or refactors of neighbouring code. Name each piece and say where it belongs instead. Joey sometimes keeps these, so check the precedent.
- **A second path for a generalised mode.** When the slice adds a mode that generalises an existing one (a list call vs one item), the old mode becomes its special case (a chunk of 1), never a second path. (Joey, slice 5.) Ask this first whenever the slice adds a path beside an existing one; in run 6 it found the biggest cut and also answered a later slice's open requirement.
- **A retry or resend that copies the first-send path.** It reuses that path with a filter. (Joey, slice 3.)
- **Behaviour a later slice already replaces.** Build it once, in the later slice. (Joey, slice 3.) Check later slices' requirements for one that replaces this slice's behaviour (slice 5 req 26 over slice 3 req 16), and propose building it once, in the later form.
- **Lines that extend a decided cut.** If an earlier run cut something that is still on the base branch (run 1's MCP guard), list the target's lines that only extend it. They go with that cut and need no new decision.
- **An open "later slice adds X" question.** Before treating it as a choice, check whether an existing path already answers it (run 6: the push's Cloud Task removed the 60-second HTTP limit for Resend all).
- **Split only for deploy order.** A slice split in two so a service deploys before its caller doubles the PRs, specs and review rounds. If no caller sends the new thing yet, the order doesn't matter and the split (or the whole slice) can wait.
- **OpenSpec change for a small, reversible change.** AGENTS.md says these need no spec. Flag a change folder whose lines outnumber the code.
- **A "many" variant or a repeated signpost (UI).** Show the single variant once per thing instead of a second icon, a list tooltip or an anchor, and never repeat a signpost an earlier slice already shows (4b's failed line over 4c's failed marker). (Joey, slice 4c.) Check whether two rules can share the target the link needs, and key on that.
- **Design-only targets.** Check each dependency's branch as it stands, not as decided, and state the build order that keeps the design's cost (4c needs run 5's read first).
- **Generality ahead of need**: typed maps, registries or trigger tables with one entry, and options with one value.
- **An existing anchor or deep-link hook.** Search for one (`useHighlightedAnchor`) before costing any "open at this header" requirement.
- **A cost-saving PR.** Check the claimed saving against the bands the code already has (run 11: the PR's "before" ignored the 30-day sparse band and the 90-day park). Count the affected records in prod with the vault (`count` aggregation, `justification` required for `_` collections), and say whether the saving recurs or is a one-off (a per-member window of days saved, not a monthly figure).
- **A new constant that repeats an existing one.** Grep the value (`168`) in the same constants file before accepting a new name for it (run 11: `sparseFloorHours`).
- **A "fix plus proof" slice.** Check the proof's inputs against decided deferrals first; count affected prod and staging records before weighing "what breaks if it waits"; when the fix is prompt-only, check which schema the next stage enforces. Don't `cd` into a cf-* worktree; use Read. (Run 10.)
- **A new external API call per event.** List what it forces (deadline, retry, re-read, timeout parameter, risk bullet, test scripting in other suites). Check first whether data we already hold, such as our own webhook documents, gives the same number (run 8: 99.5% of billed with no vendor call).
- **A guard for a rare case.** Before calling it rare, trace whether the real path makes its input common (run 10: the five-page source cap looked rare but bites on every write build, because write pages are read after reads). Query the warehouse for how often it fires before keeping it (run 8: the "ends fatal" rule fired for 0 of 167k bots).
- **A metric or billing PR.** Run the impact investigation first: its back-test against the vendor's own bill is also the evidence for whether a cheaper input exists (run 8: our own webhook documents gave 99.5% with no vendor call).
- **Before any new fetch from a vendor**, grep the collection's read module for an existing accessor (run 8: `botStatusUpdates.ts`).
- **A grouping key.** When a requirement counts one thing but links to another (rules vs integrations), check whether two of the first can share one of the second, and key on what the link needs.
- **A proof that names a provider.** List that provider's own tools (its MCP schema through a connected client, or its API docs) before costing the design. In run 9 Notion's MCP `notion-update-page` already did what two requirements and two slices were meant to build.
- **A read the browser triggers.** Check whether the existing runner's result shape lets the browser use it (run 9: MCP results are text only, `toMcpCallResult.ts:22`).
- **Requirements that add a mechanism.** Requirements must push for reusing existing code abstractions: each new requirement names the existing abstraction it extends (a push, a job builder, a typed map, another domain's triggers) before proposing a new one, since reuse is clearer and adds less. (Joey, run 12.)
- **A plan that adds event triggers or automations.** Before costing it, grep for an existing automation system with the same triggers (`FlowTriggerKind`, `TaskQueue.ON_*`, "trigger" enums in other domains). In run 12 Flows already had 6 of 9 groups, their gates and users.
- **A multi-item plan.** Check demand for each item before costing it: a Canny search per item, and a vault count on the nearest existing feature's use (run 12: `Skill` by `triggerKinds`).
- **A "typed map" requirement.** Grep the model for an existing `satisfies Record<Union,` map first (run 12: `WRITE_RULE_TRIGGER_NEEDS_SCOPE`).
- **A new trigger.** List the existing call sites that already fire at the same moment (run 12: the three meeting-end enqueues) before costing a new source-flow call.
- **An "admin overrides member" requirement.** Check identity's managed settings (`SettingControlMode`, `resolveManagedSetting`) and labelling's org rules first. If the override's value is a record (a rule with a destination), make it the same record with an org marker, not a settings model and resolver beside it. (Joey, run 13.)
- **A dependency on a dropped slice.** When a split row names a dropped slice as its dependency, restate the dependency from the code path (run 13: slice 1 plus run 1's gate) before costing the order.
- **A per-meeting gate change.** Say whether the extra read runs on every meeting or only when the first check is empty; the order decides the cost (run 13).
- **An old PR judged against a moved base.** Check each piece on the base first (`git grep` the base for the fix's own identifiers, `git ls-tree` for moved files: egress moved from `services/` to `apps/`). Most verdicts come from that, not from reading the PR's diff. (Run 14.)
- **A back-filled spec.** Count its requirements and compare with how many open changes touch the same area; that sizes the upkeep better than line counts. (Run 14.)
- **A "move stored data" requirement.** Count its writers and readers in src files and read the fix commits first: a cluster of fix rounds for one requirement marks it (run 15: three of five).
- **A new check or size guard.** Search `platform/` for a helper before accepting it (run 15: `getStringifiedSizeBytes`).
- **A counter marking "a build starts".** When a shared reset constant marks the start, the counter belongs in that constant, not at each call site (run 15: `FRESH_BUILD_RESET`).
- **Several downstream guards.** Ask whether bounding the unit at its source (run 15: area size at index time) replaces them, before costing each guard.
- **A design idea raised mid-review** (run 9: prompt-based sends). Weigh it the same way as the target, value first, with its cost per event and the existing code it could reuse, before offering to build it.

## 3. Code pass: reuse before new code

Do this pass in full every run (run 1 skipped it), and say in the report how many reuse matches you found, even if zero.

Assume most new code duplicates something that already exists. For each new function or file in the diff:

1. Say what it does in a verb and a noun ("lists MCP tools", "builds a URL to a meeting", "races a promise against a timeout", "batches deletes").
2. Search for the same job elsewhere: `git grep -n` on the verb and the noun, on the return type's shape, and on the external API it calls, across `platform/`, `library/`, `domains/*/src`, `apps/*/src` and `app/src`. Check `library/` and `platform/` first, then sibling domains.
3. Report each match as **"use `<existing>` (`path:line`) instead of `<new>` (`path:line`)"**, saying whether it is a drop-in replacement or needs a small change to the shared helper.
4. If two places in the stack hand-roll the same thing and no shared helper exists yet, propose one. Say which package should own it (by `docs/structure.md`) and list both callers.

Also check:

- Code copied between slices of the same feature. Diff overlapping slices' file lists against each other (`git diff --numstat` per branch, then intersect); that found `meetingDeliveriesParam.ts` in two PRs in run 3. Start from the running model's "moves to" entries and decided cuts for this slice; once the overlap is mapped there, spend the time on shapes and paths instead.
- Grep for callers of every function the diff extends, not only the new ones. Run 6 found `describeFieldSource` had none, so the slice was extending dead code.
- Tests: compare test lines with code lines. Flag tests that pin behaviour the diff doesn't touch (a PATCH test of credential injection, when injection never branches on method). Flag a new test file that copies another file's mock harness when an `it.each` in the existing suite would do. Flag one-test files that could be folded together. Flag mocks of code that has a real helper or factory. Flag tests that pin implementation details, not behaviour.
- For any "same as X" change (a new method, kind or path through an existing helper), grep the helper's source for the switched-on value (for example `method`) to see exactly where it branches. Tests of code that never branches on it pin nothing.
- Before proposing a parity test or shared const for duplicated lists, check whether the compiler already pins them (a value of one type passed where the other is expected).

## 4. Size every cut

Use `git diff --numstat <merge-base> origin/<branch> -- <paths>` and give lines for code and for tests separately. Call them rough. Never claim a total that you didn't add up. Size a cut as net lines (removed minus the replacement and its tests), not as the deleted files' lines (run 8: the replacement was about 25% of what it replaced).

## 5. Diagram

Make one Excalidraw canvas: today's design on the left, the proposal on the right. Mark wasted paths in red and cut parts as a dashed list on the right. Follow memory `feedback_excalidraw_style` and `feedback_excalidraw_clipboard`: generate with a Python script in `$CLAUDE_JOB_DIR/tmp` (or `.scratch/` of your own worktree), use `fontFamily` 2 and `roughness` 0, bind every arrow at both ends, put edges behind nodes, check that nodes don't overlap, then `pbcopy` it as `excalidraw/clipboard` JSON. Use `diagram_gen.py` in this skill directory as the template: keep its helpers and validation tail, replace `panel()`.

## 6. Report to Joey

Write in British English with plain words and no em-dashes, in under 350 words:

1. Start with what it does and what it is worth, before any finding (Joey, 2026-10-14). In two or three sentences say what the code does for the user, why it matters (the requirement or the evidence it answers, such as a failure on the preview), and what impact it has (who gets it, what they can do that they could not before).
2. Then set that against what it costs: the lines, the new reads, routes, stored fields, PRs and slices it adds. Say plainly whether the impact is worth that, and which parts cost the most for the least impact.
3. Give the cost per event, if any.
4. List the cuts, each with its line count, and say what the user loses.
5. List the shared helpers to reuse, with `path:line` on both sides.
6. Say what stays and why, in one line each.
7. Recommend one option, then ask which cuts he wants, with AskUserQuestion if it fits. Never offer a cut whose loss is the failure the slice exists to fix (run 9: "paste the id" was the Notion preview failure, so deferring the picker was not a real option). Define each project term the report leans on ("proof path", "use case", "source cap") in one plain sentence with its mechanism (run 10: Joey had to ask for three). In a multi-select, an unticked cut is unanswered, not kept: ask what he meant.

Don't build anything. If the work is on hold, say so.

### Every decision comes with the code and a command to open it

Every decision is about a place in the code, so Joey must be able to open that place in one paste. A decision is each thing he has to pick: each option in a multi-select, and each option in a single-select. When a single-select chooses between copies of the same job (keep `A`, keep `B` or keep `C`), each option is its own place in the code.

1. **Before asking, make a checkout whose line numbers match what you cite.** Run `git worktree add --detach /Users/joey/FyxerGh/fyxer-web-app-trees/cr-<slice> origin/<branch>` from the main checkout (for example `cr-slice4b`). If the folder already exists, run `git -C <that path> checkout --detach origin/<branch>` instead, after checking `git -C <that path> status --porcelain` is empty. Never point Joey at a `cf-*` worktree: its head may differ from the PR. Cite code from another branch (such as slice 3's) from a second `cr-` worktree on that branch.
2. **For each decision, name the function and its `path:line`**: the line where the function, query or component starts (`countFailedWriteDeliveriesForMeeting`, `countFailedWriteDeliveriesForMeeting.ts:6`). If the option touches several places, give each one, the main one first.
3. **Give one command per decision** that opens the worktree in Cursor and jumps to that line, as a block he can paste:

   ```bash
   cursor "/Users/joey/FyxerGh/fyxer-web-app-trees/cr-slice4b" && cursor -g "/Users/joey/FyxerGh/fyxer-web-app-trees/cr-slice4b/domains/custom-integration-factory/src/read/writeRules/countFailedWriteDeliveriesForMeeting.ts:6"
   ```

   Use absolute paths in double quotes (paths contain `[organisationId]`). For more places in the same decision, add more `cursor -g "<abs path>:<line>"` lines after the first command.
4. **Where they go:** in AskUserQuestion, put the function, `path:line` and the command in each option's `description` (or in `preview` for a single-select). Also put them in the report under a short "Code for each decision" list, so they can be copied from the terminal: AskUserQuestion text can't be copied.
5. **Check before sending:** `sed -n '<line>p'` each cited line in the `cr-` worktree and make sure it shows the named function.

## 7. Record the run (always, even if the run was cut short)

First update the feature's running model (for PRE-3286: `fyxer-web-app-docs-private/connector-write-out-read-in/complexity-model.md`): the flow as it must run, what each slice necessarily keeps and why, what was cut, and any correction to an earlier run. Read it in step 0 too.

Append a run to `runs.md` with (check the last run number in runs.md first; another session may have added one):

- the date, the target and the requirement sentence;
- the findings in short form, with `path:line` refs;
- **Joey's decisions** (fill these in as he gives them, and record "pending" if he hasn't decided);
- **Skill improvements for next run**: what this run missed, what took too long, which search found the most, and any new checklist item. Be specific: "grep `fetchViaEgress` callers before reviewing any egress change", not "search more".

If Joey makes a decision that sets a rule ("never X"), add it to the checklist in step 2 in the same run.

## 8. After Joey signs off: update the model, then fork the next slice

Joey has signed off when every cut in the step 6 question has an answer (cut, kept, moved or declined) and nothing he raised is still open. Then:

1. Update the running model again for the whole slice, not only the table row: the flow as it must now run (step 7's "flow" section), what the slice necessarily keeps and why, what moves to other slices (and add it to their rows), and any new rule under "Rules that now apply to every slice". Mark the row "Run N done".
2. Pick the next slice: the first row in the model's slice table whose Review column is not "Run N done" and that has a PR or a design to review. Skip rows marked dropped. If none is left, say so and stop.
3. Run the `sf:fork-session` skill to start the next run in its own background session. Name it `connector-writes-slice<N>-complexity` (for example `connector-writes-slice4-complexity`), matching earlier runs, and spawn it from the main repo checkout with no `--worktree`, since the review is read-only. The prompt follows this run's own brief: invoke `/complexity-reduction`, start with step 0, then the target (slice, PR, branch, base branch), its requirements file and contract items, overlapping slices to check, the hold, the read-only rules (git fetch, `git show "${B}:path"`, no edits in any cf-* worktree, no tsc, jest or builds), and the deliverables. End the prompt with: "Do not call EnterWorktree; use cd and absolute paths in Bash."
4. Tell Joey the fork's name and how to reach it (`SendMessage`, `claude attach <id>`).

