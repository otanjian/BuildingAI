export type PendingRiskCounts = { high: number; medium: number; low: number };

export function computeHealthScore(counts: PendingRiskCounts): number {
    const score = 100 - (counts.high * 10 + counts.medium * 5 + counts.low * 2);
    return Math.max(0, Number(score.toFixed(1)));
}

export function countPendingByRisk(
    rows: Array<{ riskLevel: string; status: string }>,
): PendingRiskCounts {
    const pending = rows.filter((r) => r.status === "待解决");
    return {
        high: pending.filter((r) => r.riskLevel === "高").length,
        medium: pending.filter((r) => r.riskLevel === "中").length,
        low: pending.filter((r) => r.riskLevel === "低").length,
    };
}
