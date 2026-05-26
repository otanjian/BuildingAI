/**
 * Per-app agent list branding: descriptions (no product vendor name) and avatar paths.
 */
import { AGENT_DESCRIPTION_BY_APP, APP_CENTER_DESCRIPTION_BY_APP } from "./app-center-copy.mjs";
import { loadRegistry, ROOT } from "./registry.mjs";

/** Application center / manifest author (all enterprise apps). */
export const EXTENSION_AUTHOR = {
    name: "BowiAI Teams",
    avatar: "/static/avatars/bowiai-teams.svg",
    homepage: "",
};

/** BowiAI Agent platform (agent plaza / master entry). */
export const BOWI_AGENT_PLATFORM = {
    name: "BowiAI Agent平台",
    avatar: "/static/avatars/bowiai-agent-platform.svg",
};

/** @param {string} appId */
export function extensionAppIconPath(appId) {
    return `/static/avatars/enterprise/${appId}.svg`;
}

/** @type {Record<string, { label: string, hue: number, icon: string }>} */
export const EHCS_BRANDING = {
    label: "数据健康",
    hue: 199,
    icon: "data-health",
};

/** @type {Record<string, { label: string, hue: number, icon: string }>} */
export const APP_BRANDING = {
    "inv-opt-ai": { label: "库存优化", hue: 217, icon: "inventory" },
    "proc-audit-ai": { label: "采购合规", hue: 152, icon: "audit" },
    "ar-risk-ai": { label: "应收账款风控", hue: 32, icon: "receivable" },
    "ap-opt-ai": { label: "应付账款", hue: 262, icon: "payable" },
    "mfg-var-ai": { label: "生产成本", hue: 0, icon: "manufacturing" },
    "forecast-ai": { label: "销售预测", hue: 187, icon: "forecast" },
    "mdm-quality-ai": { label: "主数据质量", hue: 239, icon: "master-data" },
    "asset-life-ai": { label: "固定资产", hue: 84, icon: "asset" },
    "tax-compliance-ai": { label: "税务合规", hue: 28, icon: "tax" },
    "otif-ai": { label: "供应链交付", hue: 201, icon: "delivery" },
    "quality-rca-ai": { label: "质量追溯", hue: 343, icon: "quality" },
    "hr-compliance-ai": { label: "人力合规", hue: 271, icon: "hr" },
    "project-health-ai": { label: "项目交付", hue: 174, icon: "project" },
    "energy-carbon-ai": { label: "能源碳排", hue: 142, icon: "energy" },
    "contract-ai": { label: "合同履约", hue: 231, icon: "contract" },
    "channel-inv-ai": { label: "渠道库存", hue: 38, icon: "channel" },
    "budget-control-ai": { label: "预算执行", hue: 172, icon: "budget" },
    "service-sla-ai": { label: "售后 SLA", hue: 213, icon: "service" },
    "fx-risk-ai": { label: "外汇风险", hue: 258, icon: "fx" },
    "esg-report-ai": { label: "ESG 披露", hue: 128, icon: "esg" },
    "ehcs-ai": EHCS_BRANDING,
};

/**
 * ~40 chars for app center card subtitle (extension.description).
 * @param {{ appId?: string, productName?: string, agentName?: string, triggerPhrase?: string }} app
 */
export function buildAppCenterDescription(app) {
    const appId = app.appId;
    if (appId && APP_CENTER_DESCRIPTION_BY_APP[appId]) {
        return APP_CENTER_DESCRIPTION_BY_APP[appId];
    }
    const branding = appId ? APP_BRANDING[appId] : null;
    const focus =
        branding?.label ??
        app.productName?.replace(/自治$/, "").trim() ??
        app.agentName?.replace(/自治助手$/, "").trim() ??
        "业务";
    return `面向 ERP ${focus}场景的智能巡检与异常分析，支持规则校验与根因会话。`;
}

/**
 * @param {{ appId?: string, productName?: string, agentName?: string, triggerPhrase?: string }} app
 */
export function buildAgentDescription(app) {
    const appId = app.appId;
    if (appId && AGENT_DESCRIPTION_BY_APP[appId]) {
        return AGENT_DESCRIPTION_BY_APP[appId];
    }
    const branding = appId ? APP_BRANDING[appId] : null;
    const focus =
        branding?.label ??
        app.productName?.replace(/自治$/, "").trim() ??
        app.agentName?.replace(/自治助手$/, "").trim() ??
        "业务";
    return `面向企业 ERP 的${focus}场景，提供规则驱动检查、异常诊断与根因分析，支持 MCP 校验与结构化落库。`;
}

/**
 * @param {string} appId
 */
export function agentAvatarPath(appId) {
    return `/static/avatars/enterprise/${appId}.svg`;
}

/**
 * @param {string} icon
 * @param {number} hue
 */
