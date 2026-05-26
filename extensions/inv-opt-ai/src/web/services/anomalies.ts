import { consoleHttpClient } from "./base";

export type CheckResultDto = {
    id: number;
    anomalyId: string;
    ruleId: string;
    description: string;
    riskLevel: string;
    rootCause: string | null;
    solution: string | null;
    status: string;
    autoFixed: boolean;
    checkTime: string;
    createTime: string;
    resolvedAt: string | null;
};

export function listAnomalies(params?: { risk?: string; status?: string }) {
    return consoleHttpClient.get<CheckResultDto[]>("/anomalies", { params });
}

export function getAnomaly(anomalyId: string) {
    return consoleHttpClient.get<CheckResultDto>(`/anomalies/${anomalyId}`);
}

export function updateAnomalyStatus(anomalyId: string, status: string) {
    return consoleHttpClient.patch<CheckResultDto>(`/anomalies/${anomalyId}/status`, { status });
}

export function createRcaSession(anomalyId: string) {
    return consoleHttpClient.post<{ sessionId: number; anomalyId: string }>(
        `/rca/anomalies/${anomalyId}/sessions`,
    );
}
