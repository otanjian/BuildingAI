/** Status values that mean the anomaly is closed / resolved. */
export const RESOLVED_ANOMALY_STATUSES = ["已解决", "ai自动修复"] as const;

export type ResolvedAnomalyStatus = (typeof RESOLVED_ANOMALY_STATUSES)[number];

export function isResolvedAnomalyStatus(status: string): boolean {
    return (RESOLVED_ANOMALY_STATUSES as readonly string[]).includes(status);
}

export function resolveTimestampForStatus(
    status: string,
    previousStatus?: string,
    previousResolvedAt?: Date | null,
): Date | null {
    if (isResolvedAnomalyStatus(status)) {
        if (isResolvedAnomalyStatus(previousStatus ?? "") && previousResolvedAt) {
            return previousResolvedAt;
        }
        return new Date();
    }
    return null;
}
