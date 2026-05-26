import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { buildCheckPrompt } from "../lib/build-check-prompt";
import { usePlatformChat } from "../lib/platform-chat";
import { ingestRuleResult, startCheckRun } from "../services/check-runs";
import { listRules } from "../services/rules";

export function useBatchCheck(options: {
    agentId: string;
    onProgress: (text: string, role: "ai" | "user") => void;
    onRefresh: () => void;
}) {
    const [running, setRunning] = useState(false);
    const runIdRef = useRef<number | null>(null);
    const chat = usePlatformChat({
        agentId: options.agentId,
        chatId: "ehcs-batch-check",
        saveConversation: false,
    });

    const runBatch = useCallback(async () => {
        if (!options.agentId) {
            toast.error("请先在设置页选择智能体");
            return;
        }
        if (running) {
            toast.message("检查进行中…");
            return;
        }

        setRunning(true);
        options.onProgress("📋 正在从规则表读取已启用规则…", "ai");

        try {
            const allRules = await listRules();
            const enabledRules = allRules.filter((r) => r.enabled);
            if (enabledRules.length === 0) {
                toast.error("没有已启用的检查规则");
                options.onProgress("⚠️ 没有已启用的检查规则", "ai");
                return;
            }

            options.onProgress(
                `✅ 已获取 ${enabledRules.length} 条规则，开始逐条检查…`,
                "ai",
            );

            const { runId } = await startCheckRun();
            runIdRef.current = runId;
            const total = enabledRules.length;

            for (let i = 0; i < enabledRules.length; i++) {
                const rule = enabledRules[i]!;
                const index = i + 1;
                chat.resetConversation();
                chat.setMessages([]);
                options.onProgress(
                    `⏳ [${index}/${total}] 检查 ${rule.ruleId}：${rule.dataItem}`,
                    "ai",
                );

                await chat.sendMessage({ text: buildCheckPrompt(rule, index, total) });

                while (chat.status === "streaming" || chat.status === "submitted") {
                    await new Promise((r) => setTimeout(r, 200));
                }

                const assistantText = chat.getLastAssistantText();
                const ingest = await ingestRuleResult(runId, rule.ruleId, {
                    assistantText,
                    conversationId: chat.conversationIdRef.current,
                });

                if (ingest.ok === false) {
                    options.onProgress(`⚠️ ${rule.ruleId} 解析失败：${ingest.error}`, "ai");
                } else if (ingest.anomalyCount > 0) {
                    options.onProgress(
                        `⚠️ ${rule.ruleId} 发现 ${ingest.anomalyCount} 条异常`,
                        "ai",
                    );
                } else {
                    options.onProgress(`✅ ${rule.ruleId} 通过`, "ai");
                }
                options.onRefresh();
            }

            options.onProgress("🎉 全量检查完成", "ai");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "检查失败";
            options.onProgress(`❌ ${msg}`, "ai");
            toast.error(msg);
        } finally {
            setRunning(false);
            runIdRef.current = null;
        }
    }, [chat, options, running]);

    return { running, runBatch, chatMessages: chat.messages };
}
