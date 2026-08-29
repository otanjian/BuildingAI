import { Injectable } from "@nestjs/common";

import type {
    AutomationChannelAdapter,
    AutomationCommandContext,
    AutomationDeliveryTarget,
    DeliveryReceipt,
} from "../domain/automation.types";
import { FeishuChannelService } from "../../channel/feishu/feishu-channel.service";

@Injectable()
export class FeishuAutomationAdapter implements AutomationChannelAdapter {
    readonly channel = "feishu";

    constructor(private readonly feishuChannelService: FeishuChannelService) {}

    async validateTarget(target: AutomationDeliveryTarget): Promise<void> {
        if (target.channel !== this.channel || !target.accountId || !target.targetId) {
            throw new Error("Invalid Feishu delivery target");
        }
        if (!/^(oc_|ou_|on_)/.test(target.targetId)) {
            throw new Error("Invalid Feishu chat or user target");
        }
        await this.feishuChannelService.validateAutomationAccount(target.accountId);
    }

    sendText(target: AutomationDeliveryTarget, content: string, idempotencyKey: string): Promise<DeliveryReceipt> {
        return this.feishuChannelService.sendProactiveText(target.accountId, target.targetType, target.targetId, content, idempotencyKey);
    }

    replyToInteraction(context: AutomationCommandContext, content: string, idempotencyKey: string): Promise<DeliveryReceipt> {
        return this.feishuChannelService.sendProactiveText(context.accountId, "chat", context.conversationId, content, idempotencyKey);
    }
}
