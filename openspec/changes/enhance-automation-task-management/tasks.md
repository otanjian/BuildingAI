## 1. Contracts and service validation

- [x] 1.1 Extend the automation update input and Bowi/web service types to carry delete-after-run,
      missed-run policy, overlap policy, and timeout fields.
- [x] 1.2 Add failing service/provider tests for persisting editable policy fields, validating
      ranges, recalculating next runs, and preserving delivery scope; implement the minimal backend
      changes.

## 2. Web data mutations

- [x] 2.1 Add an update mutation for creator tasks that calls `PATCH /automations/:id` and
      invalidates the task query.
- [x] 2.2 Add a failing cache test for successful deletion removing the deleted task immediately;
      implement optimistic list filtering with refetch reconciliation.

## 3. Creator task editor

- [x] 3.1 Build an accessible edit dialog for task name, prompt, schedule variants, execution
      policies, and timeout with reset-on-open and client-side validation.
- [x] 3.2 Add edit buttons to non-terminal task cards, submit through the update mutation with
      `updatedAt`, handle conflicts/errors, and render updated values after success.

## 4. Verification

- [x] 4.1 Run focused API and client tests, typechecks, and lint for changed packages.
- [x] 4.2 Manually verify delete disappearance, terminal-task edit visibility, schedule variant
      switching, and stale-update error behavior in the automation workspace.
