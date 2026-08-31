## Context

The repository already contains an `app-identity` specification and prior targeted rebrand edits,
but a broad text search still finds the old product name in docs, licenses, extension materials,
integration scripts, and technical files that mix copy with identifiers. See proposal.md for the
motivation and user-facing scope.

## Goals / Non-Goals

**Goals:**

- Make human-readable product text consistently say `Bowi AI`.
- Preserve executable behavior and all machine-facing identifiers.
- Verify every remaining old-name match is intentionally technical or an external URL.

**Non-Goals:**

- Renaming `@buildingai/*` packages, imports, workspace directories, database/environment/API
  identifiers, local-storage keys, or executable names.
- Changing external repository/documentation URLs whose destination is not known to be renamed.
- Editing generated build output under `public/web`.

## Decisions

**D1: Classify before replacing.** Use a repository-wide inventory, then apply literal replacements
only to human-readable text. A blanket replacement would break package resolution, scripts, and
configuration contracts.

**D2: Use the exact brand spelling.** All product copy becomes `Bowi AI` with a space and capital
`AI`; surrounding Chinese or English wording remains unchanged.

**D3: Leave machine-facing values intact.** Package scopes, paths, URLs, headers, database names,
environment variables, and protocol identifiers are compatibility surfaces, not product copy.

## Risks / Trade-offs

- [Risk] A user-visible string may be missed in an unusual file type → Mitigation: run case-insensitive
  scans over tracked text files and review every remaining match.
- [Risk] A technical identifier may be changed accidentally → Mitigation: exclude known identifier
  patterns and run package/type/build checks for affected code packages.
- [Risk] Old generated assets may still show the former name → Mitigation: do not edit generated
  assets; regenerate them through the normal release build when needed.
