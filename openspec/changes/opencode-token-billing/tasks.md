## 1. Token aggregation utility

- [x] 1.1 Add `opencode-token-usage.ts` with accumulate/finalize helpers mapping OpenCode tokens → `ChatMessageUsage`
- [x] 1.2 Add unit tests for single-message, multi-assistant sum, cache/reasoning details, and empty/missing tokens

## 2. Provider wiring (usage stream + persist)

- [x] 2.1 In `OpencodeChatProvider`, accumulate tokens from assistant `message.updated` (fallback `step-finish` if needed)
- [x] 2.2 At turn end, write `data-usage` and pass `usage` into `saveMessages` / assistant message persistence
- [x] 2.3 Verify module DI still constructs `OpencodeChatProvider` after new constructor deps

## 3. Billing alignment

- [x] 3.1 Inject `AgentBillingHandler` + `AgentConfigService`; mirror Dify `getBillingRule()` for key `"opencode"`
- [x] 3.2 Pre-turn `validateUserPower` when `shouldCharge`; post-turn `deduct` and persist `userConsumedPower`
- [x] 3.3 Ensure debug / points=0 paths skip deduct but still emit usage when tokens > 0

## 4. Verification

- [x] 4.1 Run unit tests for the new token-usage util
- [ ] 4.2 Manual or integration smoke: OpenCode chat turn shows non-zero Token用量; with points>0, power decreases and MessageUsage 积分 matches
