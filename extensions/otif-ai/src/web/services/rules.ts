import { consoleHttpClient } from "./base";

export type CheckRuleDto = {
    id: number;
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: string;
    autoFix: boolean;
    enabled: boolean;
};

export function listRules() {
    return consoleHttpClient.get<CheckRuleDto[]>("/rules");
}

export function createRule(body: Omit<CheckRuleDto, "id" | "ruleId">) {
    return consoleHttpClient.post<CheckRuleDto>("/rules", body);
}

export function updateRule(ruleId: string, body: Partial<CheckRuleDto>) {
    return consoleHttpClient.put<CheckRuleDto>(`/rules/${ruleId}`, body);
}

export function toggleRule(ruleId: string) {
    return consoleHttpClient.patch<CheckRuleDto>(`/rules/${ruleId}/toggle`);
}
