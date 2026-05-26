#!/usr/bin/env node
/**
 * Sync platform-agent config / seeder / service branding across enterprise extensions.
 */
import fs from "node:fs";
import path from "node:path";
import {
    agentAvatarPath,
    buildAgentDescription,
} from "./agent-branding.mjs";
import { loadRegistry, pascalFromAppId, ROOT } from "./registry.mjs";

function patchConfig(extDir, app, acronym) {
    const prefix = app.tablePrefix.replace(/-$/, "");
    const configPath = path.join(
        extDir,
        "src/api/db/seed-data",
        `${prefix}-platform-agent.config.ts`,
    );
    if (!fs.existsSync(configPath)) return false;
    let s = fs.readFileSync(configPath, "utf8");
    const desc = buildAgentDescription(app).replace(/"/g, '\\"');
    const avatar = agentAvatarPath(app.appId);
    const descRe = new RegExp(
        `export const ${acronym}_PLATFORM_AGENT_DESCRIPTION =\\s*\\n?\\s*"[^"]*";`,
    );
    if (!descRe.test(s)) {
        console.warn(`  skip config (no DESCRIPTION): ${configPath}`);
        return false;
    }
    s = s.replace(
        descRe,
        `export const ${acronym}_PLATFORM_AGENT_DESCRIPTION =\n    "${desc}";`,
    );
    const avatarExport = `export const ${acronym}_PLATFORM_AGENT_AVATAR = "${avatar}";`;
    if (s.includes(`${acronym}_PLATFORM_AGENT_AVATAR`)) {
        s = s.replace(
            new RegExp(
                `export const ${acronym}_PLATFORM_AGENT_AVATAR = "[^"]*";`,
            ),
            avatarExport,
        );
    } else {
        s = s.replace(
            new RegExp(
                `(export const ${acronym}_PLATFORM_AGENT_DESCRIPTION =[^;]+;)`,
            ),
            `$1\n\n${avatarExport}`,
        );
    }
    fs.writeFileSync(configPath, s, "utf8");
    return true;
}

function patchSeeder(extDir, acronym) {
    const seedersDir = path.join(extDir, "src/api/db/seeds/seeders");
    if (!fs.existsSync(seedersDir)) return false;
    const file = fs
        .readdirSync(seedersDir)
        .find((f) => f.endsWith("-platform-agent.seeder.ts"));
    if (!file) return false;
    const p = path.join(seedersDir, file);
    let s = fs.readFileSync(p, "utf8");
    const imp = `${acronym}_PLATFORM_AGENT_AVATAR`;
    if (!s.includes(imp)) {
        s = s.replace(
            new RegExp(
                `(${acronym}_PLATFORM_AGENT_DESCRIPTION,\\s*\\n\\s*${acronym}_PLATFORM_AGENT_NAME,)`,
            ),
            `${imp},\n    $1`,
        );
    }
    s = s.replace(
        /avatar:\s*"\/static\/avatars\/buildingai\.png"/g,
        `avatar: ${imp}`,
    );
    if (!s.includes("agent.avatar =")) {
        s = s.replace(
            /(agent\.description = [^;]+;)/,
            `$1\n        agent.avatar = ${imp};`,
        );
    } else {
        s = s.replace(
            /agent\.avatar = [^;]+;/,
            `agent.avatar = ${imp};`,
        );
    }
    fs.writeFileSync(p, s, "utf8");
    return true;
}

function patchService(extDir, acronym) {
    const servicesDir = path.join(extDir, "src/api/modules/settings/services");
    if (!fs.existsSync(servicesDir)) return false;
    const file = fs
        .readdirSync(servicesDir)
        .find((f) => f.endsWith("-platform-agent.service.ts"));
    if (!file) return false;
    const p = path.join(servicesDir, file);
    let s = fs.readFileSync(p, "utf8");
    const imp = `${acronym}_PLATFORM_AGENT_AVATAR`;
    if (!s.includes(imp)) {
        s = s.replace(
            new RegExp(
                `(${acronym}_PLATFORM_AGENT_DESCRIPTION,\\s*\\n\\s*${acronym}_PLATFORM_AGENT_MAX_STEPS,)`,
            ),
            `${imp},\n    $1`,
        );
    }
    s = s.replace(
        /avatar:\s*"\/static\/avatars\/buildingai\.png"/g,
        `avatar: ${imp}`,
    );
    if (!s.includes("agent.avatar =")) {
        s = s.replace(
            /(agent\.description = [^;]+;)/,
            `$1\n        agent.avatar = ${imp};`,
        );
    } else {
        s = s.replace(
            /agent\.avatar = [^;]+;/,
            `agent.avatar = ${imp};`,
        );
    }
    fs.writeFileSync(p, s, "utf8");
    return true;
}

function main() {
    const filter = process.argv[2];
    const data = loadRegistry();
    patchConfig(path.join(ROOT, "extensions/ehcs-ai"), {
        appId: "ehcs-ai",
        tablePrefix: "ehcs-",
        productName: "数据健康自治",
        agentName: "EHCS数据健康自治",
        triggerPhrase: "开始检查",
    }, "EHCS");
    patchSeeder(path.join(ROOT, "extensions/ehcs-ai"), "EHCS");
    patchService(path.join(ROOT, "extensions/ehcs-ai"), "EHCS");
    console.log("ehcs-ai: config/seeder/service");

    for (const app of data.apps) {
        if (filter && app.appId !== filter) continue;
        const extDir = path.join(ROOT, "extensions", app.appId);
        if (!fs.existsSync(extDir)) continue;
        const acronym = app.acronym;
        const ok = [
            patchConfig(extDir, app, acronym),
            patchSeeder(extDir, acronym),
            patchService(extDir, acronym),
        ];
        console.log(`${app.appId}: ${ok.map((x) => (x ? "ok" : "-")).join(" ")}`);
    }
}

main();
