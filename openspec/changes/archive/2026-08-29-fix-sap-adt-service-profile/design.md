## Context

The Bowi ADT adapter already enforces subject verification and delegates to the stateful ADT MCP gateway. Its service-profile guard is intentionally strict, but `start.sh` loads the root `.env`, and the local `.env` currently omits the ADT switch. The upstream ADT process has its own gitignored credentials and is already healthy.

## Goals / Non-Goals

**Goals:**

- Make the local development stack's configured ADT service profile available to Bowi.
- Preserve explicit opt-in, verified-subject, capability, and upstream-health checks.
- Keep production defaults disabled.
- Cover both enabled and disabled guard behavior with tests.

**Non-Goals:**

- Do not change ADT authentication, TLS handling, or the upstream MCP runtime.
- Do not add per-user ADT credential routing.
- Do not enable the service profile in `.env.example` or production configuration.

## Decisions

1. **Set the switch only in the ignored root `.env`.** `start.sh` already exports root environment values to the API process. This fixes the local deployment without changing the secure default in `.env.example`.
2. **Retain the existing guard.** The API must continue rejecting missing subjects and disabled profiles. The fix is configuration plus regression coverage, not weakening authorization.
3. **Test at the provider/adapter boundary.** A unit test will prove a curated ADT call reaches the adapter when enabled, while the profile-service test continues to prove the disabled error. This catches both configuration wiring and behavior.

## Risks / Trade-offs

- [A shared technical ADT identity is used for local calls] → Keep the switch local-only and continue requiring a verified Bowi subject and capability.
- [A local `.env` change is not committed] → Document the required setting and verify the running process; deployment environments must set the variable explicitly.
- [Restarted API processes may retain old environment] → Restart the API after changing `.env` and perform a live Bowi call.

## Migration Plan

1. Add `BOWI_SAP_ADT_SERVICE_PROFILE_ENABLED=true` to the local root `.env`.
2. Add/update unit coverage and run the API test suite.
3. Restart the API, call the curated ADT search tool through Bowi, and confirm the upstream log records the request.
4. Roll back by removing the local variable or setting it to `false`; the guard then returns the stable profile-required error.
