## 1. OpenSpec and contract

- [x] 1.1 Define and validate the iframe/session ownership contract
- [x] 1.2 Add backend tests for URL construction and session reuse/authorization

## 2. Backend session embed endpoint

- [x] 2.1 Add a protected OpenCode embed endpoint that validates the local conversation and agent
      type
- [x] 2.2 Lazily create and persist the remote OpenCode session mapping
- [x] 2.3 Return a credential-free OpenCode Web URL

## 3. BuildingAI iframe client

- [x] 3.1 Add the web service type/query for the embed contract
- [x] 3.2 Implement loading/error/retry iframe panel and conversation remount behavior
- [x] 3.3 Replace the OpenCode duplicate message/composer layout with the iframe while leaving other
      agents unchanged

## 4. Verification

- [x] 4.1 Run focused backend/client tests and type checks
- [x] 4.2 Validate OpenSpec and verify the running iframe endpoint/build output
