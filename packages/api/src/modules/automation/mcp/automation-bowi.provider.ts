import type {
    BowiAutomationScope,
    BowiMcpProvider,
    BowiMcpTool,
    BowiPrincipal,
} from "../../bowi-mcp/types/bowi-mcp.types";
import Ajv, { type ValidateFunction } from "ajv";
import {
    BowiToolExecutionError,
    BowiToolInputError,
} from "../../bowi-mcp/services/bowi-mcp-registry.service";
import { Injectable } from "@nestjs/common";

import type { AutomationCommandContext, AutomationDeliveryTarget, AutomationSchedule } from "../domain/automation.types";
import { AutomationService, type UpdateAutomationInput } from "../application/automation.service";

const string = (description: string, options: Record<string, unknown> = {}) => ({
    type: "string",
    description,
    ...options,
});
const schedule = {
    type: "object",
    description: "Normalized at/every/cron schedule",
    properties: {
        kind: { type: "string", enum: ["at", "every", "cron"] },
        at: string("Future ISO timestamp for a one-shot schedule"),
        intervalSeconds: { type: "integer", minimum: 60, description: "Anchored interval" },
        anchorAt: string("ISO timestamp used as the recurrence anchor"),
        expression: string("Five-field cron expression"),
        timezone: string("IANA timezone, for example Asia/Shanghai"),
    },
    required: ["kind"],
    additionalProperties: false,
};

/**
 * Canonical Bowi MCP facade for durable automations.
 *
 * Channel adapters may call executeForChannel after their own transport-level confirmation. The
 * actual persistence, scope checks, and idempotency remain in AutomationService and are shared by
 * MCP, web, and scheduler callers.
 */
@Injectable()
export class AutomationBowiProvider implements BowiMcpProvider {
    readonly bowiMcpProvider = true as const;
    readonly namespace = "automation";
    readonly tools: BowiMcpTool[];
    private readonly ajv = new Ajv({ allErrors: true, strict: false });
    private readonly validators = new Map<string, ValidateFunction>();

