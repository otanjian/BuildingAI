## Context

`AiSecretTemplateManage` currently renders `CredentialSecurity` before the template search and card grid. `CredentialSecurity` owns its own query and mutations, so removing its page composition entry is sufficient to stop the panel and its initial list request without touching the service or API implementation.

## Goals / Non-Goals

**Goals:**

- Remove the enterprise credential panel from the standard secret-template page.
- Remove the now-unused page import while retaining the reusable component and backend capability.

**Non-Goals:**

- Do not delete `credential-security.tsx` or change its APIs.
- Do not modify template-management behavior.

## Decisions

- Remove the JSX composition and import from `secret-template-manage.tsx` instead of hiding with CSS. This prevents unnecessary credential queries and keeps the DOM and accessibility tree free of an unavailable feature.
- Leave the credential component and services in place so a future dedicated administrative route can reuse them without migration work.

## Risks / Trade-offs

- [Risk] Users who relied on this page as their only credential entry point will no longer see it. → Mitigation: preserve the APIs/component and document that a dedicated route can expose them later.
