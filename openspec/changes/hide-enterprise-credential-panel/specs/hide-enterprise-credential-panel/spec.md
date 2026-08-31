## Purpose

Keep the standard secret-template management page focused while preserving enterprise credential administration for the platform's existing authorized flows.

## ADDED Requirements

### Requirement: Standard secret page hides enterprise credential administration

The standard secret-template management page SHALL not render the enterprise credential security panel or issue enterprise credential list requests as part of its initial page workflow.

#### Scenario: Open the standard secret page

- **WHEN** an authorized user opens the secret-template management page
- **THEN** the page begins with the template search and template cards, and no enterprise credential security panel is rendered

#### Scenario: Manage secret templates after the panel is hidden

- **WHEN** a user searches, creates, imports, edits, enables, disables, or manages a secret template
- **THEN** those existing template workflows remain available and behave as before

### Requirement: Enterprise credential capability remains intact

Hiding the panel from the standard page MUST NOT remove or alter enterprise credential APIs, persistence, encryption, rotation, revocation, connectivity testing, or runtime resolution.

#### Scenario: Existing enterprise credential consumer runs

- **WHEN** an existing authorized enterprise credential consumer resolves or manages a credential through its established route
- **THEN** the request remains handled by the unchanged enterprise credential services and APIs
