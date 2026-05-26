#!/usr/bin/env node
/**
 * Scaffold enterprise AI extensions from extensions/ehcs-ai using registry.
 * Usage: node scripts/enterprise-ai-apps/scaffold-from-ehcs.mjs [appId]
 */
import fs from "node:fs";
import path from "node:path";
import { EXTENSION_AUTHOR, extensionAppIconPath } from "./agent-branding.mjs";
import { loadRegistry, mcpPrefix, mcpServerName, pascalFromAppId, ROOT, saveRegistry } from "./registry.mjs";

const SRC = path.join(ROOT, "extensions/ehcs-ai");
const SKIP = new Set(["node_modules", ".output", "build", ".nuxt", ".git", ".turbo"]);

function buildReplacements(app) {
    const pascal = pascalFromAppId(app.appId);
    const mp = mcpPrefix(app.tablePrefix);
    const mcpSrv = mcpServerName(app.tablePrefix);
    const pairs = [
        ["EHCS数据健康自治系统", app.productNameFull],
        ["EHCS数据健康自治", app.agentName],
        ["ERP 数据健康自治系统", app.productNameFull],
        ["ERP data health autonomous system (EHCS-AI)", `${app.productNameFull} (${app.slug})`],
        ["EHCS-AI", app.slug],
        ["ehcs-ai", app.appId],
        ["ehcs_ai", app.schema],
        ["ehcs-mcp", mcpSrv],
        ["ehcs_", `${mp}_`],
        ["ehcs-", app.tablePrefix],
        ["EhcsCheckRuleCatalogEntry", `${pascal}CheckRuleCatalogEntry`],
        ["EhcsCheckRulesCatalogSeeder", `${pascal}CheckRulesCatalogSeeder`],
        ["EhcsPlatformAgentSeeder", `${pascal}PlatformAgentSeeder`],
        ["EhcsAiDataSeeder", `${pascal}AiDataSeeder`],
        ["EhcsPlatformAgentService", `${pascal}PlatformAgentService`],
        ["EhcsMcpToolDefinition", `${pascal}McpToolDefinition`],
        ["EhcsMcpModule", `${pascal}McpModule`],
        ["EhcsMcp", `${pascal}Mcp`],
        ["EhcsAi", `${pascal}Ai`],
        ["Ehcs", pascal],
        ["EHCS_", `${app.acronym}_`],
        ["EHCS", app.acronym],
        ["RULE_", `${app.rulePrefix}_`],
        ["ehcs-agent-dock-width", `${app.appId.replace(/-ai$/, "")}-agent-dock-width`],
        ["use-ehcs-", `use-${app.appId.replace(/-ai$/, "")}-`],
        ["provision-ehcs-agent", `provision-${app.appId.replace(/-ai$/, "")}-agent`],
        ["ehcs-agent-config", `${app.appId.replace(/-ai$/, "")}-agent-config`],
    ];
    return pairs.sort((a, b) => b[0].length - a[0].length);
}

function renamePathSegment(name, app) {
    const mp = mcpPrefix(app.tablePrefix);
    const mcpSrv = mcpServerName(app.tablePrefix);
    let n = name;
    n = n.replace(/ehcs-mcp/g, mcpSrv);
    n = n.replace(/ehcs-ai/g, app.appId);
    n = n.replace(/ehcs-/g, app.tablePrefix);
    n = n.replace(/ehcs_/g, `${mp}_`);
    n = n.replace(/ehcs/g, app.appId.replace(/-ai$/, "").replace(/-/g, "_"));
    return n;
}

function applyReplacements(content, pairs) {
    let s = content;
    for (const [from, to] of pairs) {
        s = s.split(from).join(to);
    }
    return s;
}

