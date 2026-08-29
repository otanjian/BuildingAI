import { parseAutomationAgentResponse } from "./automation-response";

describe("parseAutomationAgentResponse", () => {
    it("parses a blocking JSON response", () => {
        expect(
            parseAutomationAgentResponse(
                JSON.stringify({ data: { answer: "采购报告", conversationId: "conversation-1" } }),
                "application/json",
            ),
        ).toEqual({ answer: "采购报告", conversationId: "conversation-1" });
    });

    it("parses UI-message SSE returned when the agent uses tools", () => {
        const sse = [
            'data: {"type":"data-conversation-id","data":"conversation-2"}',
            'data: {"type":"reasoning-delta","delta":"隐藏推理"}',
            'data: {"type":"text-delta","delta":"采购"}',
            'data: {"type":"text-delta","delta":"完成"}',
            "data: [DONE]",
            "",
        ].join("\n");

        expect(parseAutomationAgentResponse(sse, "text/event-stream")).toEqual({
            answer: "采购完成",
            conversationId: "conversation-2",
        });
    });

    it("surfaces an agent stream error", () => {
        expect(
            parseAutomationAgentResponse(
                'data: {"type":"error","errorText":"工具调用失败"}\n',
                "text/event-stream",
            ),
        ).toEqual({ answer: "", error: "工具调用失败" });
    });
});
