#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
    APP_BRANDING,
    EHCS_BRANDING,
    renderAgentAvatarSvg,
} from "./agent-branding.mjs";
import { ROOT } from "./registry.mjs";

const OUT_DIR = path.join(ROOT, "storage/static/avatars/enterprise");

function main() {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const entries = { ...APP_BRANDING, "ehcs-ai": EHCS_BRANDING };
    for (const [appId, meta] of Object.entries(entries)) {
        const svg = renderAgentAvatarSvg(meta.icon, meta.hue);
        const outPath = path.join(OUT_DIR, `${appId}.svg`);
        fs.writeFileSync(outPath, svg, "utf8");
        console.log(`Avatar: ${outPath}`);
    }
}

main();
