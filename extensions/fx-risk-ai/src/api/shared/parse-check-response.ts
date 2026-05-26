import { z } from "zod";

const anomalySchema = z.object({
    anomalyId: z.string().min(1),
    description: z.string().min(1),
    riskLevel: z.string().min(1),
    rootCauseAnalysis: z.string().optional(),
    solution: z.string().optional(),
    status: z.string().min(1),
    autoFixed: z.boolean().optional(),
});

const checkResponseSchema = z.object({
    ruleId: z.string().min(1),
    anomalies: z.array(anomalySchema),
});

export type ParsedCheckResponse = z.infer<typeof checkResponseSchema>;

export function extractJsonFromAssistantText(text: string): string | null {
    const trimmed = text.trim();
    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) {
        return fenceMatch[1].trim();
    }
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1);
    }
    return null;
}

export function parseCheckResponse(
    assistantText: string,
    expectedRuleId?: string,
): { ok: true; data: ParsedCheckResponse } | { ok: false; error: string } {
    const jsonText = extractJsonFromAssistantText(assistantText);
    if (!jsonText) {
        return { ok: false, error: "No JSON found in assistant response" };
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        return { ok: false, error: "Invalid JSON in assistant response" };
    }
    const result = checkResponseSchema.safeParse(parsed);
    if (!result.success) {
        return { ok: false, error: result.error.message };
    }
    if (expectedRuleId && result.data.ruleId !== expectedRuleId) {
        return {
            ok: false,
            error: `ruleId mismatch: expected ${expectedRuleId}, got ${result.data.ruleId}`,
        };
    }
    return { ok: true, data: result.data };
}
