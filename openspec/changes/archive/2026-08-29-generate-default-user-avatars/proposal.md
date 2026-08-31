## Why

System-assigned user avatars are currently abstract gradient placeholders, so users are difficult to distinguish in the administration list and the experience feels unfinished. Every account should present a recognizable avatar even when the user has not uploaded one.

## What Changes

- Replace the default gradient placeholder library with a cohesive set of diverse, AI-technology portrait avatars.
- Ensure existing accounts that reference the numbered default-avatar URLs immediately display portraits without a database migration.
- Ensure all account creation paths select only valid default-avatar assets when no custom avatar is supplied.
- Preserve explicitly uploaded or configured user avatars.

### Why now

The user-management cards make avatars a primary identity cue, and the current color blocks provide neither identity nor the intended AI product character.

### Non-goals

- Generating a photorealistic likeness of a real user or inferring identity from personal data.
- Removing the existing avatar upload and edit workflow.
- Rewriting historical custom avatar URLs or changing user-list layout.

## Capabilities

### New Capabilities

- `default-user-avatars`: Defines the visual, assignment, compatibility, and custom-avatar precedence behavior for system-generated user avatars.

### Modified Capabilities

- None.

## Impact

- Updates numbered assets under `storage/static/avatars/`.
- Aligns default-avatar selection in console creation, registration, and system initialization services.
- Adds focused tests for the avatar library and assignment contract.
- No database schema or external runtime dependency changes.
