---
name: project-architecture
description: Navigate the Bowi AI pnpm monorepo, locate implementation files, understand package relationships, and choose project import patterns. Use when a task spans packages, needs file discovery, or requires architecture conventions.
---

# Bowi AI Project Architecture

Use this as a navigation map, not a substitute for the source. Before editing, verify paths, exports, and package scripts with `rg`, `find`, and the relevant `package.json`.

## Top-level map

```text
packages/
  @buildingai/   shared packages (base, cache, config, db, web/*, ai-sdk, ...)
  api/           NestJS API
  core/          reusable business modules
  cli/           CLI tooling
  client/        Tauri + React desktop client
extensions/      runtime-loaded plugins
skills/          development guidance
scripts/         build and utility scripts
```

## Shared package areas

Common packages include `base`, `cache`, `config`, `constants`, `db`, `decorators`, `di`, `dict`, `dto`, `errors`, `extension-sdk`, `logger`, `pipe`, `types`, `upgrade`, `utils`, `wechat-sdk`, and the frontend packages under `@buildingai/web/`.

Frontend web packages are separate subpackages: `hooks`, `http`, `services`, `stores`, `types`, `ui`, `core`, and `i18n`. State management uses Zustand; services use TanStack Query.

AI integrations live in `packages/@buildingai/ai-sdk/` and use the installed Vercel AI SDK 6.x dependency. Confirm exports in source before relying on a reference.

## Where to look

- API/core feature: `packages/api/src/modules/<name>/` or `packages/core/src/modules/<name>/`
- Shared backend utility: `packages/@buildingai/<package>/src/`
- Frontend service/store/UI: `packages/@buildingai/web/<sub-package>/src/`
- Desktop page: `packages/client/src/`
- Extension: `extensions/<name>/`

Detailed package notes are in `references/`; load only the relevant file: `base`, `cache`, `config`, `db`, `decorators`, `errors`, `web`, `ai-sdk`, `api`, `core`, `cli`, `client`, or another matching package.

## Stable conventions

- Backend imports generally group `@buildingai/*`, framework packages, project aliases, third-party packages, then relative paths; follow the local file when it differs.
- API aliases include `@common/*`, `@modules/*`, `@core/*`, and `@assets/*`.
- Services commonly extend `BaseService<Entity>` and use `@InjectRepository()`; controllers use the project's `@ConsoleController`/`@WebController` conventions.
- Keep modules under `src/modules/<module-name>/` with controllers, services, and DTOs as applicable.
