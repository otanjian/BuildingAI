## Design

Use the existing durable turn projection JSON as the refresh-safe storage boundary. Extend the projection with an optional sanitized `pendingQuestion` object, return it as a dedicated status field, and keep the worker/reconciler lease model unchanged. The worker records the question while it is pending and records `null` when OpenCode consumes it.

Reply/reject endpoints are owner-authorized through the existing acceptance service. They lock the turn, verify that it is active and that the request id matches the persisted pending question, then call the OpenCode question endpoint. The worker remains responsible for observing and settling the turn.

The client stores the status question alongside the durable conversation entry. A shared React question card is mounted by both chat surfaces and calls the corresponding authenticated/public transport. The card does not submit a new chat turn; it only resolves the server-owned pending request.

Legacy streaming compatibility uses the existing agent-chat conversation metadata as its refresh-safe boundary. When the OpenCode event stream emits `question.asked`, the provider emits a typed UI data event and persists a sanitized pending question in the conversation metadata. Legacy reply/reject endpoints authorize the conversation owner, call the OpenCode question endpoint for the stored session, and clear the metadata after the remote operation succeeds. The detail and public stream hooks hydrate this metadata and feed the same shared question card, so a page refresh does not turn the question into an orphaned `Running` tool row.

The legacy bridge also accepts OpenCode v2 question event names and SSE envelopes that put the
payload under `data` instead of `properties`. Historical `question` tool parts are filtered from
the generic message/tool presentation because the structured question card owns that interaction.
