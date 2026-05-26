import { describe, expect, it } from "vitest";

import type { CheckResult } from "../../../db/entities/check-result.entity";
import type { CheckRule } from "../../../db/entities/check-rule.entity";
import {
    buildAnomalyTrendSeries,
    buildStatusDistribution,
    buildSummaryMetrics,
    buildTopRules,
} from "./dashboard-metrics";

function result(partial: Partial<CheckResult> & Pick<CheckResult, "anomalyId" | "ruleId">): CheckResult {
    return {
        id: 1,
        description: "d",
        riskLevel: "中",
        rootCause: null,
        solution: null,
        status: "待解决",
        autoFixed: false,
        checkTime: new Date("2026-05-20T10:00:00"),
        createTime: new Date("2026-05-20T10:00:00"),
        resolvedAt: null,
        ...partial,
    } as CheckResult;
}

describe("dashboard-metrics", () => {
    it("buildSummaryMetrics computes health score delta", () => {
        const rules = [
            { ruleId: "R1", enabled: true },
            { ruleId: "R2", enabled: false },
        ] as CheckRule[];
        const results = [
            result({ anomalyId: "A1", ruleId: "R1", riskLevel: "高", createTime: new Date("2020-01-01") }),
            result({ anomalyId: "A2", ruleId: "R1", riskLevel: "低", createTime: new Date() }),
        ];
        const summary = buildSummaryMetrics(rules, results, [], []);
        expect(summary.ruleCount).toBe(2);
        expect(summary.enabledRuleCount).toBe(1);
        expect(summary.pendingAnomalyCount).toBe(2);
        expect(summary.healthScore).toBe(88);
    });

    it("buildAnomalyTrendSeries counts new and resolved per day", () => {
        const today = new Date();
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const results = [
            result({
                anomalyId: "N1",
                ruleId: "R1",
                createTime: today,
                resolvedAt: today,
                status: "已解决",
            }),
        ];
        const series = buildAnomalyTrendSeries(results, 3);
        const todayPoint = series.find((p) => p.date === todayKey);
        expect(todayPoint?.newCount).toBe(1);
        expect(todayPoint?.resolvedCount).toBe(1);
    });

    it("buildTopRules returns sorted top N", () => {
        const results = [
            result({ anomalyId: "A1", ruleId: "INV_A" }),
            result({ anomalyId: "A2", ruleId: "INV_B" }),
            result({ anomalyId: "A3", ruleId: "INV_A" }),
        ];
        expect(buildTopRules(results, 2)).toEqual([
            { ruleId: "INV_A", count: 2 },
            { ruleId: "INV_B", count: 1 },
        ]);
    });

    it("buildStatusDistribution groups by status", () => {
        const results = [
            result({ anomalyId: "A1", ruleId: "R", status: "待解决" }),
            result({ anomalyId: "A2", ruleId: "R", status: "已解决" }),
            result({ anomalyId: "A3", ruleId: "R", status: "ai自动修复" }),
        ];
        expect(buildStatusDistribution(results)).toEqual({
            pending: 1,
            resolved: 1,
            aiAutoFixed: 1,
        });
    });
});
