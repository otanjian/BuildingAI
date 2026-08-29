---
name: web-artifacts-builder
description: Build complex shareable single-HTML web artifacts with React, TypeScript, Tailwind, and shadcn/ui. Use when the artifact needs multiple components, state, routing, or a self-contained bundle; do not use for simple single-file HTML/JSX or an existing app that does not need bundling.
license: Complete terms in LICENSE.txt
---

# Web Artifacts Builder

## Choose the lightest path

- Simple static HTML/JSX: build directly; do not initialize this stack.
- Existing React/Vite project: reuse it and install nothing that is already present.
- New multi-component artifact: run `scripts/init-artifact.sh <project-name>`.
- Shareable single HTML: run `scripts/bundle-artifact.sh` only after implementation.

## Workflow

1. Confirm the project path and whether a single self-contained HTML output is required.
2. Initialize only when no suitable project exists; keep the generated component set as small as practical.
3. Implement the requested behavior and UI, reusing existing dependencies and design tokens.
4. Bundle only on request or when the delivery format requires it. The output is `bundle.html`.
5. Test or visualize after delivery when requested or when an issue appears; avoid an upfront browser pass for a straightforward artifact.

The stack is React + TypeScript + Vite with Tailwind/shadcn support. The scripts may install dependencies, so prefer an existing workspace and check `package.json` before running them.
