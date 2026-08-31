# agent-mcp-capability-fallback Specification

## Purpose
This capability keeps MCP-backed operational analysis grounded in the tools that are actually callable at runtime, while providing an explicit and safe fallback when optional Doris capabilities are unavailable.
## Requirements
### Requirement: Discover callable child capabilities

The enterprise operations monitoring agent SHALL discover the current child-capability manifest for a Doris domain before invoking a child capability and SHALL invoke only children marked callable by that manifest.

#### Scenario: Callable child is selected

- **WHEN** a Doris domain manifest marks a child as callable
- **THEN** the agent invokes that child with the manifest version supplied by discovery

#### Scenario: Child is not callable

- **WHEN** a Doris domain manifest marks a child as unavailable, misconfigured, or permission-gated
- **THEN** the agent does not invoke that child and records the reported reason for its analysis

### Requirement: Fall back without fabricating metrics

The agent SHALL fall back to callable Doris catalog and read-only query capabilities when semantic, ADBC, version-gated, or permission-gated children are unavailable, and SHALL label any metric that lacks query evidence as unavailable rather than estimating it.

#### Scenario: Semantic provider is unavailable

- **WHEN** semantic or MetricFlow children report that their provider is not configured
- **THEN** the agent uses accessible `sap_*` catalog/query data where possible and explicitly reports the semantic limitation

#### Scenario: Permission or version probe is unavailable

- **WHEN** a child reports a probe permission or component-version error
- **THEN** the agent avoids repeated retries, uses an available read-only alternative if one exists, and includes the limitation in the result

### Requirement: Preserve todo ownership and deduplication

The agent SHALL use Bowi `todo_*` capabilities only after a Doris-backed risk is evidenced and SHALL search for an equivalent open todo before creating a new one.

#### Scenario: Evidence-backed todo creation

- **WHEN** a Doris query provides evidence for a new operational risk and no equivalent open todo exists
- **THEN** the agent creates a todo assigned to the responsible business owner

#### Scenario: No evidence or duplicate todo

- **WHEN** a risk has no Doris evidence or an equivalent open todo already exists
- **THEN** the agent does not create a new todo

