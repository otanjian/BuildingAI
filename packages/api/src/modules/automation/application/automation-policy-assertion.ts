import { createHmac } from "node:crypto";

import type { UnattendedToolPolicy } from "../domain/automation.types";

function signingSecret(): string {
    return process.env.JWT_SECRET?.trim() || "BuildingAI";
}

export function signAutomationPolicy(runId: string, policy: UnattendedToolPolicy): string {
    return createHmac("sha256", signingSecret())
        .update(`${runId}.${JSON.stringify(policy)}`)
        .digest("hex");
}

export function verifyAutomationPolicy(
    runId: string | undefined,
    policy: unknown,
    signature: unknown,
): boolean {
    if (!runId || !signature || !policy || typeof policy !== "object") return false;
    const expected = signAutomationPolicy(runId, policy as UnattendedToolPolicy);
    const provided = String(signature);
    return (
        provided.length === expected.length &&
        createHmac("sha256", signingSecret())
            .update(`${runId}.${JSON.stringify(policy)}`)
            .digest("hex") === provided
    );
}
