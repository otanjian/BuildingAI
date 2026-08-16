## 1. Extract presentational title helper

- [x] 1.1 Add a small `AgentHistoryTitle` helper (component or pure render) with tests for: title-only when no agentName; with agentName, default visually-hidden agent name + hover-visible class; accessible text includes agent name
- [x] 1.2 Run the new test and confirm RED then GREEN after implementation

## 2. Wire into default nav history

- [x] 2.1 Use `AgentHistoryTitle` in `ConversationSubItem` (sidebar)
- [x] 2.2 Use `AgentHistoryTitle` in `HistoryCommandItem` (command dialog)
- [x] 2.3 Smoke-check: sidebar at rest shows title only; hover reveals agent name; dialog matches

## 3. Close out

- [x] 3.1 Mark OpenSpec tasks complete; `openspec validate agent-history-agent-name-on-hover`
