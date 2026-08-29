import { RedisService } from "@buildingai/cache";
import { Injectable } from "@nestjs/common";

import type { AutomationCommand, AutomationCommandContext } from "../domain/automation.types";

const PENDING_TTL_SECONDS = 10 * 60;

export interface PendingAutomationConfirmation {
    context: Pick<
        AutomationCommandContext,
        "actorId" | "tenantId" | "channel" | "accountId" | "conversationId"
    >;
    command: AutomationCommand;
    preview: string;
    createdAt: string;
}

/** Stores confirmation previews outside the database until the user explicitly accepts them. */
@Injectable()
export class AutomationConfirmationService {
    constructor(private readonly redisService: RedisService) {}

    async save(
        context: AutomationCommandContext,
        command: AutomationCommand,
        preview: string,
    ): Promise<void> {
        const pending: PendingAutomationConfirmation = {
            context: {
                actorId: context.actorId,
                tenantId: context.tenantId,
                channel: context.channel,
                accountId: context.accountId,
                conversationId: context.conversationId,
            },
            command: { ...command },
            preview: preview.slice(0, 2_000),
            createdAt: new Date().toISOString(),
        };
        await this.redisService.set(
            this.key(context),
            JSON.stringify(pending),
            PENDING_TTL_SECONDS,
        );
    }

    async consume(
        context: AutomationCommandContext,
    ): Promise<PendingAutomationConfirmation | undefined> {
        const key = this.key(context);
        const redis = this.redisService as RedisService & {
            getDel?: <T>(key: string) => Promise<T | null>;
        };
        const raw =
            typeof redis.getDel === "function"
                ? await redis.getDel<string>(key)
                : ((await this.redisService.executeCommand("GETDEL", key)) as string | null);
        if (!raw) return undefined;
        try {
            const pending = JSON.parse(raw) as PendingAutomationConfirmation;
            if (!this.matches(pending, context)) return undefined;
            return pending;
        } catch {
            return undefined;
        }
    }

    async cancel(context: AutomationCommandContext): Promise<void> {
        await this.redisService.del(this.key(context));
    }

    key(
        context: Pick<
            AutomationCommandContext,
            "actorId" | "tenantId" | "channel" | "accountId" | "conversationId"
        >,
    ): string {
        return [
            "automation:pending",
            context.channel,
            context.accountId,
            context.tenantId || "-",
            context.actorId,
            context.conversationId,
        ]
            .map((part) => encodeURIComponent(part))
            .join(":");
    }

    private matches(
        pending: PendingAutomationConfirmation,
        context: AutomationCommandContext,
    ): boolean {
        const expected = pending.context;
        return (
            expected.actorId === context.actorId &&
            expected.channel === context.channel &&
            expected.accountId === context.accountId &&
            (expected.tenantId || undefined) === (context.tenantId || undefined) &&
            expected.conversationId === context.conversationId
        );
    }
}
