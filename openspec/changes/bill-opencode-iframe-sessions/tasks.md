## 1. Safe Billing Boundary

- [x] 1.1 Add unit coverage for idempotent iframe billing-state initialization and preserving the
      first boundary.
- [x] 1.2 Initialize the durable iframe billing boundary before the embed endpoint returns its
      OpenCode URL.

## 2. Turn Selection and Usage

- [x] 2.1 Add unit coverage for chronological user-turn selection, terminal descendant checks,
      cursor filtering, and usage aggregation.
- [x] 2.2 Implement pure iframe-turn settlement planning with deterministic, length-safe association
      identifiers.

## 3. Scheduled Settlement

- [x] 3.1 Add service coverage for the 30-minute schedule, advisory locking, idle-only processing,
      failure isolation, and current points-rule resolution.
- [x] 3.2 Implement transactional per-turn settlement, native-turn exclusion, cumulative
      stats/metadata updates, and module registration.

## 4. Verification

- [x] 4.1 Run focused Jest tests and API TypeScript checking for all touched code.
- [x] 4.2 Validate the OpenSpec change and document the safe rollout/manual canary check.
