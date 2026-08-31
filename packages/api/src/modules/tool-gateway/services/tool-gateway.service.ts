import type { UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { ToolApproval, ToolDefinition, ToolExecution } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import Ajv from "ajv";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isPrivateNetworkTarget, redact, resolveStablePublicAddresses } from "./tool-gateway-policy.utils";

import type { ApprovalDecisionDto, ExecuteToolDto, ListToolQueryDto, RegisterToolDto } from "../dto/tool-gateway.dto";

type GatewayContext = { tenantId: string; projectId?: string; agentVersionId?: string; environment?: string; requiredCapabilities?: string[]; userId?: string };
type Adapter = (input: Record<string, unknown>, context: GatewayContext) => Promise<unknown>;

const BUILTIN_TOOLS: Record<string, { description: string; risk: "READ" | "WRITE"; capabilities: string[]; adapter: Adapter }> = {
    "sandbox-read": { description: "Deterministic read-only sandbox tool", risk: "READ", capabilities: ["sandbox", "read"], adapter: async (input) => ({ ok: true, echo: redact(input), source: "sandbox" }) },
    "sandbox-write": { description: "Sandbox mutation requiring approval", risk: "WRITE", capabilities: ["sandbox", "write"], adapter: async (input) => ({ ok: true, mutation: "accepted", echo: redact(input) }) },
    "sandbox-ssrf": { description: "Sandbox endpoint used to verify egress denial", risk: "READ", capabilities: ["sandbox", "network"], adapter: async () => ({ ok: true }) },
};

function digest(value: unknown): string { return createHash("sha256").update(JSON.stringify(value ?? {})).digest("hex"); }

@Injectable()
export class ToolGatewayService {
    private readonly ajv = new Ajv({ allErrors: true, strict: false });
    private readonly adapters = new Map<string, Adapter>();
    private readonly inFlight = new Map<string, number>();
    private readonly failures = new Map<string, { count: number; openedAt: number }>();
    private readonly usage = new Map<string, { windowStartedAt: number; count: number }>();
    private emergencyDisabled = false;

    constructor(
        @InjectRepository(ToolDefinition) private readonly tools: Repository<ToolDefinition>,
        @InjectRepository(ToolApproval) private readonly approvals: Repository<ToolApproval>,
        @InjectRepository(ToolExecution) private readonly executions: Repository<ToolExecution>,
    ) {
        for (const [name, definition] of Object.entries(BUILTIN_TOOLS)) this.adapters.set(name, definition.adapter);
    }

    /** Create a short-lived, tamper-evident context for API → Worker handoff. */
    signContext(context: GatewayContext, expiresAt = Date.now() + 60_000): string {
        const payload = Buffer.from(JSON.stringify({ ...context, expiresAt, nonce: randomUUID() })).toString("base64url");
        return `${payload}.${createHmac("sha256", this.signingKey()).update(payload).digest("base64url")}`;
    }

