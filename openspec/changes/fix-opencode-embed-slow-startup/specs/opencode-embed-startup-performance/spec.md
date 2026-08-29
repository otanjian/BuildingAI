## Purpose

Keep the OpenCode conversation usable as soon as its session is mapped, while optional
synchronization continues without making users wait for a remote service.

## ADDED Requirements

### Requirement: Embed bootstrap prioritizes session availability

The embed bootstrap endpoint SHALL return a usable session URL without waiting for optional
enrichment of an already-existing OpenCode session, including refreshed system context and generated
title lookup. Session creation, ownership checks, session binding, and billing initialization SHALL
retain their existing completion guarantees.

#### Scenario: Existing session opens while metadata refresh is slow

- **WHEN** an owned conversation has a mapped OpenCode session and metadata refresh takes longer
  than the request client’s normal response budget
- **THEN** the endpoint returns the same session URL and identifiers without waiting for metadata
  refresh, and the refresh is attempted asynchronously

#### Scenario: Placeholder title opens while title lookup is slow

- **WHEN** an owned conversation still has a placeholder title and OpenCode title lookup is slow or
  unavailable
- **THEN** the endpoint returns the placeholder title with `titleSynced` false, and a later
  background attempt may persist the generated title

### Requirement: Compatibility and eventual enrichment are preserved

The system SHALL continue to tolerate OpenCode runtimes that do not support metadata refresh or
title lookup, SHALL avoid unhandled background failures, and SHALL allow the existing client polling
behavior to observe a title once synchronization succeeds.

#### Scenario: Older runtime rejects optional metadata refresh

- **WHEN** an older OpenCode runtime rejects the background metadata update
- **THEN** the embed response remains successful and the failure is contained without an unhandled
  request or process error

#### Scenario: Generated title becomes available after bootstrap

- **WHEN** a background title lookup returns a non-placeholder title and persistence succeeds
- **THEN** a subsequent embed query returns that generated title, and the client can stop polling
  once it is no longer a placeholder
