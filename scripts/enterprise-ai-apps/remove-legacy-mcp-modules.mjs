#!/usr/bin/env node
/**
 * Remove per-app *-mcp modules (ehcs-mcp, inv-opt-mcp, …). Keep bowi-mcp (ehcs-ai host) and bowi-mcp-tool-sync.
 */
import fs from "node:fs";
import path from "node:path";
import { loadRegistry, ROOT } from "./registry.mjs";

const KEEP = new Set(["bowi-mcp", "bowi-mcp-tool-sync"]);
const LEGACY_DIR = /^[a-z0-9-]+-mcp$/;

function patchAppModule(appModulePath) {
    if (!fs.existsSync(appModulePath)) return;
    let s = fs.readFileSync(appModulePath, "utf8");
    const before = s;
    s = s.replace(/import \{ \w+McpModule \} from "\.\/[^"]+-mcp\/[^"]+";\n/g, "");
    s = s.replace(/\n\s+\w+McpModule,/g, "\n");
    if (s !== before) {
        fs.writeFileSync(appModulePath, s, "utf8");
        console.log(`Patched ${appModulePath}`);
    }
}

function cleanExtension(appId) {
    const modulesDir = path.join(ROOT, "extensions", appId, "src/api/modules");
    if (!fs.existsSync(modulesDir)) return;

    for (const name of fs.readdirSync(modulesDir)) {
        if (!LEGACY_DIR.test(name) || KEEP.has(name)) continue;
        const dir = path.join(modulesDir, name);
        if (!fs.statSync(dir).isDirectory()) continue;
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`Removed ${dir}`);
    }

    patchAppModule(path.join(modulesDir, "app.module.ts"));

    const buildModules = path.join(ROOT, "extensions", appId, "build/modules");
    if (fs.existsSync(buildModules)) {
        for (const name of fs.readdirSync(buildModules)) {
            if (!LEGACY_DIR.test(name) || KEEP.has(name)) continue;
            fs.rmSync(path.join(buildModules, name), { recursive: true, force: true });
        }
    }
}

const registry = loadRegistry();
cleanExtension("ehcs-ai");
for (const app of registry.apps) {
    cleanExtension(app.appId);
}
console.log("Done removing legacy MCP modules.");
