## ADDED Requirements

### Requirement: Registry defines twenty enterprise applications

The system SHALL maintain a single registry at `docs/enterprise-ai-apps-registry.json` listing exactly twenty applications with `appId`, `slug`, `schema`, `tablePrefix`, `agentName`, `rulePrefix`, `businessDomains`, and `seedRuleCount`.

#### Scenario: Registry entry completeness

- **WHEN** a consumer reads the registry for implementation
- **THEN** each app entry includes all fields required to scaffold an extension and seed data
- **AND** `seedRuleCount` is at least 30 for every application

### Requirement: Extensions manifest registration

The system SHALL register each enterprise application in `extensions/extensions.json` under `applications.{appId}` with `enabled` defaulting to false except documented P0 pilot apps.

#### Scenario: Extension sync discovers apps

- **WHEN** an operator runs `pnpm extension:sync`
- **THEN** enabled applications appear in the console extension list and may receive sidebar menu entries per platform policy

### Requirement: Documentation cross-links

Each application's PRD and DB documents SHALL use matching `SLUG` filenames and reference the correct `appId`, schema, and table prefix consistent with the registry.

#### Scenario: PRD and DB alignment

- **WHEN** reviewing `docs/PRD-{SLUG}.md` and `docs/DB-{SLUG}.md` for an app
- **THEN** schema name and MCP tool prefix match the registry entry for that `appId`
