## Purpose

Make marketplace-approved Direct Agents immediately usable through their configured published entry points while keeping unfinished enterprise release governance out of the normal editor workflow.

## ADDED Requirements

### Requirement: Marketplace approval enables published runtime access

The system SHALL consider a Direct Agent available to published runtime entry points when its marketplace publish status is `approved` and it is marked as published. Public credential validation and channel-specific authorization SHALL remain enforced.

#### Scenario: Approved marketplace Agent accepts a published request

- **WHEN** a Direct Agent has `squarePublishStatus = approved` and `publishedToSquare = true`, and a caller provides a valid enabled API key or site access token
- **THEN** the published Agent request passes the availability check and proceeds to the normal chat handler

#### Scenario: Unapproved Agent remains unavailable

- **WHEN** an Agent is not marketplace-approved or is withdrawn from the marketplace
- **THEN** a published runtime request is rejected as unavailable even when the caller presents a syntactically valid credential

### Requirement: Editor hides unfinished release governance

The normal Agent editor SHALL not display the enterprise version and release governance tab or its version/release status panel. Marketplace publishing controls SHALL remain visible and usable.

#### Scenario: Administrator opens Agent configuration

- **WHEN** an administrator opens the Direct Agent configuration page
- **THEN** the editor shows functional, interface, model (when applicable), and marketplace publishing controls without a “版本与发布” tab

#### Scenario: Marketplace publish succeeds

- **WHEN** an administrator publishes an Agent to the marketplace and the operation completes with approved status
- **THEN** the Agent is shown as published/available and its configured published runtime entry points can invoke it

### Requirement: Availability state is consistent across channels

The Feishu channel and scheduled automation paths SHALL use the same marketplace-approved availability rule as other published runtime entry points, so an approved marketplace Agent does not fail solely because no enterprise production release record exists.

#### Scenario: Feishu sends a message to an approved Agent

- **WHEN** Feishu is enabled with valid credentials for an Agent that is published and approved in the marketplace
- **THEN** the message is forwarded to the Agent instead of being rejected for a missing production release

#### Scenario: Feishu retries an event after a transient processing failure

- **WHEN** processing an inbound Feishu message fails before a reply is delivered
- **THEN** the event deduplication claim is released so a redelivered event can be processed again

#### Scenario: Automation invokes an approved Agent

- **WHEN** a scheduled task invokes an Agent that is published and approved in the marketplace
- **THEN** the invocation reaches the normal Agent chat endpoint without a missing-production-release error
