import { consoleHttpClient } from "./base";

export type CheckRunItemDto = {
    id: number;
    runId: number;
    ruleId: string;
    status: string;
    conversationId: string | null;
    errorMessage: string | null;
};

export function startCheckRun() {
    return consoleHttpClient.post<{ runId: number; items: CheckRunItemDto[] }>("/check-runs");
}

export type IngestResult =
    | { ok: true; anomalyCount: number }
    | { ok: false; error: string };

export function ingestRuleResult(
    runId: number,
    ruleId: string,
    body: { assistantText: string; conversationId?: string },
) {
    return consoleHttpClient.post<IngestResult>(`/check-runs/${runId}/items/${ruleId}/ingest`, body);
}
