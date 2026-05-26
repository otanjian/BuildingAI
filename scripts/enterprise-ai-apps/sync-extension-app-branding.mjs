#!/usr/bin/env node
/**
 * Sync app-center branding: semantic icons + BowiAI Teams author.
 *
 * Usage:
 *   node scripts/enterprise-ai-apps/generate-agent-avatars.mjs
 *   node scripts/enterprise-ai-apps/sync-extension-app-branding.mjs
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    buildAppCenterDescription,
    EXTENSION_AUTHOR,
    extensionAppIconPath,
} from "./agent-branding.mjs";
import { createPlatformAgentDataSource } from "./platform-agent-seed-lib.mjs";
import { loadRegistry, ROOT } from "./registry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(ROOT, ".env") });

const EXTENSIONS_JSON = path.join(ROOT, "extensions/extensions.json");

function patchManifestFile(manifestPath, app) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.icon = extensionAppIconPath(app.appId);
    manifest.author = { ...EXTENSION_AUTHOR };
    if (app.name) manifest.name = app.name;
    if (app.description) manifest.description = app.description;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 4)}\n`, "utf8");
}

function patchPackageJson(pkgPath) {
    if (!fs.existsSync(pkgPath)) return;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    pkg.author = EXTENSION_AUTHOR.name;
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 4)}\n`, "utf8");
}

async function updateDatabase(apps) {
    const ds = await createPlatformAgentDataSource(ROOT);
    await ds.initialize();
    const authorJson = JSON.stringify(EXTENSION_AUTHOR);
    let n = 0;
    for (const app of apps) {
        const rows = await ds.query(
            `UPDATE extension SET icon = $1, author = $2::jsonb, description = $3, updated_at = NOW()
             WHERE identifier = $4 RETURNING id`,
            [extensionAppIconPath(app.appId), authorJson, app.description, app.appId],
        );
        if (rows.length > 0) {
            n += rows.length;
            console.log(`DB ${app.appId}`);
        } else {
            console.log(`DB skip: ${app.appId}`);
        }
    }
    await ds.destroy();
    return n;
}

async function main() {
    const registry = loadRegistry();
    const apps = [
        {
            appId: "ehcs-ai",
            name: "EHCS数据健康自治",
            description: buildAppCenterDescription({
                appId: "ehcs-ai",
                productName: "数据健康自治",
                triggerPhrase: "开始检查",
            }),
        },
        ...registry.apps.map((a) => ({
            appId: a.appId,
            name: a.productName,
            description: buildAppCenterDescription(a),
        })),
    ];

    const configJson = JSON.parse(fs.readFileSync(EXTENSIONS_JSON, "utf8"));
    for (const app of apps) {
        const entry = configJson.applications?.[app.appId];
        if (!entry?.manifest) {
            console.warn(`Skip extensions.json: ${app.appId}`);
            continue;
        }
        entry.manifest.icon = extensionAppIconPath(app.appId);
        entry.manifest.author = { ...EXTENSION_AUTHOR };
        entry.manifest.name = app.name;
        entry.manifest.description = app.description;

        const extDir = path.join(ROOT, "extensions", app.appId);
        const manifestPath = path.join(extDir, "manifest.json");
        if (fs.existsSync(manifestPath)) {
            patchManifestFile(manifestPath, app);
        }
        patchPackageJson(path.join(extDir, "package.json"));
        console.log(`Files ${app.appId}`);
    }

    fs.writeFileSync(EXTENSIONS_JSON, `${JSON.stringify(configJson, null, 4)}\n`, "utf8");
    console.log(`Updated ${EXTENSIONS_JSON}`);

    const n = await updateDatabase(apps);
    console.log(`Database rows updated: ${n}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
