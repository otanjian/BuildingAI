import {
    copyThirdPartyDiscriminator,
    projectCopyContent,
    projectPublishedAgent,
    projectSquareCard,
} from "./agent-public-projection";

const agent: any = {
    id: "agent-1",
    name: "Agent",
    description: "Description",
    avatar: "/avatar.png",
    chatAvatar: "/chat.png",
    chatAvatarEnabled: true,
    createMode: "opencode",
    createBy: "owner-1",
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2025-01-01T00:00:00Z"),
    userCount: 10,
    tags: [],
    showContext: true,
    showReference: true,
    enableFileUpload: true,
    modelConfig: { id: "model-1", secretRouting: "secret" },
    rolePrompt: "secret internal prompt",
    formFieldsInputs: { contact: "private@example.test" },
    sensitiveWordConfig: {
        enabled: true,
        revision: 1,
        rules: [{ word: "secret", replacement: "public" }],
        words: ["secret"],
        replacement: "***",
    },
    openingStatement: "hello secret",
    openingQuestions: ["secret user template"],
    quickCommands: [
        {
            avatar: "",
            name: "cmd",
            content: "/cmd",
            replyType: "custom",
            replyContent: "secret reply",
        },
    ],
    thirdPartyIntegration: {
        provider: "opencode",
        apiKey: "secret-key",
        baseURL: "https://secret.internal",
        extendedConfig: { workspace: "/secret/workspace", accessToken: "token" },
    },
    publishConfig: { allowCopy: true, accessToken: "token", apiKey: "key" },
};

describe("agent public projections", () => {
    it("published detail exposes only allowlisted fields and projected opening text", () => {
        const result = projectPublishedAgent(agent);
        expect(result).toMatchObject({
            id: "agent-1",
            openingStatement: "hello public",
            openingQuestions: ["secret user template"],
            tags: [],
            allowCopy: true,
            modelConfig: { id: "model-1" },
        });
        expect(result).not.toHaveProperty("sensitiveWordConfig");
        expect(result).not.toHaveProperty("thirdPartyIntegration");
        expect(result).not.toHaveProperty("publishConfig");
        expect(result).not.toHaveProperty("quickCommands");
        expect(result).not.toHaveProperty("rolePrompt");
        expect(result).not.toHaveProperty("autoQuestions");
        expect(result).not.toHaveProperty("formFieldsInputs");
    });

    it("square cards cannot carry entity secrets", () => {
        const result = projectSquareCard(agent);
        expect(result).toEqual({
            id: "agent-1",
            name: "Agent",
            description: "Description",
            avatar: "/avatar.png",
            createMode: "opencode",
            chatAvatar: "/chat.png",
            chatAvatarEnabled: true,
            userCount: 10,
            updatedAt: agent.updatedAt,
            createBy: "owner-1",
            allowCopy: true,
            tags: [],
        });
    });

    it("copy projection removes credentials and projects assistant-authored content", () => {
        expect(projectCopyContent(agent)).toEqual({
            openingStatement: "hello public",
            quickCommands: [
                {
                    avatar: "",
                    name: "cmd",
                    content: "/cmd",
                    replyType: "custom",
                    replyContent: "public reply",
                },
            ],
        });
        expect(copyThirdPartyDiscriminator(agent.thirdPartyIntegration)).toEqual({
            provider: "opencode",
            extendedConfig: { reconnectRequired: true },
            useExternalConversation: true,
        });
    });

    it("fails closed when source policy has no safe representation", () => {
        const corrupt = {
            ...agent,
            sensitiveWordConfig: {
                enabled: true,
                revision: 2,
                rules: [{ word: " ", replacement: "x" }],
            },
        };
        expect(() => projectPublishedAgent(corrupt)).toThrow(
            "Sensitive word replacement configuration is invalid",
        );
        expect(() => projectCopyContent(corrupt)).toThrow(
            "Sensitive word replacement configuration is invalid",
        );
    });
});
