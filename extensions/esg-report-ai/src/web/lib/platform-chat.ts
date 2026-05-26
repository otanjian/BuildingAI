import { useChat } from "@ai-sdk/react";
import { useAuthStore } from "@buildingai/stores";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useMemo, useRef } from "react";

function getApiBase(): string {
    return `${window.location.origin}${import.meta.env.VITE_APP_WEB_API_PREFIX || "/api"}`;
}

export function getTextFromMessage(message: UIMessage): string {
    return (message.parts ?? [])
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
}

/** Platform agent chat — model and MCP come from the selected agent config. */
export function usePlatformChat(options: {
    agentId: string;
    chatId?: string;
    saveConversation?: boolean;
}) {
    const token = useAuthStore((s) => s.auth.token);
    const conversationIdRef = useRef<string | undefined>(undefined);
    const saveConversationRef = useRef(options.saveConversation ?? true);
    saveConversationRef.current = options.saveConversation ?? true;

    const resetConversation = useCallback(() => {
        conversationIdRef.current = undefined;
    }, []);

    const transport = useMemo(
        () =>
            new DefaultChatTransport({
                api: `${getApiBase()}/ai-agents/${options.agentId}/chat/stream`,
                headers: { Authorization: token ? `Bearer ${token}` : "" },
                body: () => ({
                    conversationId: conversationIdRef.current,
                    ...(saveConversationRef.current === false ? { saveConversation: false } : {}),
                }),
                prepareSendMessagesRequest(request) {
                    const lastMessage = request.messages.at(-1);
                    const isToolApprovalContinuation = request.messages.some((msg) =>
                        msg.parts?.some((part) => {
                            const state = (part as { state?: string }).state;
                            return state === "approval-responded" || state === "output-denied";
                        }),
                    );
                    return {
                        body: {
                            ...request.body,
                            ...(isToolApprovalContinuation
                                ? { message: lastMessage }
                                : { messages: request.messages }),
                        },
                    };
                },
            }),
        [options.agentId, token],
    );

    const chat = useChat({
        id: `${options.chatId ?? "esg-report-agent"}-${options.agentId}`,
        transport,
        onData: (data: { type?: string; data?: unknown }) => {
            if (data.type === "data-conversation-id" && data.data) {
                conversationIdRef.current = String(data.data);
            }
        },
    });

    const getLastAssistantText = useCallback(() => {
        const msgs = chat.messages;
        for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (m.role === "assistant") {
                return getTextFromMessage(m);
            }
        }
        return "";
    }, [chat.messages]);

    return {
        ...chat,
        conversationIdRef,
        resetConversation,
        getLastAssistantText,
    };
}
