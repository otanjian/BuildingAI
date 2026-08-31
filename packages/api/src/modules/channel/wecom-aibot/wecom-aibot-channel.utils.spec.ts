import {
    buildWecomAnonymousIdentifier,
    extractWecomText,
    normalizeWecomBotId,
    normalizeWecomConnectionName,
    resolveWecomConversationScope,
    truncateWecomStreamContent,
    validateWecomConfig,
} from "./wecom-aibot-channel.utils";

describe("WeCom intelligent robot channel helpers", () => {
    it("validates every required credential", () => {
        expect(() =>
            validateWecomConfig({
                agentId: "agent-1",
                botId: "bot-1",
                botSecret: "secret",
                agentAccessToken: "token",
            }),
        ).not.toThrow();
        expect(() => validateWecomConfig({ agentId: "agent-1" })).toThrow(
            "WeCom BotID is required",
        );
    });

    it("normalizes connection identity fields", () => {
        expect(normalizeWecomBotId("  BOT-1  ")).toBe("bot-1");
        expect(normalizeWecomConnectionName("  Customer   Service ")).toBe("customer service");
    });

    it("extracts text and removes the leading group bot mention", () => {
        expect(extractWecomText({ chattype: "single", text: { content: "  hello  " } })).toBe(
            "hello",
        );
        expect(
            extractWecomText({ chattype: "group", text: { content: "@RobotA   查询库存" } }),
        ).toBe("查询库存");
        expect(extractWecomText({ chattype: "single" })).toBe("");
    });

    it("derives isolated direct and group conversation scopes", () => {
        expect(
            resolveWecomConversationScope({
                chattype: "group",
                chatid: "group-1",
                from: { userid: "user-1" },
            }),
        ).toBe("group:group-1");
        expect(
            resolveWecomConversationScope({
                chattype: "single",
                from: { userid: "user-1" },
            }),
        ).toBe("single:user-1");
        expect(resolveWecomConversationScope({ chattype: "single" })).toBeUndefined();
        expect(buildWecomAnonymousIdentifier("connection-1", "single:user-1")).toBe(
            "wecom:connection-1:single:user-1",
        );
    });

    it("truncates stream content by UTF-8 bytes without splitting characters", () => {
        const value = truncateWecomStreamContent("你好abc", 8);
        expect(Buffer.byteLength(value, "utf8")).toBeLessThanOrEqual(8);
        expect(value).not.toContain("�");
        expect(value).toContain("…");
        expect(truncateWecomStreamContent("short", 20)).toBe("short");
    });
});
