jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { BowiMcpPrincipalService } from "./services/bowi-mcp-principal.service";
import { createBowiInvocationAssertion } from "./utils/bowi-invocation-assertion";

describe("BowiMcpPrincipalService", () => {
    const previousEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...previousEnv,
            NODE_ENV: "test",
            BUILDINGAI_OPENCODE_INTERNAL_KEY: "test-opencode-key",
            BOWI_MCP_INVOCATION_SECRET: "test-invocation-secret-that-is-long-enough",
        };
    });

    afterAll(() => {
        process.env = previousEnv;
    });

    function harness(records: unknown[] = []) {
        const repository = { find: jest.fn().mockResolvedValue(records) };
        return { service: new BowiMcpPrincipalService(repository as never), repository };
    }

    it("authenticates a verified platform assertion", async () => {
        const { service } = harness();
        const assertion = createBowiInvocationAssertion({
            userId: "user-1",
            agentId: "agent-1",
            conversationId: "conversation-1",
            authSource: "login",
        });

        await expect(
            service.resolve({ headers: { "x-buildingai-bowi-invocation": assertion }, requireSubject: true }),
        ).resolves.toMatchObject({ subjectUserId: "user-1", authSource: "login" });
    });

    it("does not grant a non-login assertion a personal automation scope", async () => {
        const { service } = harness();
        const assertion = createBowiInvocationAssertion({
            userId: "agent-owner",
            agentId: "agent-1",
            authSource: "site_access_token",
            capabilities: ["automation.personal"],
            automationScope: {
                channel: "feishu",
                accountId: "connection-1",
                conversationId: "chat-1",
                targetType: "chat",
                targetId: "chat-1",
            },
        });
        const principal = await service.resolve({
            headers: { "x-buildingai-bowi-invocation": assertion },
            requireSubject: false,
        });
        expect(principal.subjectUserId).toBeUndefined();
        expect(principal.automationScope).toBeUndefined();
        expect(principal.capabilities.has("automation.personal")).toBe(false);
    });

    it("resolves one explicitly login-bound managed OpenCode session", async () => {
        const { service } = harness([
            {
                userId: "user-2",
                agentId: "agent-2",
                anonymousIdentifier: null,
                metadata: { bowiAuthSource: "login" },
            },
        ]);

        await expect(
            service.resolve({
                headers: { "x-buildingai-opencode-key": "test-opencode-key" },
                meta: { buildingai: { sessionId: "ses-1", callId: "call-1" } },
                requireSubject: true,
            }),
        ).resolves.toMatchObject({ subjectUserId: "user-2", sessionId: "ses-1", callId: "call-1" });
    });

    it("resolves the canonical MCP session id when OpenCode sends a suffixed transport id", async () => {
        const { service, repository } = harness([
            {
                userId: "user-2",
                agentId: "agent-2",
                anonymousIdentifier: null,
                metadata: { bowiAuthSource: "login" },
            },
        ]);

        await expect(
            service.resolve({
                headers: { "x-buildingai-opencode-key": "test-opencode-key" },
                meta: { buildingai: { sessionId: "ses-1::attempt-2", callId: "call-1" } },
                requireSubject: true,
            }),
        ).resolves.toMatchObject({ subjectUserId: "user-2", sessionId: "ses-1::attempt-2" });
        expect(repository.find).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ opencodeSessionId: "ses-1" }) }),
        );
    });

    it.each([
        { records: [], label: "missing" },
        { records: [{ userId: "user-1", metadata: { bowiAuthSource: "login" } }, { userId: "user-2", metadata: { bowiAuthSource: "login" } }], label: "ambiguous" },
        { records: [{ userId: "user-1", metadata: { bowiAuthSource: "publish_key" } }], label: "published" },
        { records: [{ userId: "user-1", anonymousIdentifier: "anon", metadata: { bowiAuthSource: "login" } }], label: "anonymous" },
    ])("fails closed for $label OpenCode sessions", async ({ records }) => {
        const { service } = harness(records);
        await expect(
            service.resolve({
                headers: { "x-buildingai-opencode-key": "test-opencode-key" },
                meta: { buildingai: { sessionId: "ses-1" } },
                requireSubject: true,
            }),
        ).rejects.toThrow("verified personal subject");
    });

    it("rejects the development key in production", async () => {
        process.env.NODE_ENV = "production";
        process.env.BUILDINGAI_OPENCODE_INTERNAL_KEY = "buildingai-local-opencode";
        const { service } = harness();

        await expect(
            service.resolve({
                headers: { "x-buildingai-opencode-key": "buildingai-local-opencode" },
                requireSubject: false,
            }),
        ).rejects.toThrow("not configured");
    });

    it("allows trusted discovery of Todo and configured SAP tools without granting a subject", async () => {
        const { service } = harness();
        const principal = await service.resolve({
            headers: { "x-buildingai-opencode-key": "test-opencode-key" },
            requireSubject: false,
        });

        expect(principal.subjectUserId).toBeUndefined();
        expect(principal.capabilities).toEqual(new Set(["todo.personal", "sap.read", "sap.rfc"]));
    });
});
