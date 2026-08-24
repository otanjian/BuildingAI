## Context

See `proposal.md` for motivation and `specs/opencode-buildingai-report-links/spec.md` for observable behavior. BuildingAI already has an authenticated, conversation-scoped artifact endpoint with Agent ownership and path-containment validation. The normal Agent message UI already fetches that endpoint with the current Bearer credential and renders a Blob preview. The embedded OpenCode UI, however, runs on a separate runtime origin and deliberately has no BuildingAI credential.

The previous OpenCode HTML preview reads workspace files through OpenCode and opens an isolated Blob shell. It cannot satisfy the requested BuildingAI `4091` navigation, and a direct link to the artifact API cannot attach the session Authorization header.

## Goals / Non-Goals

**Goals:**

- Make concrete HTML paths in embedded OpenCode lead to a stable BuildingAI route.
- Reuse existing authenticated artifact retrieval and containment checks.
- Derive the report origin from the active BuildingAI request so local development naturally uses `4091` while deployments remain configurable.
- Preserve active-report script support inside an isolated execution boundary.

**Non-Goals:**

- Give the embedded runtime BuildingAI credentials.
- Create anonymous or shareable report URLs.
- Proxy relative report asset trees in the first version.

## Decisions

### 1. Add a BuildingAI report-view route, not a directly navigated API URL

The client route is scoped as `/agents/:agentId/c/:conversationId/reports/*`. It uses the current authenticated client session to fetch the existing conversation-artifact API, creates a Blob URL, and renders the result in a sandboxed iframe without `allow-same-origin`.

A direct artifact API link was rejected because browser navigation cannot attach the existing Bearer header. Adding a token to the URL was rejected because it would leak credentials into OpenCode state, browser history, logs, and copied links.

### 2. Pass a credential-free report base in the embed URL

When BuildingAI returns an OpenCode embed URL, it also appends a `buildingaiReportBase` query parameter containing the current BuildingAI origin plus the active Agent/conversation report path. The origin is derived from the request-facing BuildingAI origin, with an explicit public-origin configuration taking precedence when present. For the default local web endpoint this resolves to port `4091`.

The OpenCode UI only appends a normalized relative HTML artifact path to that base. The context contains no credential and grants no access by itself; the report-view page still performs authenticated retrieval.

Using a fixed `127.0.0.1:4091` string was rejected because it would break reverse proxies and non-local deployments. A cross-frame `postMessage`-only navigation was rejected because opening a new tab after asynchronous message handling can lose browser user activation.

### 3. Keep one shared HTML-path action with a BuildingAI-first target

The existing OpenCode HTML-path classifier remains the single eligibility rule for inline reply paths and changed-file rows. In embedded mode, when `buildingaiReportBase` is valid, the action synchronously opens the BuildingAI report URL. The current OpenCode Blob preview remains the fallback for older embed URLs without report context, avoiding a flag-day runtime/client deployment.

Path normalization removes the workspace artifact-root prefix when present, rejects traversal and absolute external URLs, and percent-encodes individual path segments before joining them to the report base.

### 4. Make filename-only output citation part of the runtime instruction

Both durable and legacy OpenCode turn prompts state that final responses must cite every generated `.html`/`.htm` file by basename only and must not expose the containing directory or absolute workspace path. The embedded UI already resolves a bare HTML filename relative to the active conversation artifact root, so the shorter label remains clickable without leaking runtime-local filesystem details.

### 5. Reuse and extract authenticated Blob loading on the client

The current message-artifact hook is shared with the report page so token selection, anonymous identifier handling, error reporting, Blob lifecycle, and API base resolution stay consistent. The report page adds a restrained full-viewport loading/error shell and an isolated iframe; it does not introduce a second file-serving API.

## Risks / Trade-offs

- **[Risk] The assistant emits a full path despite instructions** → The filename-only contract is covered by prompt tests; changed-file rows and artifact event projection remain unchanged.
- **[Risk] A crafted embed query points report actions at another origin** → Accept only HTTP(S) bases supplied in explicit BuildingAI embed mode, never attach credentials, and keep authorization in the destination page.
- **[Risk] Generated report scripts attempt parent access** → Render in an iframe sandbox without `allow-same-origin`, forms, popups, or top-navigation privileges.
- **[Risk] Client and OpenCode runtime deploy at different times** → Keep the existing OpenCode Blob preview as fallback when the new query context is absent.
- **[Trade-off] The URL is authenticated rather than publicly shareable** → Users must be signed in, which preserves conversation privacy.

## Migration Plan

1. Add failing unit tests for report URL construction, prompt requirements, viewer path resolution, and Blob cleanup/error behavior.
2. Add the BuildingAI report route and embed context, then update the embedded OpenCode action.
3. Rebuild the workspace OpenCode runtime and BuildingAI client, and restart through the existing development launcher if required.
4. Verify a concrete report path opens on the current BuildingAI `4091` origin and unauthorized paths remain inaccessible.
5. Roll back by removing the route/query wiring and rebuilding the prior runtime; no persisted data migration is involved.
