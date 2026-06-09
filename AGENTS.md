# Agent Collaboration Rules

This repository uses OpenSpec for change intent and Superpowers for execution discipline.

## OpenSpec Owns Scope

- Treat `openspec/` as the source of truth for planned product changes.
- For vague ideas, requirement exploration, or architecture discussion, use `openspec-explore`.
- For new capabilities or behavior changes, create or update an OpenSpec change before implementation using `openspec-propose`.
- For implementation work, select the active change and use `openspec-apply-change`.
- Keep `openspec/changes/<change-name>/tasks.md` updated as tasks are completed.
- If implementation reveals a design or scope issue, pause coding and update the relevant OpenSpec artifact before continuing.
- Archive completed changes only after implementation and verification are complete.

## Superpowers Owns How Work Gets Done

- Use Superpowers skills as the execution method inside each OpenSpec phase.
- Before production code for a feature, bug fix, refactor, or behavior change, use test-driven-development unless the task is explicitly documentation/configuration-only.
- For bugs, failing tests, build failures, or unexpected behavior, use systematic-debugging before proposing fixes.
- Before claiming work is complete, use verification-before-completion and run fresh verification commands.
- For multi-step implementation plans, use writing-plans, executing-plans, or subagent-driven-development when they fit the work.
- For branch/workspace isolation, use using-git-worktrees when starting substantial feature work.

## Default Flow

1. Explore unclear requests with OpenSpec explore.
2. Create or update an OpenSpec change for any durable product change.
3. Implement tasks from the selected OpenSpec change.
4. Apply relevant Superpowers process skills while implementing.
5. Mark completed OpenSpec tasks immediately after verified completion.
6. Run project verification before reporting completion.
7. Suggest archiving the OpenSpec change when all tasks are done and verified.

## Local Project Commands

- List changes: `openspec list`
- Check change status: `openspec status --change "<change-name>"`
- Get apply instructions: `openspec instructions apply --change "<change-name>" --json`
- Validate a change: `openspec validate "<change-name>"`

## Project Notes

- OpenSpec root is `openspec/`.
- One OpenSpec change should represent one capability.
- Branch names should follow `feature/<change-name>` unless the user requests otherwise.
- Code-facing text such as comments, logs, errors, and identifiers should be English.
- Keep changes minimal and scoped to the current OpenSpec task.
