import type {
    FeishuChannelConfig,
    FeishuChannelEvent,
    FeishuResolvedIdentity,
} from "../../channel/feishu/feishu-channel.types";
import { Injectable, Logger } from "@nestjs/common";

import type { AutomationCommand, AutomationCommandContext } from "../domain/automation.types";
import { nextOccurrence } from "../domain/schedule-calculator";
import { AutomationCommandParser } from "./automation-command.parser";
import { AutomationConfirmationService } from "./automation-confirmation.service";
import { AutomationIntentParser } from "./automation-intent.parser";
import { deriveAutomationCreatorId } from "./automation-identity";
import { AutomationBowiProvider } from "../mcp/automation-bowi.provider";
import { FeishuAutomationAdapter } from "../infrastructure/feishu-automation.adapter";

@Injectable()
export class FeishuAutomationCommandHandler {
    private readonly logger = new Logger(FeishuAutomationCommandHandler.name);

    constructor(
        private readonly parser: AutomationCommandParser,
        private readonly intentParser: AutomationIntentParser,
        private readonly confirmations: AutomationConfirmationService,
        private readonly automationBowiProvider: AutomationBowiProvider,
        private readonly adapter: FeishuAutomationAdapter,
    ) {}

    async handle(
        config: FeishuChannelConfig,
        event: FeishuChannelEvent,
        text: string,
        eventId: string,
        identity?: FeishuResolvedIdentity,
    ): Promise<boolean> {
        const message = event.message;
        if (!message) return false;
        const context: AutomationCommandContext = {
            actorId: deriveAutomationCreatorId({
                channel: "feishu",
                accountId: config.connectionId || config.agentId,
                externalActorId:
                    event.sender?.sender_id?.open_id ||
                    event.sender?.sender_id?.user_id ||
                    message.chat_id,
                localCreatorId: identity?.localUserId,
            }),
            channel: "feishu",
            accountId: config.connectionId || config.agentId,
            conversationId: message.chat_id,
            eventId,
            agentId: config.agentId,
        };
        try {
            const command = this.parser.parse(text, eventId);
            if (command) {
                await this.executeCommand(config, context, message.chat_id, command);
                return true;
            }

            if (
                AutomationIntentParser.isConfirmation(text) ||
                AutomationIntentParser.isCancellation(text)
            ) {
                const pending = await this.confirmations.consume(context);
                if (!pending) return false;
                if (AutomationIntentParser.isCancellation(text)) {
                    await this.reply(
                        context,
                        "已取消本次定时任务创建，未保存任何任务。",
                        `confirmation:${eventId}`,
                    );
                    return true;
                }
                const confirmedCommand: AutomationCommand = {
                    ...pending.command,
                    idempotencyKey: eventId,
                };
                const job = await this.createTask(config, context, message.chat_id, confirmedCommand);
                const smokeRun = await this.automationBowiProvider.executeForChannel(
                    "automation_run",
                    { taskId: String((job as any).id), idempotencyKey: `smoke:${eventId}` },
                    context,
                    this.scope(config, message.chat_id),
                ) as { runId?: string };
                await this.reply(
                    context,
                    `已确认并创建定时任务 ${job.id}\n名称：${job.name}\n计划：${formatSchedule(job.schedule, job.timezone)}\n下次执行：${job.nextRunAt.toISOString()}\n已触发一次验证运行，运行 ID：${smokeRun.runId || "queued"}\n可用 /tasks pause|resume|run|cancel ${job.id} 管理。`,
                    `confirmation:${eventId}`,
                );
                return true;
            }

            const intent = this.intentParser.parse(text, eventId);
            if (!intent) return false;
            if (intent.status === "clarification") {
                await this.reply(
                    context,
                    `我识别到这是定时任务请求，但还缺少：${formatMissing(intent.missing)}。请补充后再试；任务不会在信息不完整时创建。`,
                    `intent:${eventId}`,
                );
                return true;
            }
            const preview = this.buildPreview(intent.command);
            await this.confirmations.save(context, intent.command, preview);
            await this.reply(
                context,
                `${preview}\n\n回复“确认”创建，或回复“取消”放弃（10 分钟内有效）。`,
                `preview:${eventId}`,
            );
            return true;
        } catch (error) {
            this.logger.warn(`Automation command failed: ${(error as Error).message}`);
            await this.reply(
                context,
                `定时任务操作失败：${safeCommandError(error)}`,
                `error:${eventId}`,
            );
            return true;
        }
    }

