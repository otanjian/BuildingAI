## 1. Runtime availability

- [x] 1.1 Add a marketplace availability predicate requiring `publishedToSquare = true` and `squarePublishStatus = approved`, with unit coverage for approved, pending, rejected, and withdrawn states.
- [x] 1.2 Update the public Agent alias gate to use marketplace availability while preserving API key/site-token authentication and add a regression test for an approved Agent without a production release.

## 2. Editor presentation

- [x] 2.1 Hide the “版本与发布” tab and its governance panel from the normal Agent configuration editor while retaining marketplace publish controls.
- [x] 2.2 Update client tests/typecheck and manually verify the editor no longer shows version/release UI and approved marketplace status is visible.

## 3. Verification and rollout

- [x] 3.1 Run focused API and client tests plus lint/typecheck for touched packages.
- [x] 3.2 Validate the OpenSpec change and verify an approved ERPNext Agent can be invoked through Feishu/public runtime without a missing-production-release error.
- [x] 3.3 Release failed Feishu event claims so transient failures can be retried, with regression coverage.
