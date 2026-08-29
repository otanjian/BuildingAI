## Purpose

Ensure the BuildingAI frontend development server starts against the current pnpm dependency graph and does not retain deleted virtual-store module paths after reinstall or upgrade operations.

## ADDED Requirements

### Requirement: Current dependency resolution

The frontend development server SHALL resolve Vite and its plugins from the current workspace installation each time the development process is started.

#### Scenario: Dependencies were reinstalled

- **WHEN** the pnpm virtual store has changed since the previous frontend process started
- **THEN** the next frontend start SHALL use the current package paths and serve the application without a stale-module error

#### Scenario: Frontend starts normally

- **WHEN** the configured development port is available
- **THEN** the server SHALL respond with the application entry page and Vite client endpoint

### Requirement: Stale path failure handling

The startup path SHALL fail clearly before serving a broken page when Vite cannot resolve its current dependency graph.

#### Scenario: Vite dependency is missing

- **WHEN** a required Vite module cannot be resolved
- **THEN** startup SHALL report the dependency error and SHALL NOT leave an apparently healthy but unusable frontend process
