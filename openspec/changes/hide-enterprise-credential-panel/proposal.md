## Why

The secret-management page currently places enterprise credential administration above the regular secret-template workflow, making the page unnecessarily long and exposing an advanced control surface to users who only need template management. Hide the panel from this page while keeping the enterprise credential APIs and runtime capability available.

## What Changes

- Remove the enterprise credential security panel from the regular secret-template page.
- Keep enterprise credential APIs, storage, runtime resolution, and other entry points unchanged.
- Preserve secret-template search, creation, import, and management workflows.

## Capabilities

### New Capabilities

- `hide-enterprise-credential-panel`: Keep advanced enterprise credential administration out of the standard secret-template page while retaining the capability for authorized use elsewhere.

### Modified Capabilities

- None.

## Impact

- Affects the React page composition in `packages/client/src/pages/console/ai/secret`.
- No backend endpoints, database entities, or credential runtime behavior change.
- The standard page becomes shorter and focused on secret templates.

## Non-goals

- Do not delete enterprise credential data or APIs.
- Do not change permissions, encryption, rotation, revocation, or credential resolution behavior.
