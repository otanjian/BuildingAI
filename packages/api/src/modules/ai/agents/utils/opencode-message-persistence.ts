import type { ChatMessageUsage, ChatUIMessage } from "@buildingai/types";

import type { SensitiveWordFilter } from "./sensitive-word-filter";
import { projectAssistantParts } from "./sensitive-word-projector";
import { sanitizeOpencodeMessageForPersistence } from "./opencode-message-sanitizer";

export function prepareOpencodeAssistantMessageForPersistence(
    responseMessage: ChatUIMessage,
    sensitiveWordFilter: SensitiveWordFilter,
    usage?: ChatMessageUsage,
    userConsumedPower?: number,
): ChatUIMessage {
    return sanitizeOpencodeMessageForPersistence({
        ...responseMessage,
        parts: projectAssistantParts(
            responseMessage.parts as Record<string, any>[],
            sensitiveWordFilter,
            sensitiveWordFilter.policy.applyToReasoning,
        ),
        ...(usage ? { usage } : {}),
        ...(userConsumedPower != null ? { userConsumedPower } : {}),
    } as ChatUIMessage);
}

export async function persistOpencodeAssistantMessageSafely(params: {
    persist: () => Promise<void>;
    markFailure: () => Promise<void>;
}): Promise<{ persisted: true } | { persisted: false; error: unknown }> {
    try {
        await params.persist();
        return { persisted: true };
    } catch (error) {
        try {
            await params.markFailure();
        } catch {
            // The original persistence failure is the useful signal; callers
            // still receive a terminal failure even if metadata is unavailable.
        }
        return { persisted: false, error };
    }
}
