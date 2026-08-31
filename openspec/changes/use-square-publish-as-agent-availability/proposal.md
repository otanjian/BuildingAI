## Why

The current Agent console exposes an unfinished enterprise version/release workflow and the public runtime requires a production release that administrators cannot complete from this screen. As a result, an Agent that is successfully approved and listed in the marketplace still appears unavailable to Feishu and other published entry points. Why now: the ERPNext assistant is already approved for the marketplace, but requests fail with `Agent has no active production release`.

## What Changes

- Hide the unfinished “版本与发布” configuration tab and its version/release governance panel from the Agent editor.
- Treat a Direct Agent that is both published to the marketplace and approved as available for published runtime entry points.
- Remove the separate active-production-release gate from public Agent alias execution.
- Keep the existing marketplace publish/unpublish and review states as the user-visible availability lifecycle.
- Preserve the version/release backend for future use, but do not expose it as a prerequisite for current Agent availability.

## Capabilities

### New Capabilities

- `agent-square-availability`: Defines marketplace approval as the availability gate for published Agent runtime access and console status.

### Modified Capabilities

<!-- None. The version/release workflow remains available as an internal/future capability. -->

## Impact

- React Agent editor navigation and configuration panels.
- Public Agent alias middleware and any availability checks used by published runtime paths.
- Existing tests and user-facing status copy for marketplace publishing.
- No database migration; existing version/release records remain intact.

## Non-Goals

- Do not delete the version/release tables, APIs, or service implementation.
- Do not change marketplace review permissions, token validation, or Feishu credential handling.
- Do not make an unapproved or withdrawn marketplace Agent publicly callable.