    verifyContext(token: string): GatewayContext {
        const [payload, signature] = token.split(".");
        if (!payload || !signature) throw new GatewayDenied("SIGNED_CONTEXT_INVALID");
        const expected = createHmac("sha256", this.signingKey()).update(payload).digest("base64url");
        const supplied = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expected);
        if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) throw new GatewayDenied("SIGNED_CONTEXT_INVALID");
        const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GatewayContext & { expiresAt: number };
        if (!value.tenantId || value.expiresAt <= Date.now()) throw new GatewayDenied("SIGNED_CONTEXT_EXPIRED");
        return value;
    }

    async list(user: UserPlayground, filters: ListToolQueryDto = {}) {
        this.assertAdmin(user);
        const tenantId = this.requireTenant(user);
        const rows = await this.tools.find({ where: [{ tenantId }, { tenantId: null }], order: { name: "ASC", version: "DESC" } });
        const matches = (row: Pick<ToolDefinition, "environment" | "agentVersionId" | "capabilities">) =>
            (!filters.environment || !row.environment || row.environment === filters.environment) &&
            (!filters.agentVersionId || !row.agentVersionId || row.agentVersionId === filters.agentVersionId) &&
            (!filters.capability || row.capabilities.includes(filters.capability));
        const registered = rows.filter((row) => row.status === "active" && matches(row)).map((row) => this.metadata(row));
        const builtins = Object.entries(BUILTIN_TOOLS)
            .map(([name, item]) => ({ id: `builtin:${name}`, name, version: "builtin", risk: item.risk, capabilities: item.capabilities, status: this.emergencyDisabled ? "disabled" : "active", approvalMode: item.risk === "WRITE" ? "approval" : "none", description: item.description }))
            .filter((row) => !filters.capability || row.capabilities.includes(filters.capability));
        return [...builtins, ...registered];
    }

    async register(user: UserPlayground, dto: RegisterToolDto) {
        this.assertAdmin(user);
        const tenantId = this.requireTenant(user);
        const row = this.tools.create({ tenantId, projectId: dto.projectId ?? null, agentVersionId: dto.agentVersionId ?? null, environment: dto.environment ?? null, name: dto.name.trim(), version: dto.version || "1.0.0", description: dto.description ?? null, capabilities: dto.capabilities || [], inputSchema: dto.inputSchema || {}, outputSchema: dto.outputSchema || {}, risk: dto.risk || "READ", credentialRef: dto.credentialRef ?? null, timeoutMs: dto.timeoutMs || 15000, responseSizeLimit: dto.responseSizeLimit || 1048576, networkPolicy: dto.networkPolicy || {}, idempotencyRequired: dto.idempotencyRequired ?? (dto.risk === "WRITE" || dto.risk === "DESTRUCTIVE"), approvalMode: dto.approvalMode || ((dto.risk === "WRITE" || dto.risk === "SENSITIVE") ? "approval" : "none"), maxConcurrency: dto.maxConcurrency || 4, maxRetries: dto.maxRetries || 0, budgetLimit: dto.budgetLimit || 0, rateLimitPerMinute: dto.rateLimitPerMinute || 0, status: "active", policyVersion: 1, createdBy: user.id });
        return this.metadata(await this.tools.save(row));
    }

    async toggle(user: UserPlayground, id: string, disabled: boolean) {
        this.assertAdmin(user); const row = await this.scopedTool(user, id); row.status = disabled ? "disabled" : "active"; row.policyVersion += 1; return this.metadata(await this.tools.save(row));
    }

    async emergency(user: UserPlayground, disabled: boolean) { this.assertAdmin(user); this.emergencyDisabled = disabled; return { disabled, changedAt: new Date().toISOString() }; }

    async requestApproval(user: UserPlayground, dto: ExecuteToolDto) {
        this.assertAdmin(user);
        const context = this.context(user, dto); const tool = await this.findTool(context, dto.tool); const parameters = dto.input || {};
        const approval = this.approvals.create({ tenantId: context.tenantId, projectId: context.projectId ?? null, toolId: tool.id, requestedBy: user.id, decidedBy: null, status: "pending", parameterDigest: digest(parameters), redactedParameters: redact(parameters), expiresAt: new Date(Date.now() + 5 * 60_000), reason: null });
        return this.approvals.save(approval);
    }

    async decideApproval(user: UserPlayground, id: string, dto: ApprovalDecisionDto) { this.assertAdmin(user); const row = await this.approvals.findOne({ where: { id, tenantId: this.requireTenant(user) } }); if (!row) throw HttpErrorFactory.notFound("Approval not found"); row.status = dto.status; row.reason = dto.reason ?? null; row.decidedBy = user.id; return this.approvals.save(row); }

    async listApprovals(user: UserPlayground) { this.assertAdmin(user); return this.approvals.find({ where: { tenantId: this.requireTenant(user) }, order: { createdAt: "DESC" }, take: 100 }); }
    async listExecutions(user: UserPlayground) { this.assertAdmin(user); return this.executions.find({ where: { tenantId: this.requireTenant(user) }, order: { createdAt: "DESC" }, take: 100 }); }
    async metrics(user: UserPlayground) {
        this.assertAdmin(user);
        const tenantId = this.requireTenant(user);
        const [executions, approvals] = await Promise.all([
            this.executions.find({ where: { tenantId }, order: { createdAt: "DESC" }, take: 5000 }),
            this.approvals.find({ where: { tenantId, status: "pending" }, order: { createdAt: "ASC" }, take: 5000 }),
        ]);
        const byOutcome = executions.reduce<Record<string, number>>((counts, execution) => {
            counts[execution.outcome] = (counts[execution.outcome] || 0) + 1;
            return counts;
        }, {});
        const blockedEgressReasons = new Set([
            "SSRF_PRIVATE_TARGET",
            "SSRF_RESOLVED_PRIVATE_TARGET",
            "SSRF_DNS_REBINDING",
            "SSRF_DNS_RESOLUTION_FAILED",
            "EGRESS_NOT_ALLOWLISTED",
            "EGRESS_METHOD_NOT_ALLOWED",
            "EGRESS_URL_INVALID",
            "REDIRECT_LIMIT",
        ]);
        const failureReasons = new Set(["EXECUTION_FAILED", "TIMEOUT", "CIRCUIT_OPEN"]);
        return {
            generatedAt: new Date().toISOString(),
            sampleSize: executions.length,
            byOutcome,
            blockedEgress: executions.filter((execution) => execution.denialReason && blockedEgressReasons.has(execution.denialReason)).length,
            toolFailures: executions.filter((execution) => execution.denialReason && failureReasons.has(execution.denialReason)).length,
            approvalBacklog: approvals.length,
            oldestPendingApprovalAt: approvals[0]?.createdAt ?? null,
            emergencyDisabled: this.emergencyDisabled,
        };
    }

    async execute(user: UserPlayground, dto: ExecuteToolDto) {
        this.assertAdmin(user);
        const context = this.context(user, dto); const started = Date.now(); const parameters = dto.input || {};
        let tool: ToolDefinition | undefined;
        try {
            tool = await this.findTool(context, dto.tool);
            if (this.emergencyDisabled) throw new GatewayDenied("EMERGENCY_DISABLED");
            this.checkUsage(context, tool);
            this.validateSchema(tool.inputSchema, parameters);
            if (tool.risk !== "READ" && tool.approvalMode !== "none") {
                const approval = dto.approvalId ? await this.approvals.findOne({ where: { id: dto.approvalId, tenantId: context.tenantId, toolId: tool.id } }) : null;
                if (!approval || approval.status !== "approved" || approval.expiresAt.getTime() < Date.now() || approval.parameterDigest !== digest(parameters)) throw new GatewayDenied("APPROVAL_REQUIRED");
            }
            if (tool.idempotencyRequired && !dto.idempotencyKey) throw new GatewayDenied("IDEMPOTENCY_KEY_REQUIRED");
            if (dto.idempotencyKey) { const previous = await this.executions.findOne({ where: { tenantId: context.tenantId, idempotencyKey: dto.idempotencyKey } }); if (previous) return { outcome: "replayed", executionId: previous.id, output: previous.redactedOutput }; }
            await this.checkEgress(tool, parameters);
            const count = this.inFlight.get(tool.id) || 0; if (count >= tool.maxConcurrency) throw new GatewayDenied("CONCURRENCY_LIMIT"); this.inFlight.set(tool.id, count + 1);
            try {
                const adapter = this.adapters.get(tool.name) || this.adapters.get(dto.tool);
                if (!adapter) throw new GatewayDenied("NO_ADAPTER");
                const attempts = tool.risk === "READ" ? Math.max(1, Math.min(tool.maxRetries + 1, 3)) : 1;
                let output: unknown;
                let attempt = 0;
                for (; attempt < attempts; attempt += 1) {
                    try { output = await withTimeout(adapter(parameters, context), tool.timeoutMs); this.failures.delete(tool.id); break; }
                    catch (error) { const state = this.failures.get(tool.id) || { count: 0, openedAt: 0 }; state.count += 1; state.openedAt = Date.now(); this.failures.set(tool.id, state); if (attempt + 1 >= attempts) throw error; }
                }
                if (JSON.stringify(output ?? {}).length > tool.responseSizeLimit) throw new GatewayDenied("RESPONSE_SIZE_LIMIT");
                let execution: ToolExecution;
                try {
                    execution = await this.record(user, tool, "allowed", parameters, output, dto.idempotencyKey, Date.now() - started, attempt + 1);
                } catch (error) {
                    // Two identical requests may pass the read-before-write check
                    // concurrently. Treat the unique-key winner as the canonical
                    // result and return it as a replay instead of leaking a 500.
                    if (dto.idempotencyKey && isUniqueViolation(error)) {
                        const previous = await this.executions.findOne({ where: { tenantId: context.tenantId, idempotencyKey: dto.idempotencyKey } });
                        if (previous) return { outcome: "replayed", executionId: previous.id, output: previous.redactedOutput };
                    }
                    throw error;
                }
                return { outcome: "allowed", executionId: execution.id, output: redact(output) };
            } finally { this.inFlight.set(tool.id, Math.max(0, (this.inFlight.get(tool.id) || 1) - 1)); }
        } catch (error) {
            const reason = error instanceof GatewayDenied ? error.code : "EXECUTION_FAILED";
            // A rejected/pending attempt must never reserve an idempotency key;
            // the same request has to be executable after an approval is granted.
            if (tool) await this.record(user, tool, reason === "APPROVAL_REQUIRED" ? "pending" : "denied", parameters, { error: reason }, reason === "APPROVAL_REQUIRED" ? undefined : dto.idempotencyKey, Date.now() - started, 1, reason);
            if (error instanceof GatewayDenied) throw HttpErrorFactory.forbidden(`Tool execution denied: ${reason}`);
            throw error;
        }
    }

    private async findTool(context: GatewayContext, name: string): Promise<ToolDefinition> {
        const builtin = BUILTIN_TOOLS[name];
        if (builtin) {
            if (context.requiredCapabilities && !context.requiredCapabilities.every((capability) => builtin.capabilities.includes(capability))) throw new GatewayDenied("CAPABILITY_NOT_DECLARED");
            const row = { id: `builtin:${name}`, tenantId: context.tenantId, projectId: context.projectId ?? null, agentVersionId: context.agentVersionId ?? null, environment: context.environment ?? null, name, version: "builtin", description: builtin.description, capabilities: builtin.capabilities, inputSchema: {}, outputSchema: {}, risk: builtin.risk, credentialRef: null, timeoutMs: 10000, responseSizeLimit: 1048576, networkPolicy: {}, idempotencyRequired: builtin.risk !== "READ", approvalMode: builtin.risk === "WRITE" ? "approval" : "none", maxConcurrency: 4, maxRetries: 0, budgetLimit: 0, rateLimitPerMinute: 0, status: this.emergencyDisabled ? "disabled" : "active", policyVersion: 1, createdBy: null } as ToolDefinition;
            this.assertCircuit(row.id);
            return row;
        }
        const rows = await this.tools.find({ where: [{ tenantId: context.tenantId, name }, { tenantId: null, name }] });
        const row = rows.find((item) => item.status === "active" && (!context.projectId || !item.projectId || item.projectId === context.projectId) && (!context.agentVersionId || !item.agentVersionId || item.agentVersionId === context.agentVersionId) && (!context.environment || !item.environment || item.environment === context.environment) && (!context.requiredCapabilities || context.requiredCapabilities.every((capability) => item.capabilities.includes(capability))));
        if (!row) throw new GatewayDenied("TOOL_NOT_REGISTERED");
        this.assertCircuit(row.id);
        return row;
    }
    private async scopedTool(user: UserPlayground, id: string) { const row = await this.tools.findOne({ where: { id, tenantId: this.requireTenant(user) } }); if (!row) throw HttpErrorFactory.notFound("Tool not found"); return row; }
    private context(user: UserPlayground, dto: ExecuteToolDto): GatewayContext { return { tenantId: this.requireTenant(user), projectId: dto.projectId || user.projectId || undefined, agentVersionId: dto.agentVersionId, environment: dto.environment || process.env.NODE_ENV || "development", requiredCapabilities: dto.requiredCapabilities, userId: user.id }; }
    private checkUsage(context: GatewayContext, tool: ToolDefinition): void { const limits = [tool.rateLimitPerMinute || 0, tool.budgetLimit || 0].filter((value) => value > 0); if (limits.length === 0) return; const limit = Math.min(...limits); const key = `${context.tenantId}:${tool.id}`; const now = Date.now(); const current = this.usage.get(key); const window = current && now - current.windowStartedAt < 60_000 ? current : { windowStartedAt: now, count: 0 }; if (window.count >= limit) throw new GatewayDenied(tool.rateLimitPerMinute > 0 && window.count >= tool.rateLimitPerMinute ? "RATE_LIMITED" : "BUDGET_EXCEEDED"); window.count += 1; this.usage.set(key, window); }
    private assertCircuit(toolId: string): void { const state = this.failures.get(toolId); if (state && state.count >= 5 && Date.now() - state.openedAt < 30_000) throw new GatewayDenied("CIRCUIT_OPEN"); }
    private requireTenant(user: UserPlayground): string { if (!user.tenantId) throw HttpErrorFactory.badRequest("Select an active tenant before using the Tool Gateway"); return user.tenantId; }
    private assertAdmin(user: UserPlayground): void {
        if (user.isRoot || user.tenantRoleCode === "admin") return;
        if (!(user.permissions || []).some((permission) => {
            const value = typeof permission === "string" ? permission : String(permission);
            return value.includes("tool-gateway");
        })) throw HttpErrorFactory.forbidden("Tool Gateway administrator permission required");
    }
    private validateSchema(schema: Record<string, unknown>, input: Record<string, unknown>) {
        try {
            if (!this.ajv.validate(schema, input)) throw new GatewayDenied("SCHEMA_INVALID");
        } catch (error) {
            if (error instanceof GatewayDenied) throw error;
            throw new GatewayDenied("SCHEMA_INVALID");
        }
    }
    private async checkEgress(tool: ToolDefinition, input: Record<string, unknown>) {
        const policy = tool.networkPolicy || {};
        const requestBytes = Buffer.byteLength(JSON.stringify(input ?? {}), "utf8");
        const maxRequestSize = typeof policy.maxRequestSize === "number" ? policy.maxRequestSize : 1_048_576;
        if (requestBytes > maxRequestSize) throw new GatewayDenied("REQUEST_SIZE_LIMIT");
        const method = typeof input.method === "string" ? input.method.toUpperCase() : "GET";
        const methods = Array.isArray(policy.methods) && policy.methods.length > 0 ? policy.methods.map(String).map((item) => item.toUpperCase()) : ["GET", "POST"];
        if (!methods.includes(method)) throw new GatewayDenied("EGRESS_METHOD_NOT_ALLOWED");
        const url = typeof input.url === "string" ? input.url : typeof input.endpoint === "string" ? input.endpoint : undefined;
        if (!url) return;
        const redirects = Array.isArray(input.redirects) ? input.redirects.filter((item): item is string => typeof item === "string") : [];
        const maxRedirects = typeof policy.maxRedirects === "number" ? policy.maxRedirects : 0;
        if (redirects.length > maxRedirects) throw new GatewayDenied("REDIRECT_LIMIT");
        const urls = [url, ...redirects];
        const protocols = Array.isArray(policy.protocols) ? policy.protocols : ["https:"];
        const domains = Array.isArray(policy.domains) ? policy.domains : [];
        const ports = Array.isArray(policy.ports) ? policy.ports.map(String) : [];
        for (const rawTarget of urls) {
            let parsed: URL;
            try { parsed = new URL(rawTarget); } catch { throw new GatewayDenied("EGRESS_URL_INVALID"); }
            const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
            if (!protocols.includes(parsed.protocol) || (domains.length > 0 && !domains.includes(parsed.hostname)) || (ports.length > 0 && !ports.includes(port))) throw new GatewayDenied("EGRESS_NOT_ALLOWLISTED");
            if (isPrivateNetworkTarget(parsed.hostname)) throw new GatewayDenied("SSRF_PRIVATE_TARGET");
            try {
                await resolveStablePublicAddresses(parsed.hostname);
            } catch (error) {
                const reason = error instanceof Error ? error.message : "DNS_RESOLUTION_FAILED";
                if (reason === "RESOLVED_PRIVATE_TARGET") throw new GatewayDenied("SSRF_RESOLVED_PRIVATE_TARGET");
                if (reason === "DNS_REBINDING_DETECTED") throw new GatewayDenied("SSRF_DNS_REBINDING");
                throw new GatewayDenied("SSRF_DNS_RESOLUTION_FAILED");
            }
        }
    }
    private signingKey(): string { const configured = process.env.BUILDINGAI_TOOL_GATEWAY_SIGNING_KEY?.trim(); if (configured) return configured; if (process.env.NODE_ENV === "production") throw new GatewayDenied("SIGNING_KEY_NOT_CONFIGURED"); return "buildingai-local-tool-gateway"; }
    private async record(user: UserPlayground, tool: ToolDefinition, outcome: ToolExecution["outcome"], input: unknown, output: unknown, key: string | undefined, latencyMs: number, attempts: number, reason: string | null = null) { return this.executions.save(this.executions.create({ tenantId: this.requireTenant(user), projectId: user.projectId || null, toolId: tool.id, toolName: tool.name, toolVersion: tool.version, actorId: user.id, risk: tool.risk, outcome, denialReason: reason, parameterDigest: digest(input), redactedInput: redact(input), redactedOutput: redact(output), attempts, latencyMs, idempotencyKey: key || null, policyVersion: String(tool.policyVersion) })); }
    private metadata(row: ToolDefinition) { return { id: row.id, name: row.name, version: row.version, environment: row.environment, description: row.description, capabilities: row.capabilities, risk: row.risk, status: row.status, approvalMode: row.approvalMode, idempotencyRequired: row.idempotencyRequired, policyVersion: row.policyVersion, networkPolicy: row.networkPolicy, budgetLimit: row.budgetLimit, rateLimitPerMinute: row.rateLimitPerMinute }; }
}

export class GatewayDenied extends Error { constructor(public readonly code: string) { super(code); } }
function isUniqueViolation(error: unknown): boolean {
    return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "23505");
}
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> { let timer: ReturnType<typeof setTimeout> | undefined; try { return await Promise.race([promise, new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new GatewayDenied("TIMEOUT")), timeoutMs); })]); } finally { if (timer) clearTimeout(timer); } }
