# ehcs-ai-extension-scaffold Specification

## Purpose

BuildingAI application extension `ehcs-ai`: console API under `/ehcs-ai/console`, web SPA under `/extension/ehcs-ai`, registered in app center as `/apps/ehcs-ai` (iframe).
## Requirements
### Requirement: Extension package exists and is registrable

The system SHALL provide an application extension with identifier `ehcs-ai` under `extensions/ehcs-ai`, manifest `type: application`, and engine `buildingai >= 25.1.0`.

#### Scenario: Extension builds

- **WHEN** `pnpm --filter ehcs-ai build:publish` runs
- **THEN** API `build/index.js` and web assets are produced without error

### Requirement: Web entry routes

The extension web app SHALL expose routes under base path `extension/ehcs-ai` with at least: index (dashboard), `dashboard`, `rules`, `anomalies`, `settings`. Top navigation SHALL link these routes inside `EhcsLayout`.

#### Scenario: Default route

- **WHEN** user navigates to `/extension/ehcs-ai`
- **THEN** the dashboard page is shown

### Requirement: Console API prefix

Extension REST controllers SHALL be served under `/ehcs-ai/console` using `@ExtensionConsoleController`.

#### Scenario: Authenticated console call

- **WHEN** an authenticated user calls `GET /ehcs-ai/console/dashboard/summary`
- **THEN** the response is JSON from the ehcs-ai module (not 404)

