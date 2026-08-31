import type { ToolDefinition } from "@buildingai/db/entities";
jest.mock("@buildingai/db/entities", () => ({
    ToolApproval: class ToolApproval {},
    ToolDefinition: class ToolDefinition {},
    ToolExecution: class ToolExecution {},
}));
jest.mock("@buildingai/db/@nestjs/typeorm", () => ({
    InjectRepository: () => () => undefined,
}));
jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        badRequest: (message: string) => new Error(message),
        forbidden: (message: string) => new Error(message),
        notFound: (message: string) => new Error(message),
    },
}));
import { GatewayDenied, ToolGatewayService } from "./tool-gateway.service";
import { isPrivateNetworkTarget, redact, resolveStablePublicAddresses } from "./tool-gateway-policy.utils";

describe("Tool Gateway network and redaction controls", () => {
    it("blocks loopback, private, metadata and link-local targets", () => {
        expect(isPrivateNetworkTarget("127.0.0.1")).toBe(true);
        expect(isPrivateNetworkTarget("10.1.2.3")).toBe(true);
        expect(isPrivateNetworkTarget("169.254.169.254")).toBe(true);
        expect(isPrivateNetworkTarget("example.com")).toBe(false);
    });

    it("redacts credential-shaped fields without retaining values", () => {
        expect(redact({ token: "secret", nested: { password: "pw", ok: true } })).toEqual({ token: "[REDACTED]", nested: { password: "[REDACTED]", ok: true } });
    });

    it("recognizes IPv6 loopback, unique private ranges and host normalization", () => {
        expect(isPrivateNetworkTarget("::1")).toBe(true);
        expect(isPrivateNetworkTarget("fd00::1")).toBe(true);
        expect(isPrivateNetworkTarget("::ffff:127.0.0.1")).toBe(true);
        expect(isPrivateNetworkTarget("::ffff:7f00:1")).toBe(true);
        expect(isPrivateNetworkTarget("ff02::1")).toBe(true);
        expect(isPrivateNetworkTarget("100.64.1.1")).toBe(true);
        expect(isPrivateNetworkTarget("172.16.0.10.")).toBe(true);
        expect(isPrivateNetworkTarget("203.0.113.10")).toBe(false);
    });

    it("fails closed when DNS changes from a public answer to a private answer", async () => {
        const lookup = jest.fn()
            .mockResolvedValueOnce([{ address: "203.0.113.10", family: 4 }])
            .mockResolvedValueOnce([{ address: "10.0.0.8", family: 4 }]);
        await expect(resolveStablePublicAddresses("rebind.test", lookup)).rejects.toThrow("DNS_REBINDING_DETECTED");
        expect(lookup).toHaveBeenCalledTimes(2);
    });

});

