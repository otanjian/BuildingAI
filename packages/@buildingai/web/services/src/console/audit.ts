import type { QueryOptionsUtil } from "@buildingai/web-types";
import { useQuery } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type AuditDashboardItem = { id: string; tenantId: string; action: string; outcome: string; requestId: string; correlationId: string; latencyMs: number; createdAt: string };
export type AuditDashboardResponse = {
    summary: { total: number; denied: number; failed: number; p95LatencyMs: number; alerts: Array<{ severity: string; signal: string; message: string }> };
    cost: { settled: number; reserved: number };
    page: number; pageSize: number; total: number; items: AuditDashboardItem[];
    export: { format: string; redacted: boolean; endpoint: string };
};

export function useAuditDashboardQuery(params: { tenantId?: string; page?: number; pageSize?: number; keyword?: string } = {}, options?: QueryOptionsUtil<AuditDashboardResponse>) {
    return useQuery<AuditDashboardResponse>({
        queryKey: ["audit", "dashboard", params],
        queryFn: () => consoleHttpClient.get<AuditDashboardResponse>("/audit/dashboard", { params }),
        ...options,
    });
}

export function downloadAuditExport(tenantId?: string) {
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    return consoleHttpClient.get<{ format: string; redacted: boolean; generatedAt: string; items: AuditDashboardItem[] }>(`/audit/export${query}`);
}
