import { useEffect, useState } from "react";

import { buildRcaPrompt } from "../lib/build-rca-prompt";
import { getTextFromMessage, usePlatformChat } from "../lib/platform-chat";
import type { CheckResultDto } from "../services/anomalies";
import { createRcaSession } from "../services/anomalies";

type Props = {
    anomaly: CheckResultDto | null;
    agentId: string;
    onClose: () => void;
};

export function RcaModal({ anomaly, agentId, onClose }: Props) {
    const [input, setInput] = useState("");
    const chat = usePlatformChat({
        agentId,
        chatId: anomaly ? `rca-${anomaly.anomalyId}-${Date.now()}` : "rca-idle",
    });

    useEffect(() => {
        if (!anomaly || !agentId) return;
        let cancelled = false;
        (async () => {
            chat.resetConversation();
            chat.setMessages([]);
            await createRcaSession(anomaly.anomalyId);
            if (cancelled) return;
            await chat.sendMessage({ text: buildRcaPrompt(anomaly) });
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- new session per open
    }, [anomaly?.anomalyId, agentId]);

    if (!anomaly) return null;

    return (
        <div className="contract-modal-backdrop" onClick={onClose}>
            <div className="contract-modal rca" onClick={(e) => e.stopPropagation()}>
                <h3 style={{ marginBottom: 12 }}>🧠 AI 根因分析 {anomaly.anomalyId}</h3>
                <div className="contract-chat-msgs" style={{ minHeight: 280, maxHeight: 400 }}>
                    {chat.messages.map((m: { id: string; role: string }) => (
                        <div
                            key={m.id}
                            className={`contract-chat-msg ${m.role === "user" ? "user" : "ai"}`}
                        >
                            {getTextFromMessage(m)}
                        </div>
                    ))}
                    {(chat.status === "streaming" || chat.status === "submitted") && (
                        <div className="contract-chat-msg ai">…</div>
                    )}
                </div>
                <div className="contract-chat-inp">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="输入补充信息或提问…"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && input.trim()) {
                                void chat.sendMessage({ text: input.trim() });
                                setInput("");
                            }
                        }}
                    />
                    <button
                        type="button"
                        className="contract-btn contract-btn-primary"
                        onClick={() => {
                            if (!input.trim()) return;
                            void chat.sendMessage({ text: input.trim() });
                            setInput("");
                        }}
                    >
                        发送
                    </button>
                    <button type="button" className="contract-btn contract-btn-outline" onClick={onClose}>
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
}
