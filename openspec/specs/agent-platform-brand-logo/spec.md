# agent-platform-brand-logo Specification

## Purpose
Defines a recognizable default visual identity for the Bowi AI Agent platform while preserving tenant-controlled branding and clarity in compact navigation layouts.
## Requirements
### Requirement: Default logo communicates a technology-forward AI identity

The Agent platform SHALL display a distinctive default logo that uses an abstract AI core and connected orbital elements rather than a generic application or avatar symbol.

#### Scenario: Default branding is active

- **WHEN** the website configuration does not provide a custom logo
- **THEN** the main sidebar displays the Bowi AI Agent platform logo with a dark technology-oriented surface and high-contrast AI motif

### Requirement: Default logo remains legible in compact navigation

The default logo MUST retain a clear silhouette and recognizable focal mark at the 32 px size used by the main sidebar.

#### Scenario: Sidebar displays the logo at its standard size

- **WHEN** the Agent platform sidebar renders in expanded or collapsed state
- **THEN** the logo's background boundary, central AI core, and primary accent remain visually distinct

### Requirement: Custom branding retains precedence

The Agent platform SHALL continue to use a non-blank website logo from configuration instead of the default Bowi AI Agent platform logo.

#### Scenario: Administrator configured a website logo

- **WHEN** the website configuration contains a non-blank logo URL
- **THEN** the sidebar displays that configured logo and does not substitute the default logo