describe("Tool Gateway policy matrix", () => {
    const admin = {
        id: "actor-a",
        username: "gateway-admin",
        isRoot: 1,
        permissions: [],
        role: null,
        tenantId: "tenant-a",
    } as any;

    const makeTool = (overrides: Partial<ToolDefinition> = {}) => ({
        id: "tool-a",
        tenantId: "tenant-a",
        projectId: null,
        agentVersionId: null,
        environment: "test",
        name: "registered-tool",
        version: "1.0.0",
        description: "test",
        capabilities: ["test"],
        inputSchema: {},
        outputSchema: {},
        risk: "READ",
        credentialRef: null,
        timeoutMs: 100,
        responseSizeLimit: 1_048_576,
        networkPolicy: {},
        idempotencyRequired: false,
        approvalMode: "none",
        maxConcurrency: 4,
        maxRetries: 0,
        budgetLimit: 0,
        rateLimitPerMinute: 0,
        status: "active",
        policyVersion: 1,
        createdBy: "actor-a",
        ...overrides,
    }) as ToolDefinition;

    const makeService = (tool = makeTool()) => {
        const tools = {
            find: jest.fn().mockResolvedValue([tool]),
            findOne: jest.fn(),
            create: jest.fn((value) => value),
            save: jest.fn(async (value) => ({ id: "execution-a", ...value })),
        };
        const approvals = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
            create: jest.fn((value) => value),
            save: jest.fn(async (value) => ({ id: "approval-a", ...value })),
        };
        const executions = {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
            create: jest.fn((value) => value),
            save: jest.fn(async (value) => ({ id: "execution-a", ...value })),
        };
        return {
            service: new ToolGatewayService(tools as any, approvals as any, executions as any),
            tools,
            approvals,
            executions,
        };
    };

    it("rejects schema type violations and undeclared properties", () => {
        const { service } = makeService(makeTool({
            inputSchema: {
                type: "object",
                required: ["message"],
                properties: { message: { type: "string" } },
                additionalProperties: false,
            },
        }));
        expect(() => (service as any).validateSchema({
            type: "object",
            required: ["message"],
            properties: { message: { type: "string" } },
            additionalProperties: false,
        }, { message: 42 })).toThrow();
        expect(() => (service as any).validateSchema({
            type: "object",
            required: ["message"],
            properties: { message: { type: "string" } },
            additionalProperties: false,
        }, { message: "ok", extra: true })).toThrow();
    });

    it("fails closed for tampered and expired signed contexts", () => {
        const { service } = makeService();
        const token = service.signContext({ tenantId: "tenant-a" });
        const [payload, signature] = token.split(".");
        expect(() => service.verifyContext(`${payload}.${signature.slice(0, -1)}x`)).toThrow(GatewayDenied);
        const expired = service.signContext({ tenantId: "tenant-a" }, Date.now() - 1);
        expect(() => service.verifyContext(expired)).toThrow("SIGNED_CONTEXT_EXPIRED");
    });

    it("does not accept an approval from another tenant", async () => {
        const tool = makeTool({ risk: "WRITE", approvalMode: "approval", idempotencyRequired: true });
        const { service, approvals, executions } = makeService(tool);
        approvals.findOne.mockResolvedValue(null);
        await expect(service.execute(admin, { tool: tool.name, input: { value: "x" }, idempotencyKey: "write-a", approvalId: "approval-from-b" })).rejects.toThrow("APPROVAL_REQUIRED");
        expect(executions.save).toHaveBeenCalledWith(expect.objectContaining({ outcome: "pending", denialReason: "APPROVAL_REQUIRED" }));
    });

    it("denies gateway discovery and approval requests from non-admin actors", async () => {
        const member = { ...admin, isRoot: 0, permissions: [] } as any;
        const { service } = makeService();
        await expect(service.list(member)).rejects.toThrow("administrator permission required");
        await expect(service.requestApproval(member, { tool: "registered-tool", input: {} })).rejects.toThrow("administrator permission required");
    });

    it("returns an idempotent replay without invoking the adapter twice", async () => {
        const { service, executions } = makeService();
        const adapter = jest.fn().mockResolvedValue({ ok: true });
        (service as any).adapters.set("registered-tool", adapter);
        executions.findOne.mockResolvedValue({ id: "execution-original", redactedOutput: { ok: true } });
        await expect(service.execute(admin, { tool: "registered-tool", input: {}, idempotencyKey: "read-a" })).resolves.toEqual({ outcome: "replayed", executionId: "execution-original", output: { ok: true } });
        expect(adapter).not.toHaveBeenCalled();
    });

    it("retries a transient READ failure within the configured limit and records attempts", async () => {
        const { service, executions } = makeService(makeTool({ maxRetries: 1 }));
        const adapter = jest.fn()
            .mockRejectedValueOnce(new GatewayDenied("TRANSIENT_NETWORK"))
            .mockResolvedValueOnce({ ok: true });
        (service as any).adapters.set("registered-tool", adapter);
        await expect(service.execute(admin, { tool: "registered-tool", input: {} })).resolves.toEqual(expect.objectContaining({ outcome: "allowed" }));
        expect(adapter).toHaveBeenCalledTimes(2);
        expect(executions.save).toHaveBeenCalledWith(expect.objectContaining({ attempts: 2 }));
    });

    it("maps an adapter timeout to a bounded denial and never retries WRITE", async () => {
        const tool = makeTool({ risk: "WRITE", approvalMode: "none", idempotencyRequired: false, timeoutMs: 10 });
        const { service, executions } = makeService(tool);
        const adapter = jest.fn().mockImplementation(() => new Promise(() => undefined));
        (service as any).adapters.set("registered-tool", adapter);
        await expect(service.execute(admin, { tool: "registered-tool", input: {} })).rejects.toThrow("TIMEOUT");
        expect(adapter).toHaveBeenCalledTimes(1);
        expect(executions.save).toHaveBeenCalledWith(expect.objectContaining({ outcome: "denied", denialReason: "TIMEOUT" }));
    });
});
