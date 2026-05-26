import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "../..");
export const REGISTRY_PATH = path.join(ROOT, "docs/enterprise-ai-apps-registry.json");

export function loadRegistry() {
    const raw = fs.readFileSync(REGISTRY_PATH, "utf8");
    const data = JSON.parse(raw);
    for (const app of data.apps) {
        if (app.seedRuleCount < 30) app.seedRuleCount = 30;
    }
    return data;
}

export function mcpPrefix(tablePrefix) {
    return tablePrefix.replace(/-$/, "").replace(/-/g, "_");
}

export function mcpServerName(tablePrefix) {
    return `${tablePrefix.replace(/-$/, "")}-mcp`;
}

/** InvOpt from inv-opt-ai */
export function pascalFromAppId(appId) {
    const base = appId.replace(/-ai$/, "");
    return base
        .split("-")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("");
}

export function saveRegistry(data) {
    fs.writeFileSync(REGISTRY_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
