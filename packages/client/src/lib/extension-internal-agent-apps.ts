/**
 * Extension apps that host their own agent dock in the iframe.
 * The parent /apps shell must not show the fixed right-edge AI FAB on these routes.
 *
 * Keep in sync with docs/enterprise-ai-apps-registry.json (+ ehcs-ai).
 */
export const EXTENSION_INTERNAL_AGENT_APP_IDS = new Set<string>([
    "ehcs-ai",
    "inv-opt-ai",
    "proc-audit-ai",
    "ar-risk-ai",
    "ap-opt-ai",
    "mfg-var-ai",
    "forecast-ai",
    "mdm-quality-ai",
    "asset-life-ai",
    "tax-compliance-ai",
    "otif-ai",
    "quality-rca-ai",
    "hr-compliance-ai",
    "project-health-ai",
    "energy-carbon-ai",
    "contract-ai",
    "channel-inv-ai",
    "budget-control-ai",
    "service-sla-ai",
    "fx-risk-ai",
    "esg-report-ai",
]);

export function getAppsRouteExtensionId(pathname: string): string | undefined {
    return pathname.match(/^\/apps\/([^/]+)/)?.[1];
}

export function appUsesInternalAgentDock(pathname: string): boolean {
    const id = getAppsRouteExtensionId(pathname);
    return id != null && EXTENSION_INTERNAL_AGENT_APP_IDS.has(id);
}
