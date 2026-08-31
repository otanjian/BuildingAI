export interface PublishedAgentStreamEvent {
    type?: string;
    delta?: string;
    data?: string;
    [key: string]: unknown;
}

export interface PublishedAgentChatRequest {
    apiOrigin: string;
    agentAccessToken: string;
    anonymousIdentifier: string;
    message: string;
    conversationId?: string;
    onText?: (content: string) => void;
    additionalHeaders?: Record<string, string>;
    timeoutMs?: number;
}

export interface PublishedAgentChatResult {
    answer: string;
    conversationId?: string;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

export function resolvePublishedAgentApiOrigin(): string {
    const explicitApiDomain = process.env.BUILDINGAI_API_URL?.trim();
    if (explicitApiDomain) return explicitApiDomain.replace(/\/$/, "");

    const configured = process.env.VITE_PRODUCTION_APP_BASE_URL?.trim();
    if (configured) {
        const url = new URL(configured);
        if (url.hostname === "mac.bosofts.com") url.hostname = "api.mac.bosofts.com";
        return url.toString().replace(/\/$/, "");
    }

    const appDomain = process.env.APP_DOMAIN?.trim();
    if (!appDomain) throw new Error("APP_DOMAIN is not configured");
    const url = new URL(appDomain);
    if (url.hostname === "mac.bosofts.com") url.hostname = "api.mac.bosofts.com";
    return url.toString().replace(/\/$/, "");
}

export function parsePublishedAgentStreamEvent(
    line: string,
): PublishedAgentStreamEvent | undefined {
    const match = line.match(/^data:\s*(.+)$/);
    if (!match || match[1] === "[DONE]") return undefined;
    try {
        const parsed = JSON.parse(match[1]) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
        return parsed as PublishedAgentStreamEvent;
    } catch {
        return undefined;
    }
}

export class PublishedAgentChatClient {
    async stream(request: PublishedAgentChatRequest): Promise<PublishedAgentChatResult> {
        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        );
        try {
            const response = await fetch(
                `${request.apiOrigin.replace(/\/$/, "")}/v1/chat-messages`,
                {
                    method: "POST",
                    headers: {
                        authorization: `Bearer ${request.agentAccessToken}`,
                        "content-type": "application/json",
                        "x-anonymous-identifier": request.anonymousIdentifier,
                        ...request.additionalHeaders,
                    },
                    body: JSON.stringify({
                        message: {
                            role: "user",
                            parts: [{ type: "text", text: request.message }],
                        },
                        responseMode: "streaming",
                        ...(request.conversationId
                            ? { conversationId: request.conversationId }
                            : {}),
                    }),
                    signal: controller.signal,
                },
            );
            if (!response.ok) throw await this.createUpstreamError(response);

            let answer = "";
            let conversationId: string | undefined;
            const processLine = (line: string): void => {
                const event = parsePublishedAgentStreamEvent(line);
                if (!event) return;
                if (event.type === "text-delta" && typeof event.delta === "string") {
                    answer += event.delta;
                    request.onText?.(answer);
                }
                if (event.type === "data-conversation-id" && typeof event.data === "string") {
                    conversationId = event.data;
                }
            };

            if (response.body?.getReader) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";
                while (true) {
                    const chunk = await reader.read();
                    if (chunk.done) break;
                    buffer += decoder.decode(chunk.value, { stream: true });
                    const lines = buffer.split(/\r?\n/);
                    buffer = lines.pop() || "";
                    lines.forEach(processLine);
                }
                buffer += decoder.decode();
                if (buffer) processLine(buffer);
            } else {
                const body = await response.text();
                body.split(/\r?\n/).forEach(processLine);
            }

            return { answer, conversationId };
        } catch (error) {
            if (controller.signal.aborted || (error as Error).name === "AbortError") {
                throw new Error("Agent request timed out");
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    private async createUpstreamError(response: Response): Promise<Error> {
        const body = await response.text().catch(() => "");
        let message = "";
        try {
            const parsed = JSON.parse(body) as { message?: string; error?: string };
            message = parsed.message || parsed.error || "";
        } catch {
            // The response metadata below is safe and sufficient for malformed upstream bodies.
        }
        return new Error(
            message ||
                `Agent request returned an unusable response (${response.status} ${response.statusText || "Unknown status"})`,
        );
    }
}
