## 1. Regression coverage

- [x] 1.1 Add client/service tests for the OpenCode embed query retrying transient draft
      initialization failures while preserving a bounded terminal error.
- [x] 1.2 Add route/history synchronization tests proving an accepted new conversation invalidates
      the agent conversation list and existing conversation selection remains unchanged.

## 2. New conversation initialization

- [x] 2.1 Update the OpenCode iframe session query and loading/error presentation so a just-created
      draft ID can wait through the server record/session initialization race without showing a
      false “对话不存在” state.
- [x] 2.2 Preserve stable draft IDs and explicit existing-conversation routing while ensuring
      permanent initialization failures still expose the retry action.

## 3. Live history synchronization

- [x] 3.1 Refresh the agent conversation list at the durable acceptance boundary and retain active
      turn metadata/title ordering from the server response.
- [x] 3.2 Verify the new conversation appears in the running sidebar and remains selectable while
      streaming, without a full document reload.

## 4. Verification and delivery

- [x] 4.1 Run focused client/service tests, type checks, and diff validation.
- [x] 4.2 Rebuild/restart the affected local service using the repository workflow and manually
      verify both reported bugs in the browser; record evidence.
- [x] 4.3 Validate this OpenSpec change and update completed task evidence.

## Verification evidence

- Client regression tests:
  `pnpm --dir packages/client exec vitest run src/pages/agents/_shared/history-page-overwrite.spec.ts src/pages/agents/detail/_utils/opencode-embed-bootstrap.spec.ts src/pages/agents/detail/_utils/opencode-entry-route.spec.ts`
  (17 tests passed).
- API history regression suite:
  `pnpm --dir packages/api exec jest src/modules/ai/agents/controllers/web/agent-chat-pure-history.spec.ts --runInBand`
  (10 tests passed).
- Changed client files pass targeted ESLint and `git diff --check`; the client production
  build/release completed with Node 22.22.3.
- Browser verification before and after restart: clicking “新对话” produced a new route, showed no
  “对话不存在”/OpenCode error, and increased the live sidebar “新对话” count without a document
  reload.
- `openspec validate fix-opencode-new-conversation-history --strict` passed.
