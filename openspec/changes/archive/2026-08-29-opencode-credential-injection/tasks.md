## 1. BuildingAI credential bridge (TDD)

- [x] 1.1 Add failing unit tests for password extraction, masked values, and safe overrides.
- [x] 1.2 Implement personal-parameter credential extraction and session-scoped resolution service.
- [x] 1.3 Add the authenticated internal API endpoint and conversation/session lookup tests.

## 2. OpenCode execution integration (TDD)

- [x] 2.1 Add failing tests for SAP tool detection, injection, preservation, and fail-open behavior.
- [x] 2.2 Implement the OpenCode MCP execution wrapper and internal API client.
- [x] 2.3 Configure the local runtime bridge and rebuild the managed OpenCode binary.

## 3. Verification

- [x] 3.1 Run focused tests, API/OpenCode type checks, and repository validation.
- [x] 3.2 Restart the local stack and verify the local bridge is active in a fresh OpenCode runtime.

## 4. Model decision policy follow-up (TDD)

- [x] 4.1 Add failing tests for managed-credential system instructions and optional SAP password schema.
- [x] 4.2 Implement the dynamic BuildingAI credential instruction for new and existing sessions.
- [x] 4.3 Adapt only the SAP connection tool schema while preserving execution-time injection.
- [x] 4.4 Rebuild OpenCode 1.18.19, restart the stack, and verify a fresh turn calls `sap_connect` without a password question.
