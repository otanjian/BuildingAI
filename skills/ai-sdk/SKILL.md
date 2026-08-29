---
name: ai-sdk
description: Answer questions about Vercel AI SDK APIs and help build AI-powered features. Use for generateText, streamText, agents, tools, structured output, providers, streaming, embeddings, or AI SDK errors.
metadata:
  author: Vercel Inc.
  version: "1.0"
---

# AI SDK

Use the installed package first. This repository currently uses `ai@6.x` and includes local docs and source under `node_modules/ai/`.

## Lookup order

1. Confirm the installed version: `node -p "require('./node_modules/ai/package.json').version"`.
2. Search local docs/source with `rg "query" node_modules/ai/docs node_modules/ai/src`.
3. For provider-specific behavior, search `node_modules/@ai-sdk/<provider>/docs` and `src`.
4. Use the official website only when local docs are unavailable or the user explicitly requests external/current documentation.

Do not upgrade dependencies or edit lockfiles merely because an API is unfamiliar. Upgrade only when the user asks or the installed version cannot support the requested behavior.

For common errors and Vercel AI Gateway, load [references/common-errors.md](references/common-errors.md) or [references/ai-gateway.md](references/ai-gateway.md).