    constructor(private readonly automationService: AutomationService) {
        this.tools = [
            this.tool(
                "automation_create",
                "Create a durable scheduled agent task for the verified channel scope. Creator, agent, target, and policy come from the principal; never invent them.",
                {
                    name: { ...string("Task name"), minLength: 1, maxLength: 200 },
                    prompt: { ...string("Prompt sent to the agent"), minLength: 1, maxLength: 12000 },
                    schedule,
                    idempotencyKey: { ...string("Stable create idempotency key"), minLength: 1, maxLength: 128 },
                    deleteAfterRun: { type: "boolean", default: false },
                    missedRunPolicy: { type: "string", enum: ["fire_once", "skip", "catch_up"], default: "fire_once" },
                    overlapPolicy: { type: "string", enum: ["skip", "queue_one", "allow"], default: "skip" },
                    timeoutSeconds: { type: "integer", minimum: 1, maximum: 86400, default: 900 },
                },
                ["name", "prompt", "schedule", "idempotencyKey"],
                (args, principal) => this.create(args, principal),
                { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            ),
            this.tool(
                "automation_search",
                "List durable automations visible to the verified creator. When a channel scope is present, limit results to that conversation.",
                {
                    keyword: string("Optional name or prompt filter", { maxLength: 100 }),
                    status: { type: "string", enum: ["active", "paused", "cancelled", "completed", "failed", "all"], default: "all" },
                },
                [],
                (args, principal) => this.search(args, principal),
                { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            ),
            this.tool(
                "automation_get",
                "Get one durable automation visible to the verified creator.",
                { taskId: string("Task id", { minLength: 1 }) },
                ["taskId"],
                (args, principal) => this.get(args, principal),
                { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            ),
            this.tool(
                "automation_update",
                "Update a creator-owned task definition. Pass expectedUpdatedAt from the latest read to prevent stale overwrites.",
                {
                    taskId: string("Task id", { minLength: 1 }),
                    name: { ...string("New task name"), minLength: 1, maxLength: 200 },
                    prompt: { ...string("New agent prompt"), minLength: 1, maxLength: 12000 },
                    schedule,
                    expectedUpdatedAt: string("Latest task updatedAt for optimistic concurrency", { format: "date-time" }),
                },
                ["taskId"],
                (args, principal) => this.update(args, principal),
                { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
            ),
            ...(["pause", "resume"] as const).map((operation) =>
                this.tool(
                    `automation_${operation}`,
                    `${operation === "pause" ? "Pause" : "Resume"} a creator-owned durable automation.`,
                    {
                        taskId: string("Task id", { minLength: 1 }),
                        expectedUpdatedAt: string("Latest task updatedAt for optimistic concurrency", { format: "date-time" }),
                    },
                    ["taskId"],
                    (args, principal) => this.transition(operation, args, principal),
                    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
                ),
            ),
            this.tool(
                "automation_run",
                "Queue one auditable manual run without changing the task's recurring next occurrence.",
                {
                    taskId: string("Task id", { minLength: 1 }),
                    idempotencyKey: { ...string("Stable manual-run idempotency key"), minLength: 1, maxLength: 128 },
                },
                ["taskId", "idempotencyKey"],
                (args, principal) => this.run(args, principal),
                { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
            ),
            this.tool(
                "automation_delete",
                "Cancel a creator-owned task while retaining run and delivery audit history.",
                {
                    taskId: string("Task id", { minLength: 1 }),
                    expectedUpdatedAt: string("Latest task updatedAt for optimistic concurrency", { format: "date-time" }),
                },
                ["taskId"],
                (args, principal) => this.transition("cancel", args, principal),
                { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
            ),
        ];
        this.ajv.addFormat("date-time", {
            type: "string",
            validate: (value: string) => value.includes("T") && Number.isFinite(Date.parse(value)),
        });
        for (const tool of this.tools) this.validators.set(tool.name, this.ajv.compile(tool.inputSchema));
    }

    async executeForChannel(
        name: string,
        args: Record<string, unknown>,
        context: AutomationCommandContext,
        scope: BowiAutomationScope,
    ): Promise<unknown> {
        const tool = this.tools.find((candidate) => candidate.name === name);
        if (!tool) throw new Error(`Unknown automation tool: ${name}`);
        return this.executeTool(tool, args, this.principalForChannel(context, scope));
    }

    async executeForCreator(
        name: string,
        args: Record<string, unknown>,
        creatorId: string,
        agentId?: string,
    ): Promise<unknown> {
        const tool = this.tools.find((candidate) => candidate.name === name);
        if (!tool) throw new Error(`Unknown automation tool: ${name}`);
        return this.executeTool(tool, args, {
            actor: { kind: "user", id: creatorId },
            subjectUserId: creatorId,
            authSource: "login",
            ...(agentId ? { agentId } : {}),
            capabilities: new Set(["automation.personal"]),
        });
    }

    private executeTool(
        tool: BowiMcpTool,
        args: Record<string, unknown>,
        principal: BowiPrincipal,
    ): Promise<unknown> {
        const validator = this.validators.get(tool.name);
        const normalized = args ?? {};
        if (!validator || !validator(normalized)) {
            const detail = validator
                ? this.ajv.errorsText(validator.errors, { separator: "; " })
                : "Unknown automation tool schema";
            throw new BowiToolInputError(`Invalid tool arguments: ${detail}`);
        }
        return tool.execute(normalized, principal);
    }

    private principalForChannel(
        context: AutomationCommandContext,
        scope: BowiAutomationScope,
    ): BowiPrincipal {
        return {
            actor: { kind: "user", id: context.actorId },
            subjectUserId: context.actorId,
            authSource: "login",
            ...(context.agentId ? { agentId: context.agentId } : {}),
            conversationId: context.conversationId,
            capabilities: new Set(["automation.personal"]),
            automationScope: scope,
        };
    }

    private tool(
        name: string,
        description: string,
        properties: Record<string, unknown>,
        required: string[],
        execute: BowiMcpTool["execute"],
        annotations: BowiMcpTool["annotations"],
    ): BowiMcpTool {
        return {
            name,
            description,
            inputSchema: {
                type: "object",
                properties,
                ...(required.length ? { required } : {}),
                additionalProperties: false,
            },
            capability: "automation.personal",
            annotations,
            execute,
        };
    }

    private context(principal: BowiPrincipal, requireScope = false): AutomationCommandContext {
        const scope = principal.automationScope;
        if (!principal.subjectUserId) {
            throw new BowiToolExecutionError("AUTOMATION_SUBJECT_REQUIRED", "A verified personal principal is required");
        }
        if (requireScope && !scope) {
            throw new BowiToolExecutionError("AUTOMATION_SCOPE_REQUIRED", "A signed channel scope is required for this automation operation");
        }
        if (!scope) {
            return {
                actorId: principal.subjectUserId,
                ...(principal.agentId ? { agentId: principal.agentId } : {}),
                channel: "",
                accountId: "",
                conversationId: "",
                eventId: principal.callId || `bowi:${principal.sessionId || principal.subjectUserId}`,
            };
        }
        return {
            actorId: principal.subjectUserId,
            ...(principal.agentId ? { agentId: principal.agentId } : {}),
            tenantId: scope.tenantId,
            channel: scope.channel,
            accountId: scope.accountId,
            conversationId: scope.conversationId,
            eventId: principal.callId || `bowi:${principal.sessionId || principal.subjectUserId}`,
        };
    }

    private creatorId(principal: BowiPrincipal): string {
        if (!principal.subjectUserId) {
            throw new BowiToolExecutionError("AUTOMATION_SUBJECT_REQUIRED", "A verified personal principal is required");
        }
        return principal.subjectUserId;
    }

    private async create(args: Record<string, unknown>, principal: BowiPrincipal) {
        const context = this.context(principal, true);
        const scope = principal.automationScope!;
        const created = await this.automationService.create({
            context: { ...context, eventId: String(args.idempotencyKey) },
            agentId: principal.agentId || "",
            name: String(args.name),
            prompt: String(args.prompt),
            schedule: args.schedule as AutomationSchedule,
            target: scope as AutomationDeliveryTarget,
            deleteAfterRun: args.deleteAfterRun as boolean | undefined,
            missedRunPolicy: args.missedRunPolicy as "fire_once" | "skip" | "catch_up" | undefined,
            overlapPolicy: args.overlapPolicy as "skip" | "queue_one" | "allow" | undefined,
            timeoutSeconds: args.timeoutSeconds as number | undefined,
        });
        return this.publicTask(created as unknown as Record<string, unknown>);
    }

    private async search(args: Record<string, unknown>, principal: BowiPrincipal) {
        const jobs = principal.automationScope
            ? await this.automationService.listForScope(this.context(principal))
            : await this.automationService.listForCreator(this.creatorId(principal));
        const keyword = typeof args.keyword === "string" ? args.keyword.trim().toLowerCase() : "";
        const status = typeof args.status === "string" ? args.status : "all";
        return jobs.filter((job) => {
            const matchesKeyword = !keyword || `${job.name} ${job.prompt}`.toLowerCase().includes(keyword);
            return matchesKeyword && (status === "all" || job.status === status);
        });
    }

    private async get(args: Record<string, unknown>, principal: BowiPrincipal) {
        const id = String(args.taskId);
        return principal.automationScope
            ? this.automationService.detailForScope(this.context(principal), id)
            : this.automationService.detailForCreator(this.creatorId(principal), id);
    }

    private async update(args: Record<string, unknown>, principal: BowiPrincipal) {
        const id = String(args.taskId);
        const input: UpdateAutomationInput = {
            ...(args.name !== undefined ? { name: String(args.name) } : {}),
            ...(args.prompt !== undefined ? { prompt: String(args.prompt) } : {}),
            ...(args.schedule !== undefined ? { schedule: args.schedule as AutomationSchedule } : {}),
            ...(args.expectedUpdatedAt !== undefined ? { expectedUpdatedAt: String(args.expectedUpdatedAt) } : {}),
        };
        return principal.automationScope
            ? this.automationService.update(this.context(principal), id, input)
            : this.automationService.updateForCreator(this.creatorId(principal), id, input);
    }

    private async transition(
        operation: "pause" | "resume" | "cancel",
        args: Record<string, unknown>,
        principal: BowiPrincipal,
    ) {
        const id = String(args.taskId);
        const expected = args.expectedUpdatedAt === undefined ? undefined : String(args.expectedUpdatedAt);
        const result = principal.automationScope
            ? await this.automationService.transitionForScope(this.context(principal), id, operation, expected)
            : await this.automationService.transitionForCreator(this.creatorId(principal), id, operation, expected);
        return result;
    }

    private async run(args: Record<string, unknown>, principal: BowiPrincipal) {
        const id = String(args.taskId);
        const key = String(args.idempotencyKey);
        const run = principal.automationScope
            ? await this.automationService.runOnce(this.context(principal), id, key)
            : await this.automationService.runOnceForCreator(this.creatorId(principal), id, key);
        return { taskId: id, runId: run.id, status: run.status };
    }

    private publicTask(job: Record<string, unknown>): Record<string, unknown> {
        return {
            id: job.id,
            name: job.name,
            updatedAt: job.updatedAt,
            agentId: job.agentId,
            scheduleKind: job.scheduleKind,
            schedule: job.schedule,
            timezone: job.timezone,
            channel: job.channel,
            status: job.status,
            nextRunAt: job.nextRunAt,
            lastRunAt: job.lastRunAt,
        };
    }
}
