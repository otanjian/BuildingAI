## Purpose

Provide one secure Bowi MCP contract for curated SAP development and business operations while keeping SAP ADT and PyRFC runtimes, credentials, and session handles behind the platform boundary.

## ADDED Requirements

### Requirement: Bowi exposes one curated SAP catalog
The system SHALL expose approved SAP tools through the first-party Bowi MCP endpoint and MUST NOT mirror unapproved upstream tools automatically. Model-visible schemas MUST NOT contain SAP passwords, Bowi user IDs, upstream MCP session IDs, or PyRFC connection IDs.

#### Scenario: Client lists Bowi tools
- **WHEN** an authenticated principal with assigned SAP capabilities calls `tools/list`
- **THEN** it receives the stable domain-prefixed SAP tools authorized by those capabilities for health, source discovery, source reading, table reading, RFC metadata, approved RFC calls, source mutation, activation, and transport operations

#### Scenario: Unbound trusted client discovers configured tools
- **WHEN** a trusted managed MCP client lists tools before call-level subject metadata is available
- **THEN** it may discover only deployment-approved SAP capabilities, but every SAP execution is denied until a verified subject is supplied

#### Scenario: Upstream adds a new tool
- **WHEN** an ADT or PyRFC runtime publishes a tool not present in the Bowi allowlist
- **THEN** the new tool is not exposed through Bowi until explicitly classified and approved

### Requirement: SAP access uses a verified principal-bound profile
Every SAP tool call MUST resolve a connection profile for the verified Bowi subject and MUST bind any internal upstream handle to that subject. Anonymous, published, site-token, missing-subject, or cross-subject handles SHALL NOT access SAP.

#### Scenario: Verified user calls SAP
- **WHEN** a logged-in BuildingAI user with an assigned SAP capability calls an approved tool
- **THEN** Bowi resolves that user's SAP profile internally and invokes the appropriate upstream runtime without returning credentials or internal handles

#### Scenario: Existing composite SAP connection parameter is used
- **WHEN** the verified user's personal parameters contain the existing `sap链接参数` or `sap_connection` composite value
- **THEN** Bowi parses its application host, instance, client, user, language, router, and password internally, while explicit structured personal fields take precedence

#### Scenario: Caller supplies infrastructure identity
- **WHEN** a caller includes a password, user ID, connection ID, ADT lock handle, or upstream tool name outside the approved schema
- **THEN** Bowi rejects the arguments and performs no upstream call

#### Scenario: Profile is unavailable
- **WHEN** the verified user has no complete SAP connection profile
- **THEN** Bowi returns a stable configuration error without revealing other users' profiles

### Requirement: SAP capabilities are independently authorized
The system MUST authorize SAP reads, source writes, transport operations, debugging, and unrestricted RFC invocation independently. Normal personal sessions SHALL receive read-only SAP capability by default only when SAP is configured; destructive or open-ended operations MUST require explicit capability grants.

#### Scenario: Read-only user invokes source update
- **WHEN** a principal with only `sap.read` invokes a source mutation tool
- **THEN** Bowi denies the call before contacting the upstream runtime

#### Scenario: Approved RFC invocation
- **WHEN** a principal with `sap.rfc` invokes an allowlisted RFC or BAPI
- **THEN** Bowi validates the function name and forwards the call through PyRFC

#### Scenario: Unrestricted RFC invocation
- **WHEN** a principal without `sap.rfc.admin` requests a function absent from the allowlist
- **THEN** Bowi rejects the request before contacting PyRFC

### Requirement: ADT and PyRFC remain isolated upstream adapters
Bowi SHALL route ADT development operations to the ADT runtime and RFC/BAPI operations to the PyRFC runtime. A failure, timeout, or session termination in one upstream MUST NOT corrupt another subject's session or the other adapter.

#### Scenario: Concurrent ADT clients
- **WHEN** two Bowi subjects call ADT tools concurrently
- **THEN** each call uses an isolated stateful upstream session and neither response is delivered to the other subject

#### Scenario: PyRFC handle expires
- **WHEN** a cached PyRFC connection becomes invalid or idle-expired
- **THEN** Bowi discards it, reconnects at most once for a safe retry, and never exposes the replacement handle

#### Scenario: Upstream is unavailable
- **WHEN** either SAP upstream cannot be reached before its configured timeout
- **THEN** Bowi returns a sanitized stable upstream-unavailable error and releases affected client resources

### Requirement: SAP writes are guarded and auditable
SAP tools that can change code, transports, or business state MUST be marked destructive or non-read-only, require explicit authorization, and emit structured audit events containing tool, adapter, subject, agent, conversation, call ID, outcome, and duration without secrets or full business payloads.

#### Scenario: Source update succeeds
- **WHEN** an authorized user updates source through Bowi
- **THEN** Bowi locks, writes, and unlocks the object within one isolated ADT session and emits a successful audit event without source content, credentials, or the ADT lock handle

#### Scenario: Source update fails after locking
- **WHEN** ADT rejects a source update after Bowi acquired the object lock
- **THEN** Bowi attempts to release the lock before closing the isolated session and returns a sanitized error

#### Scenario: Destructive call fails
- **WHEN** an authorized destructive SAP call fails upstream
- **THEN** Bowi returns a sanitized error and emits a failed audit event with correlation metadata

### Requirement: Managed OpenCode uses Bowi as the normal SAP entry point
The managed OpenCode configuration SHALL enable `bowi-mcp` for SAP operations and SHALL NOT register direct `sap-abap` or `sap-pyrfc` entries in the ordinary configuration. Direct endpoints MAY remain running as private Bowi upstreams and MAY be registered temporarily in a separate administrator diagnostic configuration.

#### Scenario: Managed OpenCode discovers SAP tools
- **WHEN** OpenCode starts with BuildingAI-managed configuration
- **THEN** it discovers curated SAP tools from `bowi-mcp` without also exposing duplicate direct SAP tool catalogs

#### Scenario: Administrator inspects the ordinary MCP configuration
- **WHEN** an administrator lists configured OpenCode MCP servers
- **THEN** neither `sap-abap` nor `sap-pyrfc` is present, while Bowi remains configured

#### Scenario: OpenCode selects a normal business tool
- **WHEN** a BuildingAI OpenCode session receives a Todo or SAP business request
- **THEN** its trusted pre-subject catalog exposes the Todo definitions and configured SAP definitions, its discoverable usage rules direct it to the `bowi_*` tools, and it is not instructed to establish a direct SAP connection

#### Scenario: Administrator explicitly diagnoses a direct SAP endpoint
- **WHEN** an administrator explicitly selects a temporarily enabled direct SAP MCP server for diagnosis
- **THEN** OpenCode follows the upstream-specific lifecycle: one same-session ADT lock/write/unlock sequence or one PyRFC connect/reuse/disconnect sequence, without mixing upstream handles into Bowi calls

### Requirement: ADT transport supports multiple MCP clients
The SAP ADT gateway SHALL use a pinned stateful Streamable HTTP transport in which every MCP session owns an isolated ADT child process and idle sessions are reclaimed.

#### Scenario: Second ADT session connects
- **WHEN** a second MCP client initializes while another ADT session is active
- **THEN** both sessions remain usable and the gateway does not terminate because a transport is already connected
