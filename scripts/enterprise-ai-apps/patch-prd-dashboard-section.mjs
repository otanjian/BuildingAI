#!/usr/bin/env node
/**
 * Append enterprise dashboard theme notes to PRD §3.1 for registry apps.
 */
import fs from "node:fs";
import path from "node:path";

import { DASHBOARD_PRESETS } from "./dashboard-presets.mjs";
import { loadRegistry, ROOT } from "./registry.mjs";

const MARKER = "<!-- enterprise-dashboard-theme -->";

function patchPrd(app) {
    const preset = DASHBOARD_PRESETS[app.appId];
    if (!preset) return;
    const slug = app.slug;
    const prdPath = path.join(ROOT, "docs", `PRD-${slug}.md`);
    if (!fs.existsSync(prdPath)) {
        console.log(`Skip missing ${prdPath}`);
        return;
    }
    let body = fs.readFileSync(prdPath, "utf8");
    if (body.includes(MARKER)) {
        body = body.replace(
            new RegExp(`${MARKER}[\\s\\S]*?<!-- /enterprise-dashboard-theme -->\\n?`, "m"),
            "",
        );
    }
    const d = app.dashboard;
    const kpiLine = (d.kpis ?? []).map((k) => `${k.label}（\`${k.metric}\`）`).join("、");
    const block = `${MARKER}
| 驾驶舱主题 | 模板 \`${d.template}\`；主图 \`${d.heroChart}\`；健康分文案「${d.healthScoreLabel}」 |
| KPI | ${kpiLine} |
| 实现 | 共享包 \`@buildingai/extension-dashboard\` + \`docs/enterprise-ai-apps-registry.json#dashboard\` |
<!-- /enterprise-dashboard-theme -->
`;
    const anchor = "| 布局 | **全宽** 看板";
    if (!body.includes(anchor)) {
        console.log(`No anchor in ${prdPath}`);
        return;
    }
    body = body.replace(
        anchor + "：6 KPI + 图表区 + 双表（见 V1.2.0） |",
        anchor +
            `：场景化看板（模板 **${d.template}**，6 独立 KPI 指标） |` +
            "\n" +
            block,
    );
    fs.writeFileSync(prdPath, body, "utf8");
    console.log(`Patched ${prdPath}`);
}

for (const app of loadRegistry().apps) {
    patchPrd(app);
}
