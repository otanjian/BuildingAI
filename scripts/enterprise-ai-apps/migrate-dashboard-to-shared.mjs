#!/usr/bin/env node
/**
 * Point enterprise extensions at @buildingai/extension-dashboard (excludes ehcs-ai).
 * Usage: node scripts/enterprise-ai-apps/migrate-dashboard-to-shared.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { loadRegistry, ROOT } from "./registry.mjs";

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
        return (
            <EnterpriseDashboardLoading message="暂无数据，请稍后重试" />
        );
    }

    return <EnterpriseDashboard appId={APP_ID} data={data} />;
}
`;

function patchPackageJson(pkgPath) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.dependencies ??= {};
    if (!pkg.dependencies["@buildingai/extension-dashboard"]) {
        pkg.dependencies["@buildingai/extension-dashboard"] = "workspace:*";
    }
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`, "utf8");
}

function patchMainCss(cssPath, prefix) {
    if (!fs.existsSync(cssPath)) return;
    let css = fs.readFileSync(cssPath, "utf8");
    css = css.replace(/@import "@buildingai\/extension-dashboard\/styles\.css";\s*\n?/g, "");
    const rootMatch = css.match(/:root\s*\{[^}]*\}/s);
    if (rootMatch && !css.includes("--dash-primary:")) {
        const hueVar = `--${prefix.replace(/-$/, "")}-blue`;
        const inject = `
  --dash-primary: var(${hueVar}, hsl(199 72% 42%));
  --dash-primary-muted: color-mix(in srgb, var(--dash-primary) 12%, white);
  --dash-primary-dark: color-mix(in srgb, var(--dash-primary) 85%, black);
`;
        css = css.replace(/:root\s*\{/, `:root {${inject}`);
    }
    fs.writeFileSync(cssPath, css, "utf8");
}

function main() {
    const apps = loadRegistry().apps;
    for (const app of apps) {
        const extDir = path.join(ROOT, "extensions", app.appId);
        if (!fs.existsSync(extDir)) {
            console.log(`Skip missing ${app.appId}`);
            continue;
        }
        const dashDir = path.join(extDir, "src/web/pages/dashboard");
        const cockpitPath = path.join(dashDir, "dashboard-cockpit.tsx");
        if (fs.existsSync(cockpitPath)) {
            fs.unlinkSync(cockpitPath);
            console.log(`Removed ${cockpitPath}`);
        }
        const indexPath = path.join(dashDir, "index.tsx");
        const content = DASHBOARD_INDEX.replace("__APP_ID__", app.appId);
        fs.writeFileSync(indexPath, content, "utf8");
        console.log(`Wrote ${indexPath}`);

        patchPackageJson(path.join(extDir, "package.json"));

        const cssName = app.appId.replace(/-ai$/, "").replace(/-/g, "_");
        const cssCandidates = [
            path.join(extDir, `src/web/styles/${cssName}.css`),
            path.join(extDir, `src/web/styles/${app.appId.replace(/-ai$/, "")}.css`),
        ];
        for (const cssPath of cssCandidates) {
            if (fs.existsSync(cssPath)) {
                patchMainCss(cssPath, app.tablePrefix);
                console.log(`Patched ${cssPath}`);
                break;
            }
        }
    }
    console.log(`Done. Migrated ${apps.length} extensions.`);
}

main();
