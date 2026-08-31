## ADDED Requirements

### Requirement: Lean default skill bodies

The repository MUST keep routine guidance in the main `SKILL.md` and place specialist or low-frequency material in directly linked reference files.

#### Scenario: Routine PostgreSQL design

- **WHEN** a user asks for a normal PostgreSQL table or migration
- **THEN** the default PostgreSQL skill provides core modeling, type, constraint, and indexing decisions without requiring the full advanced reference corpus

#### Scenario: Specialized PostgreSQL feature

- **WHEN** a user asks about partitioning, JSONB indexing, extensions, or advanced performance
- **THEN** the PostgreSQL skill identifies and links the relevant reference file for selective loading

### Requirement: Accurate and non-overlapping activation guidance

The skill set MUST retain compatibility names while assigning distinct responsibilities to authoring and runtime/hook skills. Skill descriptions MUST include concrete triggers and MUST NOT instruct routine dependency upgrades.

#### Scenario: Create or edit a skill

- **WHEN** a user asks to create, write, or update a skill
- **THEN** authoring guidance is the primary route and duplicate full authoring bodies are not required

#### Scenario: Debug activation or hooks

- **WHEN** a user asks about triggers, hooks, rules, or skill activation
- **THEN** runtime guidance is selected without loading the full authoring workflow

### Requirement: Repository-aligned references

Project architecture and AI SDK guidance MUST reflect current package paths and technology choices, and MUST instruct live verification when documentation may drift.

#### Scenario: Locate a package or import

- **WHEN** a user uses the architecture skill
- **THEN** the skill points to current package locations and directs the agent to verify paths and exports before editing

#### Scenario: Ask about AI SDK APIs

- **WHEN** local AI SDK documentation exists
- **THEN** the skill directs the agent to inspect the installed package first and does not suggest upgrading unless explicitly requested

### Requirement: Low-cost artifact and synchronization workflows

The web artifact workflow MUST avoid initialization for simple or existing projects, and the skill synchronizer MUST support incremental, read-only dry runs.

#### Scenario: Simple artifact or existing project

- **WHEN** the user requests a single-file artifact or already has a React/Vite project
- **THEN** the workflow skips unnecessary project initialization and dependency installation

#### Scenario: Unchanged skill sync

- **WHEN** source and selected target files are identical
- **THEN** sync reports them as skipped and does not delete or rewrite the target directory

#### Scenario: Dry-run sync

- **WHEN** the user passes `--dry-run`
- **THEN** sync reports planned additions, updates, and removals without changing files

### Requirement: Fast skill lint

The project MUST provide a read-only lint command that validates skill frontmatter, body size budgets, local links, and known stale repository references.

#### Scenario: Valid skill set

- **WHEN** `pnpm skills lint` runs on the repository
- **THEN** it exits successfully and reports a concise summary

#### Scenario: Invalid or stale skill

- **WHEN** a skill contains a broken local link, exceeds its configured body budget, or contains a known stale path/term
- **THEN** lint exits non-zero and identifies the file and issue
