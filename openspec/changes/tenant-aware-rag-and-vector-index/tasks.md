## 1. Metadata and retrieval contract

- [x] 1.1 Add tenant/project/classification/ACL/provenance/index-version fields to dataset, document, segment, embedding, and ingestion entities.
- [x] 1.2 Define RetrievalContext/Result DTOs requiring verified actor scope, dataset scope, limits, filters, and citation metadata.
- [x] 1.3 Add service-layer checks preventing Agent bindings and retrieval from crossing tenant/project or document ACL boundaries.

## 2. Indexed search

- [x] 2.1 Implement a vector/hybrid IndexAdapter with pgvector baseline, metadata filtering, bounded topK/timeout/result size, and index metrics.
- [x] 2.2 Add embedding model/version/dimension routing, checksum deduplication, and shadow comparison against the existing retrieval implementation.
- [x] 2.3 Add citation construction, source-version validation, sensitive query redaction, and retrieval telemetry.

## 3. Resilient ingestion lifecycle

- [x] 3.1 Split parse, chunk, embed, index, re-embed, revoke, and delete into idempotent queues with progress and checkpoints.
- [x] 3.2 Add retry/backoff, dead-letter, pause/resume, reconciliation, cancellation, and operator replay controls.
- [x] 3.3 Implement immediate ACL/revocation filtering and asynchronous vector tombstone/physical cleanup with deletion evidence.
- [x] 3.4 Add upload security scanning/quarantine for malware, active content, archive expansion, and prompt-injection indicators, with safe user-facing status.

## 4. Verification and rollout

- [x] 4.1 Add cross-tenant, document-ACL, revoked-content, deletion, citation, stale-index, and missing-context tests.
- [x] 4.2 Run retrieval quality, p95 latency, ingestion throughput, re-embedding, and failure-recovery benchmarks on representative data.
- [x] 4.3 Run typecheck, lint, focused API/worker tests, migration rehearsal, and staged index cutover with rollback.
- [x] 4.4 Using browser control and resettable sanitized fixtures, verify dataset membership, safe document upload/quarantine, ingestion progress, authorized citation, embedded-instruction isolation, revoked/deleted exclusion, failed-index safe state, and no cross-ACL result.
