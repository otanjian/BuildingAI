import { describe, expect, it } from "vitest";

import { parseCheckResponse } from "./parse-check-response";

describe("parseCheckResponse", () => {
    it("parses fenced JSON", () => {
        const text = `Analysis done.\n\`\`\`json\n{"ruleId":"MDM_001","anomalies":[]}\n\`\`\``;
        const result = parseCheckResponse(text, "MDM_001");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.anomalies).toHaveLength(0);
        }
    });

    it("fails on invalid JSON", () => {
        const result = parseCheckResponse("not json", "MDM_001");
        expect(result.ok).toBe(false);
    });

    it("parses multiple anomalies", () => {
        const payload = {
            ruleId: "MDM_002",
            anomalies: [
                {
                    anomalyId: "ANOM-1",
                    description: "d1",
                    riskLevel: "高",
                    status: "待解决",
                    autoFixed: false,
                },
                {
                    anomalyId: "ANOM-2",
                    description: "d2",
                    riskLevel: "低",
                    status: "待解决",
                },
            ],
        };
        const result = parseCheckResponse(JSON.stringify(payload), "MDM_002");
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.data.anomalies).toHaveLength(2);
        }
    });
});
