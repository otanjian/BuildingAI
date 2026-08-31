## 1. Configuration

- [x] 1.1 Enable `BOWI_SAP_ADT_SERVICE_PROFILE_ENABLED=true` in the ignored local root environment used by `start.sh`.
- [x] 1.2 Confirm `.env.example` and production defaults remain disabled and document the local-only setting.

## 2. Regression coverage

- [x] 2.1 Add a Bowi SAP provider/adapter test that invokes a curated ADT read tool with the service profile enabled and verifies the upstream call.
- [x] 2.2 Run the focused API tests and strict OpenSpec validation.

## 3. Live verification

- [x] 3.1 Restart the API stack so it loads the updated environment.
- [x] 3.2 Invoke `sap_search_objects` through Bowi with a verified session and confirm the response is no longer `ADT service profile is disabled`.
