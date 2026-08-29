## Context

The frontend is managed by PM2 through `.run/start-web.js` and runs Vite in development mode. The failing process referenced a prior pnpm virtual-store directory, while a fresh Vite process resolved the current directory successfully. See proposal.md for the user-visible failure.

## Goals / Non-Goals

**Goals:**

- Ensure PM2 starts Vite through the workspace package manager/runtime so package paths are resolved at process start.
- Keep restarts deterministic after dependency installation.
- Verify the dev server entry and Vite client endpoint.

**Non-Goals:**

- Do not pin or downgrade Vite, Tailwind, esbuild, or Node dependencies.
- Do not alter application source or production build configuration.

## Decisions

- Keep dependency installation and process startup separate, but make startup resolve the package entry through the workspace's active `node_modules` links.
- Reload the web process after dependency installation rather than relying on Vite HMR to recover from deleted modules.
- Add a health check that requests both `/` and `/@vite/client` so a listening process with a broken module graph is detected.

## Risks / Trade-offs

- [Risk] A manual dependency reinstall can still interrupt a running process. → Restart the web process after install and verify both endpoints.
- [Risk] The configured port may be occupied. → Preserve strict port behavior and report the conflict.
