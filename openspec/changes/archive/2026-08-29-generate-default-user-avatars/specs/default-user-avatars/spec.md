## Purpose

Provides every user account with a recognizable, visually cohesive default portrait while preserving custom identity choices and compatibility with existing accounts.

## ADDED Requirements

### Requirement: Every account displays an avatar

The system SHALL provide a default portrait avatar whenever an account has no user-supplied avatar.

#### Scenario: Account is created without an uploaded avatar

- **WHEN** any supported account-creation flow creates a user without an avatar
- **THEN** the account is assigned a valid default portrait URL

#### Scenario: Existing account references a numbered default avatar

- **WHEN** an existing account is displayed with a numbered system-avatar URL
- **THEN** that URL resolves to a portrait rather than an abstract gradient placeholder

### Requirement: Default portraits are varied and cohesive

The default avatar library MUST provide at least thirty visually distinct human portraits in one consistent AI-technology illustration style, with varied presentation and inclusive appearance.

#### Scenario: Administrator views a page of users

- **WHEN** multiple accounts use different numbered default avatars
- **THEN** their faces, silhouettes, colors, or accessories provide clear visual differentiation while retaining a shared visual system

#### Scenario: Historical accounts share the same system placeholder URL

- **WHEN** multiple user-list accounts reference the same numbered system avatar
- **THEN** the user list derives a stable portrait from each account identity so duplicate placeholders do not make the accounts visually indistinguishable

### Requirement: Default avatar assets remain compact and legible

Each system portrait MUST use a square image, remain recognizable at the 48 px user-list size, and use a web-appropriate encoded size.

#### Scenario: User card renders a default avatar

- **WHEN** the user-management page displays the portrait at 48 px
- **THEN** the face remains centered, unclipped, and distinguishable from neighboring portraits

### Requirement: Custom user avatars retain precedence

The system SHALL preserve and display an explicitly supplied avatar instead of substituting a default portrait.

#### Scenario: User uploads a custom avatar

- **WHEN** a valid custom avatar is supplied during account creation or editing
- **THEN** the stored avatar remains the supplied URL
