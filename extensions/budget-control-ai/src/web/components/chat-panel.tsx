import { EditorContentRenderer } from "@buildingai/ui/components/editor";
import { useState } from "react";

import { hasRenderableOpeningStatement } from "../lib/opening-statement";
import { getTextFromMessage } from "../lib/platform-chat";
import type { UIMessage } from "ai";

export type LocalChatLine = { id: string; role: "ai" | "user"; text: string };

type Props = {
    lines: LocalChatLine[];
    streamMessages: UIMessage[];
    running: boolean;
    onSend: (text: string) => void;
    onStartCheck: () => void;
    onClose?: () => void;
    agentTitle?: string;
    openingStatement?: string | null;
    openingQuestions?: string[];
};

export function ChatPanel({
    lines,
    streamMessages,
    running,
    onSend,
    onStartCheck,
    onClose,
    agentTitle = "AI 智能体",
    openingStatement,
    openingQuestions = [],
}: Props) {
    const [input, setInput] = useState("");
    const hasMessages = lines.length > 0 || streamMessages.length > 0;
    const hasOpeningContent = hasRenderableOpeningStatement(openingStatement);
    const hasOpening = hasOpeningContent || openingQuestions.length > 0;
    const showOpening = !hasMessages && hasOpening;

    const submitText = (text: string) => {
        const t = text.trim();
        if (!t) return;
        setInput("");
        if (t.includes("开始检查") || t.includes("自动检查")) {
            onStartCheck();
        } else {
            onSend(t);
        }
    };

    return (
        <div className="budget-control-card budget-control-chat">
            <div
                style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--budget-control-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <span style={{ fontWeight: 600, fontSize: 12 }}>{agentTitle}</span>
                {onClose ? (
                    <button
                        type="button"
                        className="budget-control-btn budget-control-btn-outline"
                        style={{ padding: "4px 10px", fontSize: 11 }}
                        onClick={onClose}
                    >
                        收起
                    </button>
                ) : null}
            </div>
            <div className="budget-control-chat-msgs">
                {showOpening ? (
                    <div className="budget-control-chat-opening">
                        {hasOpeningContent ? (
                            <EditorContentRenderer
                                value={openingStatement ?? ""}
                                className="budget-control-chat-opening-text"
                            />
                        ) : null}
                        {openingQuestions.length > 0 ? (
                            <div className="budget-control-chat-suggestions">
                                {openingQuestions.map((q) => (
                                    <button
                                        key={q}
                                        type="button"
                                        className="budget-control-chat-suggestion"
                                        disabled={running}
                                        onClick={() => submitText(q)}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : null}
                {lines.map((line) => (
                    <div key={line.id} className={`budget-control-chat-msg ${line.role}`}>
                        {line.text}
                    </div>
                ))}
                {streamMessages.map((m) => {
                    const text = getTextFromMessage(m);
                    if (!text) return null;
                    return (
                        <div key={m.id} className={`budget-control-chat-msg ${m.role === "user" ? "user" : "ai"}`}>
                            {text}
                        </div>
                    );
                })}
            </div>
            <div className="budget-control-chat-inp">
                <input
                    value={input}
                    disabled={running}
                    placeholder="有问题，尽管问…"
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && input.trim()) {
                            submitText(input);
                        }
                    }}
                />
                <button
                    type="button"
                    className="budget-control-btn budget-control-btn-primary"
                    disabled={running}
                    onClick={() => submitText(input)}
                >
                    发送
                </button>
            </div>
        </div>
    );
}
