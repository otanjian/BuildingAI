## 1. Title generation and synchronization

- [x] 1.1 Add failing API tests for iframe session creation without a placeholder title and
      conditional synchronization of a generated OpenCode title.
- [x] 1.2 Implement OpenCode session snapshot/title access and synchronize a meaningful generated
      title during embed bootstrap without coupling history reads to OpenCode.
- [x] 1.3 Add failing client tests for placeholder-title polling and history refresh, then implement
      the focused embed refetch behavior.

## 2. Inline Workspace layout

- [x] 2.1 Add a failing client layout contract test for a closed-by-default, collapsible inline
      Workspace panel.
- [x] 2.2 Replace the Workspace overlay with a desktop horizontal resizable panel while preserving
      the iframe conversation instance.

## 3. Verification and deployment

- [x] 3.1 Run focused API/client tests, lint or typecheck, and production builds for affected
      packages.
- [x] 3.2 Restart the development stack and manually verify title synchronization plus inline
      Workspace behavior in a fresh OpenCode conversation.
- [x] 3.3 Validate the OpenSpec change and mark all verified tasks complete.
