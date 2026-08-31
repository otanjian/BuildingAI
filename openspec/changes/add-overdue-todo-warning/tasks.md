## 1. Overdue state contract

- [x] 1.1 Add a pure overdue-date helper and unit tests covering in-progress past dates, today/future boundaries, completed todos, missing dates, and invalid dates.

## 2. Todo row presentation

- [x] 2.1 Add an accessible `已逾期` warning badge to overdue todo rows without changing persisted todo data or existing actions.
- [x] 2.2 Extend `TodoRow` rendering tests to verify the warning appears only for overdue in-progress records and remains absent for completed/non-dated records.

## 3. Verification

- [x] 3.1 Run focused todo client tests, typecheck/lint for the changed package, and validate the OpenSpec change.
