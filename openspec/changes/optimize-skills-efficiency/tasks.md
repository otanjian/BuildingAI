## 1. Skill content consolidation

- [x] 1.1 Rewrite the three meta-skill entry points so authoring and runtime responsibilities do not duplicate, while preserving compatibility names.
- [x] 1.2 Replace the PostgreSQL monolith with a concise core workflow and linked advanced references.
- [x] 1.3 Trim and correct project-architecture guidance, including current Zustand and package paths, and add live verification guidance.
- [x] 1.4 Update AI SDK guidance to local-first lookup and remove unsolicited upgrade/network behavior.
- [x] 1.5 Add simple/existing-project branching and dependency reuse guidance to web-artifacts-builder and consolidate frontend design guardrails.

## 2. Tooling optimization

- [x] 2.1 Add incremental, selected-target, and `--dry-run` behavior to `scripts/sync-skills.mjs` without changing existing command forms.
- [x] 2.2 Add a read-only `pnpm skills lint` command for frontmatter, body budgets, local links, and known stale repository terms.
- [x] 2.3 Add focused tests or deterministic command checks for sync dry-run/skip/update/remove behavior and lint failures.

## 3. Verification and documentation

- [x] 3.1 Remove or correct invalid local links and update the skills README to describe the lean workflow without duplicated catalog content.
- [x] 3.2 Run skill validation, lint, sync dry-run, and relevant script tests; record measured size and behavior changes.
- [x] 3.3 Mark all completed tasks and validate the OpenSpec change.
