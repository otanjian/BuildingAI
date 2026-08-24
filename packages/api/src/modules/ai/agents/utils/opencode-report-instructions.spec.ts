import { buildOpencodeArtifactSystemHint } from "./opencode-report-instructions";

describe("OpenCode report instructions", () => {
    it("scopes HTML output and requires filename-only report citations", () => {
        const prompt = buildOpencodeArtifactSystemHint({
            conversationId: "conversation-1",
            artifactRoot: "/workspace/artifacts/conversation-1",
        });

        expect(prompt).toContain("Conversation id: conversation-1");
        expect(prompt).toContain("ONLY under: /workspace/artifacts/conversation-1");
        expect(prompt).toMatch(/cite every generated `\.html` or `\.htm` file/i);
        expect(prompt).toMatch(/formatted as Markdown inline code/i);
        expect(prompt).toMatch(/filename only/i);
        expect(prompt).toContain("`采购情况分析_20260824_1600.html`");
        expect(prompt).toMatch(/do not (?:show|include|expose).*(?:directory|absolute path)/i);
    });
});
