import type { UIMessage } from "ai";

type MessagePart = UIMessage["parts"][number] & Record<string, any>;

function isToolPart(part: MessagePart): boolean {
    return (
        typeof part.type === "string" &&
        (part.type.startsWith("tool-") || part.type === "dynamic-tool") &&
        typeof part.toolCallId === "string"
    );
}

export function mergeApprovalDecisions(persisted: UIMessage, client: UIMessage): UIMessage {
    if (persisted.id !== client.id || persisted.role !== "assistant" || client.role !== "assistant") {
        throw new Error("approval_continuation_message_mismatch");
    }

    const clientToolParts = new Map(
        (client.parts as MessagePart[])
            .filter(isToolPart)
            .map((part) => [part.toolCallId as string, part]),
    );
    const parts = (persisted.parts as MessagePart[]).map((part) => {
        if (!isToolPart(part) || part.state !== "approval-requested") return part;
        const decision = clientToolParts.get(part.toolCallId as string);
        if (!decision || decision.state !== "approval-responded" || !decision.approval) return part;
        return {
            ...part,
            state: "approval-responded",
            approval: decision.approval,
        };
    });
    return { ...persisted, parts } as UIMessage;
}

function stableDisplayPart(part: MessagePart): boolean {
    return !isToolPart(part);
}

export function mergeTrustedApprovalContinuation(
    persisted: UIMessage,
    completed: UIMessage,
): {
    trustedParts: MessagePart[];
    appendedParts: MessagePart[];
    mergedParts: MessagePart[];
} {
    if (persisted.id !== completed.id || completed.role !== "assistant") {
        throw new Error("approval_continuation_message_mismatch");
    }
    const trustedParts = persisted.parts as MessagePart[];
    const completedParts = completed.parts as MessagePart[];
    if (completedParts.length < trustedParts.length) {
        throw new Error("approval_continuation_prefix_mismatch");
    }

    const mergedPrefix = trustedParts.map((trusted, index) => {
        const candidate = completedParts[index];
        if (!candidate || candidate.type !== trusted.type) {
            throw new Error("approval_continuation_prefix_mismatch");
        }
        if (stableDisplayPart(trusted)) {
            if (JSON.stringify(candidate) !== JSON.stringify(trusted)) {
                throw new Error("approval_continuation_prefix_mismatch");
            }
            return trusted;
        }
        if (candidate.toolCallId !== trusted.toolCallId) {
            throw new Error("approval_continuation_prefix_mismatch");
        }
        return candidate;
    });
    const appendedParts = completedParts.slice(trustedParts.length);
    return { trustedParts, appendedParts, mergedParts: [...mergedPrefix, ...appendedParts] };
}
