import { apiHttpClient } from "../base";

export type AgentReleaseEnvironment = "development" | "test" | "staging" | "production";

export type AgentVersionWorkspace = {
    versions: Array<Record<string, unknown>>;
    releases: Array<Record<string, unknown>>;
    contentReview: { status?: string; reviewedBy?: string | null; reviewedAt?: string | null; rejectReason?: string | null; label: string };
    environmentRelease: { status: string; environment: string; activeVersionId?: string | null; revision?: number | null; label: string };
};

export async function getAgentVersionWorkspace(agentId: string): Promise<AgentVersionWorkspace> {
    return apiHttpClient.get<AgentVersionWorkspace>(`/ai-agents/${agentId}/release-workspace`);
}

export async function getAgentVersionHistory(agentId: string): Promise<AgentVersionWorkspace["versions"]> {
    return apiHttpClient.get<AgentVersionWorkspace["versions"]>(`/ai-agents/${agentId}/versions`);
}

export async function createAgentVersionDraft(agentId: string, config: Record<string, unknown>, releaseNote?: string) {
    return apiHttpClient.post(`/ai-agents/${agentId}/versions/draft`, { config, releaseNote });
}

export async function submitAgentVersion(versionId: string) {
    return apiHttpClient.post(`/ai-agents/versions/${versionId}/submit`);
}

export async function evaluateAgentVersion(versionId: string, passed: boolean, evidence?: Record<string, unknown>) {
    return apiHttpClient.post(`/ai-agents/versions/${versionId}/evaluate`, { passed, evidence });
}

export async function releaseAgentVersion(versionId: string, options: { environment?: AgentReleaseEnvironment; expectedRevision?: number; idempotencyKey?: string; cohortId?: string; trafficPercent?: number } = {}) {
    return apiHttpClient.post(`/ai-agents/versions/${versionId}/release`, options);
}

export async function approveAgentRelease(releaseId: string, gateName = "default", evidence?: Record<string, unknown>) {
    return apiHttpClient.post(`/ai-agents/releases/${releaseId}/approve`, { gateName, evidence });
}

export async function rollbackAgentRelease(releaseId: string, options: { expectedRevision?: number; idempotencyKey?: string } = {}) {
    return apiHttpClient.post(`/ai-agents/releases/${releaseId}/rollback`, options);
}

export async function compareAgentVersionShadow(agentId: string) {
    return apiHttpClient.get(`/ai-agents/${agentId}/versions/shadow-compare`);
}
