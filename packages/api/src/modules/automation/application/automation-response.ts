export type ParsedAutomationAgentResponse = {
    answer: string;
    conversationId?: string;
    error?: string;
};

/** Parse both blocking JSON and UI-message SSE responses from the agent chat endpoint. */
export function parseAutomationAgentResponse(
    raw: string,
    contentType = "",
): ParsedAutomationAgentResponse {
    const isSse = contentType.toLocaleLowerCase().includes("text/event-stream") ||
        /^\s*data:\s*/.test(raw);
    if (!isSse) {
        const body = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
        const data = (body.data && typeof body.data === "object" ? body.data : body) as Record<
            string,
            unknown
        >;
        return {
            answer: String(data.answer || data.content || "").slice(0, 12_000),
            ...(typeof data.conversationId === "string"
                ? { conversationId: data.conversationId }
                : {}),
            ...(typeof data.message === "string" ? { error: data.message } : {}),
        };
    }

    let answer = "";
    let conversationId: string | undefined;
    let error: string | undefined;
    for (const line of raw.split(/\r?\n/)) {
        const match = line.match(/^data:\s*(.+)$/);
        if (!match || match[1] === "[DONE]") continue;
        let event: Record<string, unknown>;
        try {
            event = JSON.parse(match[1]) as Record<string, unknown>;
        } catch {
            continue;
        }
        if (event.type === "text-delta" && typeof event.delta === "string") answer += event.delta;
        if (event.type === "data-conversation-id" && typeof event.data === "string") {
            conversationId = event.data;
        }
        if (event.type === "error") {
            error = String(event.errorText || event.message || event.error || "Agent stream failed");
        }
    }
    return {
        answer: answer.slice(0, 12_000),
        ...(conversationId ? { conversationId } : {}),
        ...(error ? { error } : {}),
    };
}
