## 1. Startup reliability

- [x] 1.1 Inspect and update the frontend PM2/startup wrapper to resolve the current Vite executable at process start.
- [x] 1.2 Add stale-resolution checks to the frontend health verification path.

## 2. Verification

- [x] 2.1 Add a focused test or executable check covering the stale-path failure and current-path startup.
- [x] 2.2 Restart the BuildingAI web process and verify `/` and `/@vite/client` return successfully with no new Vite module errors.