    private async executeCommand(
        config: FeishuChannelConfig,
        context: AutomationCommandContext,
        chatId: string,
        command: AutomationCommand,
    ): Promise<void> {
        if (command.operation === "create") {
            const job = await this.createTask(config, context, chatId, command);
            await this.reply(
                context,
                `已创建定时任务 ${job.id}\n名称：${job.name}\n计划：${formatSchedule(job.schedule as unknown as Record<string, unknown>, job.timezone)}\n下次执行：${job.nextRunAt.toISOString()}\n可用 /tasks pause|resume|run|cancel ${job.id} 管理。`,
            );
        } else if (command.operation === "list") {
            const jobs = await this.automationBowiProvider.executeForChannel(
                "automation_search",
                {},
                context,
                this.scope(config, chatId),
            ) as Array<any>;
            await this.reply(
                context,
                jobs.length
                    ? jobs
                          .map(
                              (job) =>
                                  `${job.id} ${job.name} [${job.status}] next=${job.nextRunAt.toISOString()}`,
                          )
                          .join("\n")
                    : "当前会话没有定时任务。",
            );
        } else if (command.operation === "run") {
            const run = await this.automationBowiProvider.executeForChannel(
                "automation_run",
                { taskId: command.taskId!, idempotencyKey: context.eventId },
                context,
                this.scope(config, chatId),
            ) as { runId?: string };
            await this.reply(context, `已触发任务 ${command.taskId}，运行 ID：${run.runId || "queued"}`);
        } else {
            const job = await this.automationBowiProvider.executeForChannel(
                `automation_${command.operation === "cancel" ? "delete" : command.operation}`,
                { taskId: command.taskId! },
                context,
                this.scope(config, chatId),
            ) as any;
            await this.reply(
                context,
                `任务 ${job.id} 已${command.operation === "pause" ? "暂停" : command.operation === "resume" ? "恢复" : "取消"}。`,
            );
        }
    }

    private createTask(
        config: FeishuChannelConfig,
        context: AutomationCommandContext,
        chatId: string,
        command: AutomationCommand,
    ) {
        if (command.operation !== "create" || !command.name || !command.prompt || !command.schedule)
            throw new Error("A complete create command is required");
        return this.automationBowiProvider.executeForChannel(
            "automation_create",
            {
                name: command.name,
                prompt: command.prompt,
                schedule: command.schedule,
                idempotencyKey: command.idempotencyKey,
            },
            { ...context, agentId: command.agentId || config.agentId },
            this.scope(config, chatId),
        ) as Promise<any>;
    }

    private scope(config: FeishuChannelConfig, chatId: string) {
        return {
            channel: "feishu",
            accountId: config.connectionId || config.agentId,
            targetType: "chat" as const,
            targetId: chatId,
            conversationId: chatId,
        };
    }

    private buildPreview(command: AutomationCommand): string {
        if (command.operation !== "create" || !command.schedule) return "";
        const nextRun = nextOccurrence(command.schedule, new Date(Date.now() - 1_000));
        return [
            "我将创建以下定时任务：",
            `名称：${command.name}`,
            `执行内容：${command.prompt}`,
            `计划：${formatSchedule(command.schedule as unknown as Record<string, unknown>, command.schedule.kind === "cron" ? command.schedule.timezone : "Asia/Shanghai")}`,
            `下次执行：${nextRun?.toISOString() || "无法计算"}`,
        ].join("\n");
    }

    private reply(
        context: AutomationCommandContext,
        content: string,
        idempotencyKey = `confirmation:${context.eventId}`,
    ) {
        return this.adapter.replyToInteraction(context, content, idempotencyKey);
    }
}

function formatSchedule(schedule: Record<string, unknown>, timezone: string): string {
    if (schedule.kind === "at") return `一次性 ${String(schedule.at)}`;
    if (schedule.kind === "every") return `每 ${String(schedule.intervalSeconds)} 秒 (${timezone})`;
    return `cron ${String(schedule.expression)} (${timezone})`;
}

function formatMissing(missing: string[]): string {
    return missing
        .map(
            (field) =>
                ({
                    time: "具体时间（例如 7:25）",
                    recurrence: "重复周期（例如每天、每周一）",
                    prompt: "要执行的内容",
                })[field] || field,
        )
        .join("、");
}

function safeCommandError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message
        .replaceAll(/(token|secret|password|authorization)[^\s]*/gi, "[REDACTED]")
        .slice(0, 300);
}
