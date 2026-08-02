# html-artifact-blob-preview Specification

## Purpose
TBD - created by archiving change html-artifact-auth-blob-preview. Update Purpose after archive.
## Requirements
### Requirement: Authenticated HTML artifact loads via blob preview

The system SHALL load HTML artifact preview content using an authenticated HTTP request with the same Bearer credentials used for Agent chat, and SHALL present the response in the dialog iframe via a browser blob URL (not by navigating the iframe directly to the authenticated API path).

#### Scenario: Successful authenticated preview

- **WHEN** an assistant message contains a `data-artifact` part with `kind` equal to `html` and a preview URL
- **AND** the current session has a valid Bearer token for that Agent conversation
- **THEN** the client MUST fetch the artifact with that Authorization header
- **AND** MUST set the preview iframe `src` to a blob URL created from the response body

#### Scenario: Preview failure is visible

- **WHEN** the authenticated artifact fetch fails (for example unauthorized or not found)
- **THEN** the dialog MUST show a visible error state for that artifact instead of a blank iframe

#### Scenario: Blob URL cleanup

- **WHEN** the artifact preview unmounts or its source URL changes
- **THEN** the client MUST revoke the previous blob URL

### Requirement: Published Agent can fetch conversation artifacts with publish credentials

The system SHALL allow the conversation artifact GET endpoint to accept the same published-Agent Bearer credentials used by the public Agent site chat, subject to existing conversation ownership checks.

#### Scenario: Publish token can request owned artifact

- **WHEN** a client calls the conversation artifact endpoint with a valid published Agent access token or API key as Bearer
- **AND** the conversation belongs to that Agent and passes ownership checks
- **THEN** the system MUST return the artifact file content

### Requirement: Open report action and one-shot auto-open

The system SHALL expose an explicit open-report control for each ready HTML artifact preview, and SHALL attempt to open that report in a new browser tab exactly once per artifact URL per browser session when the authenticated blob preview first becomes ready.

#### Scenario: Open report button uses blob URL

- **WHEN** an HTML artifact preview has successfully loaded into a blob URL
- **THEN** the dialog MUST show an open-report control
- **AND** activating that control MUST open the blob URL in a new tab (not the authenticated API path)

#### Scenario: Auto-open once per artifact URL per session

- **WHEN** an HTML artifact blob preview becomes ready for an artifact URL that has not yet been auto-opened in the current browser session
- **THEN** the client MUST attempt to open that blob URL in a new tab once
- **AND** MUST NOT auto-open the same artifact URL again in that session

#### Scenario: Auto-open blocked still leaves manual open

- **WHEN** the one-shot auto-open is blocked by the browser
- **THEN** the open-report control MUST remain available for the user to open the report manually

