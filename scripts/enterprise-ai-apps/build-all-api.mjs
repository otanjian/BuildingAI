#!/usr/bin/env node
/** Build API bundles for ehcs-ai + all enterprise extensions (needed before seed:agent). */
import { execSync } from "node:child_process";
import { loadRegistry, ROOT } from "./registry.mjs";

const ids = ["ehcs-ai", ...loadRegistry().apps.map((a) => a.appId)];
let ok = 0;
let fail = 0;
for (const id of ids) {
    try {
        execSync(`pnpm --filter ${id} build:api`, { cwd: ROOT, stdio: "inherit" });
        ok++;
    } catch {
        fail++;
        console.error(`FAIL build:api ${id}`);
    }
}
console.log(`SUMMARY build ok=${ok} fail=${fail}`);
process.exit(fail > 0 ? 1 : 0);
