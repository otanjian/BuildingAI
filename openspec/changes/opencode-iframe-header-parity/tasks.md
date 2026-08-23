## 1. Contracts and regression tests

- [x] 1.1 Add failing URL/helper tests covering the explicit BuildingAI embed marker and direct-route opt-out behavior.
- [x] 1.2 Add a focused OpenCode shell test for the embed-mode predicate and update the capability contract.

## 2. BuildingAI header integration

- [x] 2.1 Extract the existing chat header controls into a reusable BuildingAI component without changing non-OpenCode behavior.
- [x] 2.2 Render the shared header above the OpenCode iframe and pass panel toggle/back/agent identity actions.
- [x] 2.3 Append the embed marker to the server-generated iframe URL and preserve credential-free URL guarantees.

## 3. OpenCode embedded shell

- [x] 3.1 Suppress the native OpenCode titlebar only when the embed marker is present, preserving direct OpenCode routes.
- [ ] 3.2 Run focused tests, client/OpenCode type checks, rebuild the OpenCode 1.18.19 binary, and restart the relevant services.
- [ ] 3.3 Browser-verify matching controls, BuildingAI-owned sidebar/back actions, iframe conversation rendering, and unchanged non-OpenCode behavior.
