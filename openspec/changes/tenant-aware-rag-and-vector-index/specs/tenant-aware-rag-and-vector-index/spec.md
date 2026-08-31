## Purpose

让企业知识检索在召回前遵守租户和文档 ACL，并在数据规模增长、文档撤销和嵌入模型变化时保持可扩展、可恢复和可审计。

## ADDED Requirements

### Requirement: Ingest documents with tenant and provenance metadata

The system SHALL associate every dataset, document, segment, embedding, and ingestion job with a tenant, optional project, classification, source version, parser/chunking version, checksum, and effective ACL metadata.

#### Scenario: Ingest an authorized document

- **WHEN** an authorized user uploads a document to a dataset in the current tenant
- **THEN** the system persists provenance and ACL metadata, creates an asynchronous ingestion job, and does not make incomplete segments searchable

#### Scenario: Quarantine an unsafe document

- **WHEN** an upload contains a malware signature, active macro, archive expansion above the configured limit, or a detected instruction-injection pattern
- **THEN** the document is quarantined or sanitized before parsing, is not searchable, and the uploader sees a bounded security status

#### Scenario: Reject a cross-tenant dataset upload

- **WHEN** a user submits a dataset ID belonging to another tenant
- **THEN** the system rejects the upload before storing document content or scheduling embedding work

### Requirement: Filter retrieval before ranking

The system SHALL require retrieval requests to include verified tenant, project, actor, dataset scope, query limits, and classification constraints. It SHALL filter unreadable datasets/documents/segments before vector or hybrid ranking.

#### Scenario: Retrieve only authorized content

- **WHEN** a user searches an Agent bound to datasets containing both readable and unreadable documents
- **THEN** results contain only readable segments and citations from the authorized scope

#### Scenario: Reject missing retrieval context

- **WHEN** an internal caller requests retrieval without a verified tenant or actor context
- **THEN** the system rejects the request rather than performing a global dataset search

### Requirement: Provide indexed and bounded search

The system SHALL use an indexed vector or hybrid search strategy with bounded topK, score threshold, query timeout, and result-size limits. Search behavior SHALL remain observable by tenant, dataset, index version, and retrieval stage.

#### Scenario: Search a large dataset

- **WHEN** a dataset contains more segments than the configured in-memory scan threshold
- **THEN** the system uses the configured vector/hybrid index, applies metadata filters, and returns within the retrieval timeout or a bounded error

### Requirement: Run resilient asynchronous ingestion

The system SHALL process parsing, chunking, embedding, indexing, re-embedding, and deletion as idempotent asynchronous jobs with progress, retry, pause/resume, dead-letter, and reconciliation states.

#### Scenario: Retry a failed embedding

- **WHEN** an embedding provider transiently fails for a document
- **THEN** the job retries within policy, does not create duplicate active segments, and exposes the failure and next attempt

#### Scenario: Resume an interrupted import

- **WHEN** a Worker stops after indexing half of a document batch
- **THEN** resuming the job continues from durable checkpoints and converges to one indexed version per source segment

### Requirement: Honor revocation and deletion

The system SHALL stop returning revoked or deleted content within the configured propagation window, remove or tombstone corresponding vector entries, and retain an auditable deletion result without retaining unrestricted document text.

#### Scenario: Revoke a document

- **WHEN** a dataset manager revokes a document's access
- **THEN** subsequent retrieval excludes its segments even if the vector index has not completed physical cleanup

#### Scenario: Delete a dataset

- **WHEN** an authorized tenant administrator deletes a dataset
- **THEN** active retrieval stops immediately, ingestion/deletion jobs are cancelled or tombstoned, vector entries are cleaned asynchronously, and the deletion is auditable

### Requirement: Return trustworthy citations

The system SHALL return citation metadata sufficient to identify the tenant-scoped source document, version, segment, and relevant text span after applying output redaction rules.

#### Scenario: Cite a retrieved segment

- **WHEN** an Agent uses a retrieved segment in a response
- **THEN** the runtime receives a stable citation reference and source metadata that the user is authorized to view

### Requirement: Bound untrusted document instructions

The system SHALL treat document content as untrusted reference data rather than executable instructions. Retrieved content SHALL be separated from system/tool instructions, and configured prompt-injection indicators SHALL be surfaced or filtered according to tenant policy.

#### Scenario: Ignore an instruction embedded in a document

- **WHEN** a retrieved document asks the Agent to reveal credentials or call an unrelated tool
- **THEN** the runtime does not treat that text as a higher-priority instruction, and any attempted unsafe action is denied by the tool policy

### Requirement: Fail closed when index or authorization dependencies are unavailable

The system SHALL NOT fall back to global or unfiltered retrieval when the vector index, ACL source, embedding dimension, tenant context, or classification policy is unavailable or incompatible. It SHALL return a bounded safe error or an explicitly configured no-result response.

#### Scenario: Index service is unavailable

- **WHEN** the configured vector index times out during an Agent retrieval
- **THEN** the system returns a bounded retrieval-unavailable/no-result response and does not scan all segments without ACL filtering

#### Scenario: Embedding dimension is incompatible

- **WHEN** a query embedding dimension does not match the active index version
- **THEN** the system rejects that index route, records the incompatibility, and does not mix vectors of different dimensions

### Requirement: Operate knowledge bases through the browser console

The system SHALL expose an authorized browser knowledge-base workflow for viewing dataset membership, uploading a test document, monitoring ingestion progress, previewing authorized retrieval, revoking access, and requesting deletion. The browser SHALL distinguish pending, failed, revoked, and deleted states.

#### Scenario: Verify authorized retrieval in the browser

- **WHEN** an authorized tester uploads a seeded document, waits for ingestion, opens the browser retrieval preview, and searches for a known phrase
- **THEN** the preview shows only authorized citations, ingestion/index status, and the source document/version

#### Scenario: Verify revocation and deletion in the browser

- **WHEN** the tester revokes the document and then requests deletion from the browser
- **THEN** new retrieval previews immediately exclude the document, the UI shows deletion-job progress/proof, and the document is not returned after completion

#### Scenario: Explain an index failure in the browser

- **WHEN** the seeded vector index is unavailable or incompatible and the tester opens retrieval preview
- **THEN** the browser shows a bounded unavailable/no-result state and does not expose unrelated documents
