## Why

The product is now branded as **Bowi AI**, but the repository still exposes the former
`BuildingAI`/`buildingAI` name in documentation, legal copy, extension guides, integration
instructions, and other human-readable text. This makes the brand inconsistent for users and
developers reading the project materials.

## What Changes

- Replace human-readable `BuildingAI`/`buildingAI` product references with `Bowi AI`.
- Update repository documentation, installation guides, integration READMEs, extension documents,
  legal notices, comments, and user-visible metadata/copy that still use the old name.
- Keep technical identifiers unchanged, including package scopes, import paths, workspace folders,
  database names, environment variables, API/header names, storage keys, URLs, and executable
  identifiers.
- Add verification that remaining old-name matches are intentional technical identifiers or external
  URLs rather than product text.

## Capabilities

### New Capabilities

<!-- None. This is a documentation and product-copy consistency change. -->

### Modified Capabilities

- `app-identity`: Extend the Bowi AI product-name requirement to all in-repository human-readable
  project text while preserving technical identifiers.

## Impact

- Markdown, text, license, YAML/JSON metadata, shell output, and source comments across the
  repository.
- No runtime contracts, package names, database schema, API routes, environment variable names, or
  external URLs change.
