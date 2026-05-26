#!/usr/bin/env node
/**
 * Validate dashboard blocks in registry and generated constants.
 * Usage: node scripts/enterprise-ai-apps/validate-dashboard-registry.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DASHBOARD_KPI_BY_APP } from "./dashboard-kpi-catalog.mjs";
import { DASHBOARD_PRESETS } from "./dashboard-presets.mjs";
import { loadRegistry, ROOT } from "./registry.mjs";

const CONST_TS = path.join(
    ROOT,
    "packages/@buildingai/constants/src/shared/enterprise-dashboard.constant.ts",
);

const METRIC_SET = new Set([
    "ruleCount",
    "enabledRules",
    "disabledRules",
    "enabledRuleShare",
    "pendingAnomalies",
    "highRiskPending",
    "healthScore",
    "autoFixRate",
    "autoFixedCount",
    "checkRunTotal",
    "checkRunsToday",
    "runningCheckRuns",
    "rcaSessions",
    "rcaToday",
    "riskHigh",
    "riskMedium",
    "riskLow",
    "domainLeadPending",
    "topRuleHits",
    "topRuleId",
    "resolvedShare",
    "aiFixShare",
    "pendingShare",
    "statusPending",
    "newAnomalies14d",
    "resolved14d",
    "batchStackDone",
    "batchStackFailed",
]);

function main() {
    const registry = loadRegistry();
    let errors = 0;
    const metricFingerprints = new Map();

    for (const app of registry.apps) {
        if (!app.dashboard) {
            console.error(`Missing dashboard block: ${app.appId}`);
            errors++;
            continue;
        }
        const d = app.dashboard;
        if (!DASHBOARD_PRESETS[app.appId]) {
            console.error(`Missing preset: ${app.appId}`);
            errors++;
        }
        const catalog = DASHBOARD_KPI_BY_APP[app.appId];
        if (!catalog || catalog.length !== 6) {
            console.error(`KPI catalog must have 6 slots: ${app.appId}`);
            errors++;
        }
        if (!d.kpis || d.kpis.length !== 6) {
            console.error(`dashboard.kpis must have 6 entries: ${app.appId}`);
            errors++;
        }
        for (const slot of d.kpis ?? []) {
            if (!METRIC_SET.has(slot.metric)) {
                console.error(`Unknown metric ${slot.metric} for ${app.appId}`);
                errors++;
            }
            if (!slot.label?.trim()) {
                console.error(`Empty KPI label for ${app.appId}`);
                errors++;
            }
        }
        const fp = d.kpis?.map((k) => k.metric).join("|") ?? "";
        if (metricFingerprints.has(fp) && metricFingerprints.get(fp) !== app.appId) {
            console.warn(
                `WARN: ${app.appId} shares same metric set as ${metricFingerprints.get(fp)}: ${fp}`,
            );
        } else {
            metricFingerprints.set(fp, app.appId);
        }
    }
    if (!fs.existsSync(CONST_TS)) {
        console.error(`Missing ${CONST_TS}`);
        errors++;
    }
    if (errors > 0) {
        process.exit(1);
    }
    console.log(`OK: ${registry.apps.length} apps, ${metricFingerprints.size} unique metric combinations.`);
}

main();
