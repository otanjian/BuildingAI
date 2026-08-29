## Why

The BuildingAI development page can show a Vite overlay after dependencies are reinstalled because PM2 keeps a Vite process alive with an obsolete pnpm virtual-store path. The stale path points to a removed Vite package instance, preventing the frontend from loading.

## What Changes

- Make the development startup path refresh Vite after dependency installation or virtual-store changes.
- Add a verification step that detects stale Vite module paths before exposing the dev server.
- Preserve the existing Vite configuration and frontend behavior.

## Capabilities

### New Capabilities

- `reliable-vite-dev-start`: Start and serve the frontend with dependencies resolved from the current installation.

### Modified Capabilities

- None.

## Impact

- Frontend development startup/PM2 lifecycle scripts.
- No production bundle behavior, Doris service, or API protocol changes.