function copyDir(src, dest, app) {
    const pairs = buildReplacements(app);
    fs.mkdirSync(dest, { recursive: true });

    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (SKIP.has(entry.name)) continue;
        const srcPath = path.join(src, entry.name);
        const destName = renamePathSegment(entry.name, app);
        const destPath = path.join(dest, destName);

        if (entry.isDirectory()) {
            if (
                (entry.name.endsWith("-mcp") &&
                    entry.name !== "bowi-mcp-tool-sync" &&
                    entry.name !== "bowi-mcp") ||
                entry.name === "bowi-mcp"
            ) {
                continue;
            }
            copyDir(srcPath, destPath, app);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if ([".ts", ".tsx", ".json", ".md", ".mjs", ".html", ".css", ".yaml", ".yml"].includes(ext) || entry.name === "manifest.json") {
                const raw = fs.readFileSync(srcPath, "utf8");
                fs.writeFileSync(destPath, applyReplacements(raw, pairs), "utf8");
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}

/** Post-copy: CSS imports and hook paths must use kebab-case, not mcp underscore prefix. */
function fixWebPaths(app, dest) {
    const kebab = app.appId.replace(/-ai$/, "");
    const mp = mcpPrefix(app.tablePrefix);
    const web = path.join(dest, "src/web");
    if (!fs.existsSync(web)) return;

    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(p);
            else if (/\.(tsx?|css)$/.test(entry.name)) {
                let s = fs.readFileSync(p, "utf8");
                const orig = s;
                s = s.replaceAll(`./styles/ehcs.css`, `./styles/${mp}.css`);
                s = s.replaceAll(`use-${mp}-`, `use-${kebab}-`);
                s = s.replaceAll(`${mp}-agent-dock-width`, `${kebab}-agent-dock-width`);
                s = s.replaceAll(`--${mp}-agent-dock-width`, `--${kebab}-agent-dock-width`);
                if (s !== orig) fs.writeFileSync(p, s, "utf8");
            }
        }
    }
    walk(web);
}

function updateManifest(app, dest) {
    const manifestPath = path.join(dest, "manifest.json");
    const m = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    m.identifier = app.appId;
    m.name = app.agentName.replace(/助手$/, "");
    m.description = app.productNameFull;
    m.version = "0.1.0";
    m.icon = extensionAppIconPath(app.appId);
    m.author = { ...EXTENSION_AUTHOR };
    fs.writeFileSync(manifestPath, `${JSON.stringify(m, null, 4)}\n`, "utf8");

    const pkgPath = path.join(dest, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.name = app.appId;
    pkg.description = app.productNameFull;
    pkg.version = "0.1.0";
    pkg.author = EXTENSION_AUTHOR.name;
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`, "utf8");
}

const DASHBOARD_INDEX = `import { EnterpriseDashboard, EnterpriseDashboardLoading } from "@buildingai/extension-dashboard";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { getDashboardOverview, type DashboardOverview } from "../../services/dashboard";

const APP_ID = "__APP_ID__";

export default function DashboardPage() {
    const [data, setData] = useState<DashboardOverview | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const overview = await getDashboardOverview();
            setData(overview);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading && !data) {
        return <EnterpriseDashboardLoading message="加载驾驶舱…" />;
    }

    if (!data) {
        return <EnterpriseDashboardLoading message="暂无数据，请稍后重试" />;
    }

    return <EnterpriseDashboard appId={APP_ID} data={data} />;
}
`;

function applyEnterpriseDashboard(dest, app) {
    const cockpit = path.join(dest, "src/web/pages/dashboard/dashboard-cockpit.tsx");
    if (fs.existsSync(cockpit)) fs.unlinkSync(cockpit);
    const indexPath = path.join(dest, "src/web/pages/dashboard/index.tsx");
    fs.writeFileSync(indexPath, DASHBOARD_INDEX.replace("__APP_ID__", app.appId), "utf8");

    const pkgPath = path.join(dest, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.dependencies ??= {};
    pkg.dependencies["@buildingai/extension-dashboard"] = "workspace:*";
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`, "utf8");
}

function scaffoldApp(app) {
    const dest = path.join(ROOT, "extensions", app.appId);
    if (fs.existsSync(dest)) {
        console.log(`Skip existing ${app.appId}`);
        return;
    }
    copyDir(SRC, dest, app);
    fixWebPaths(app, dest);
    updateManifest(app, dest);
    applyEnterpriseDashboard(dest, app);
    console.log(`Scaffolded ${app.appId}`);
}

function main() {
    const data = loadRegistry();
    saveRegistry(data);
    const filter = process.argv[2];
    for (const app of data.apps) {
        if (filter && app.appId !== filter) continue;
        scaffoldApp(app);
    }
}

main();
