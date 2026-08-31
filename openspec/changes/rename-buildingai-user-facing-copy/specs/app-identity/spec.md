## MODIFIED Requirements

### Requirement: In-repository product text uses Bowi AI

All human-readable project text that refers to the product SHALL use the exact brand name `Bowi AI`,
including documentation, installation instructions, integration guides, extension documentation,
legal notices, comments, CLI/deployment copy, and user-visible application metadata. Technical
identifiers SHALL remain unchanged, including package scopes and names, import paths, workspace and
filesystem paths, database names, environment variables, API routes and headers, storage keys,
executable identifiers, external URLs, and other protocol values.

#### Scenario: Read project documentation

- **WHEN** a user reads repository documentation or an integration guide
- **THEN** product references are displayed as `Bowi AI`
- **AND** commands, paths, package names, and URLs remain usable and unchanged

#### Scenario: Read legal or extension text

- **WHEN** a user reads a repository or extension legal notice, README, or usage guide
- **THEN** human-readable product branding uses `Bowi AI`
- **AND** legal links and technical identifiers remain unchanged

#### Scenario: Inspect source and generated copy

- **WHEN** a developer inspects source comments, CLI output, deployment logs, or application metadata
- **THEN** any human-readable product name uses `Bowi AI`
- **AND** internal identifiers are not renamed as part of the branding change