export function renderAgentAvatarSvg(icon, hue) {
    const bg1 = `hsl(${hue} 72% 42%)`;
    const bg2 = `hsl(${(hue + 24) % 360} 68% 28%)`;
    const glyph = GLYPHS[icon] ?? GLYPHS["data-health"];
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#g)"/>
  <g fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    ${glyph}
  </g>
</svg>
`;
}

const GLYPHS = {
    "data-health": `
    <path d="M12 42 L20 28 L30 36 L42 20 L52 30" stroke-width="2.4"/>
    <rect x="14" y="44" width="36" height="4" rx="2" fill="#fff" stroke="none" opacity="0.85"/>`,
    inventory: `
    <path d="M16 26 L32 16 L48 26 V42 L32 52 L16 42 Z" />
    <path d="M32 16 V32 M16 26 L32 32 L48 26" />`,
    audit: `
    <rect x="18" y="14" width="28" height="36" rx="3" />
    <path d="M24 24 h16 M24 30 h12 M24 36 h16" />
    <path d="M38 44 l6 6" stroke-width="2.6" />`,
    receivable: `
    <path d="M20 22 h24 v20 H20 Z" />
    <path d="M26 28 h12 M26 34 h8" />
    <path d="M32 14 v6 M28 17 h8" />`,
    payable: `
    <rect x="16" y="20" width="32" height="22" rx="4" />
    <path d="M22 30 h20 M22 36 h12" />
    <circle cx="44" cy="18" r="4" />`,
    manufacturing: `
    <path d="M14 40 h12 l4-10 6 14 4-8 10 4 v10 H14 Z" />
    <path d="M20 18 h8 v8 h-8 Z" />`,
    forecast: `
    <path d="M14 42 V22 M50 42 V18" opacity="0.5" stroke-width="1.8"/>
    <path d="M16 36 L28 28 L38 32 L48 20" stroke-width="2.6" />`,
    "master-data": `
    <ellipse cx="32" cy="20" rx="14" ry="5" />
    <path d="M18 20 v16 c0 3 6 5 14 5s14-2 14-5 V20" />
    <path d="M18 28 c0 3 6 5 14 5s14-2 14-5" />`,
    asset: `
    <path d="M18 44 V28 l14-10 14 10 v16" />
    <rect x="26" y="32" width="12" height="12" rx="1" />`,
    tax: `
    <path d="M22 18 h20 l-4 28 H26 Z" />
    <path d="M24 26 h16 M24 32 h12" />`,
    delivery: `
    <path d="M12 34 h26 l6-8 h8 v8 H12 Z" />
    <circle cx="20" cy="42" r="3" fill="#fff" stroke="none"/>
    <circle cx="40" cy="42" r="3" fill="#fff" stroke="none"/>`,
    quality: `
    <circle cx="28" cy="28" r="10" />
    <path d="M36 36 L48 48" stroke-width="2.8" />
    <path d="M24 28 h8 M28 24 v8" stroke-width="1.8" opacity="0.9"/>`,
    hr: `
    <circle cx="32" cy="22" r="6" />
    <path d="M18 46 c2-8 8-12 14-12s12 4 14 12" />
    <path d="M40 30 l8 6" opacity="0.85"/>`,
    project: `
    <path d="M16 20 h8 v24 h-8 Z M28 26 h8 v18 h-8 Z M40 16 h8 v28 h-8 Z" />`,
    energy: `
    <path d="M32 14 c-10 12-2 18 0 26 c8-6 10-14 0-26 Z" fill="#fff" stroke="none" opacity="0.95"/>
    <path d="M18 44 c6-4 22-4 28 0" />`,
    contract: `
    <path d="M20 16 h24 v32 H20 Z" />
    <path d="M26 24 h12 M26 30 h16 M26 36 h10" />
    <path d="M38 16 v8 l6-4" />`,
    channel: `
    <circle cx="32" cy="32" r="6" />
    <path d="M32 18 v6 M32 40 v6 M18 32 h6 M40 32 h6 M22 22 l4 4 M38 38 l4 4 M42 22 l-4 4 M26 38 l-4 4" />`,
    budget: `
    <path d="M32 16 v32" opacity="0.4" stroke-width="1.6"/>
    <path d="M32 32 L20 40 A18 18 0 0 1 32 16 A14 14 0 0 0 44 38 Z" fill="#fff" stroke="none" opacity="0.9"/>
    <circle cx="32" cy="32" r="3" fill="#0f766e" stroke="none"/>`,
    service: `
    <path d="M20 26 c0-8 24-8 24 0 v10 c0 10-12 16-12 16s-12-6-12-16V26" />
    <path d="M24 44 h16 M32 44 v4" stroke-width="2"/>`,
    fx: `
    <path d="M18 24 h16 M30 40 H46" />
    <path d="M30 24 L42 16 M30 40 L18 48" stroke-width="2.4" />`,
    esg: `
    <circle cx="32" cy="32" r="12" opacity="0.35" stroke-width="1.6"/>
    <path d="M32 18 v6 M28 20 c-6 4-6 14 0 18 c6 4 14 4 20 0" fill="#fff" stroke="none" opacity="0.9"/>
    <path d="M22 40 c4-8 20-8 20 0" />`,
    platform: `
    <circle cx="32" cy="34" r="7.5"/>
    <circle cx="32" cy="16" r="4"/>
    <circle cx="48" cy="26" r="4"/>
    <circle cx="44" cy="44" r="4"/>
    <circle cx="20" cy="44" r="4"/>
    <circle cx="16" cy="26" r="4"/>
    <path d="M32 26.5 V16 M32 41.5 V44 M38.5 29.5 L44 26 M25.5 29.5 L20 26 M36.5 38.5 L41 41 M27.5 38.5 L23 41"/>
    <path d="M46 14 l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2 Z" fill="#fff" stroke="none" opacity="0.95"/>
    <circle cx="29" cy="33" r="1.1" fill="#fff" stroke="none"/>
    <circle cx="35" cy="33" r="1.1" fill="#fff" stroke="none"/>
    <path d="M28.5 37.5 Q32 39.5 35.5 37.5" stroke-width="1.6" opacity="0.9"/>`,
};

export function listBrandedAppIds() {
    return Object.keys(APP_BRANDING);
}

export function getRegistryApps() {
    return loadRegistry().apps;
}
