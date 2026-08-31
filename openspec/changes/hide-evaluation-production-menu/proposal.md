## Why

The evaluation and production-readiness page is not ready for general navigation exposure, so
showing it in the workspace menu creates an unfinished entry point for users. Hide the menu now
while preserving the underlying route and implementation for controlled access and future release.

## What Changes

- Hide the “评估与生产就绪” workspace menu item in seeded and already-migrated installations.
- Stop adding a frontend fallback entry that can reintroduce the menu when menu migrations have not
  run yet.
- Keep the evaluation page route and permission available for direct or controlled access.

## Capabilities

### New Capabilities

- `hide-evaluation-production-menu`: Controls visibility of the evaluation/readiness navigation
  entry without removing the feature itself.

### Modified Capabilities

<!-- None. This is a navigation-visibility capability; the evaluation behavior is unchanged. -->

## Impact

- Affected frontend console navigation and database menu seed/migration data.
- Existing evaluation routes, APIs, permissions, and stored evaluation data remain unchanged.

## Non-Goals

- Do not delete the evaluation page, route, permission, or evaluation data.
- Do not change evaluation or production-readiness behavior.
