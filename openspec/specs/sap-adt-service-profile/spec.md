# sap-adt-service-profile Specification

## Purpose
Provides a safe, explicit local service-profile path for verified Bowi users to call the configured SAP ADT runtime while preserving production fail-closed behavior and capability checks.
## Requirements
### Requirement: Local ADT service profile is usable when explicitly configured
The system SHALL allow a verified personal Bowi session with the required SAP read capability to invoke curated ADT read tools when the local ADT service profile switch is explicitly enabled and the configured ADT upstream is healthy.

#### Scenario: Verified user searches SAP objects through Bowi
- **WHEN** the local service profile switch is `true`, the caller has a verified subject and `sap.read`, and the ADT upstream is available
- **THEN** the curated object-search tool forwards the request to ADT and returns the sanitized search result

#### Scenario: Service profile remains fail-closed when disabled
- **WHEN** the local service profile switch is absent or not `true`
- **THEN** the curated ADT tool is rejected with a stable profile-required error before contacting ADT

#### Scenario: Unverified caller cannot use the local service profile
- **WHEN** a caller has the switch enabled but no verified personal subject
- **THEN** the request is rejected before contacting ADT

