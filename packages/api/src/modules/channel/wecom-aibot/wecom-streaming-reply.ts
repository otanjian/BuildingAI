import type { WSClient, WsFrame } from "@wecom/aibot-node-sdk";

import { truncateWecomStreamContent } from "./wecom-aibot-channel.utils";

type ReplyClient = Pick<WSClient, "replyStream">;
type SendGuard = () => boolean | Promise<boolean>;

export class WecomStreamingReply {
    private latestContent = "";
    private lastSentAt?: number;
    private timer?: ReturnType<typeof setTimeout>;
    private queue: Promise<void> = Promise.resolve();
    private sendError?: Error;
    private lastSentContent = "";

    constructor(
        private readonly client: ReplyClient,
        private readonly frame: WsFrame,
        private readonly streamId: string,
        private readonly canSend: SendGuard,
        private readonly updateIntervalMs = 4_000,
        private readonly maxBytes = 20_000,
        private readonly reserveSendSlot?: () => Promise<void>,
    ) {}

    update(content: string): void {
        this.latestContent = truncateWecomStreamContent(content, this.maxBytes);
        if (!this.latestContent || this.sendError) return;
        const remaining =
            this.lastSentAt !== undefined
                ? this.updateIntervalMs - (Date.now() - this.lastSentAt)
                : 0;
        if (remaining <= 0) {
            this.clearTimer();
            this.enqueue(false);
        } else if (!this.timer) {
            this.timer = setTimeout(() => {
                this.timer = undefined;
                this.enqueue(false);
            }, remaining);
        }
    }

    async finish(content = this.latestContent): Promise<boolean> {
        this.clearTimer();
        this.latestContent = truncateWecomStreamContent(
            content.trim() || "Agent returned an empty response.",
            this.maxBytes,
        );
        await this.queue;
        if (this.sendError) throw this.sendError;
        if (!(await this.canSend())) return false;
        const remaining = this.lastSentAt
            ? this.updateIntervalMs - (Date.now() - this.lastSentAt)
            : 0;
        if (remaining > 0) {
            await new Promise<void>((resolve) => setTimeout(resolve, remaining));
        }
        this.enqueue(true);
        await this.queue;
        if (this.sendError) throw this.sendError;
        return this.sentFinal;
    }

    private sentFinal = false;

    private enqueue(finish: boolean): void {
        if (this.sendError || !this.latestContent) return;
        const content = this.latestContent;
        if (!finish && content === this.lastSentContent) return;
        this.lastSentAt = Date.now();
        this.queue = this.queue.then(async () => {
            if (this.sendError || !(await this.canSend())) return;
            try {
                await this.reserveSendSlot?.();
                if (!(await this.canSend())) return;
                await this.client.replyStream(this.frame, this.streamId, content, finish);
                this.lastSentContent = content;
                if (finish) this.sentFinal = true;
            } catch (error) {
                this.sendError = error as Error;
            }
        });
    }

    private clearTimer(): void {
        if (!this.timer) return;
        clearTimeout(this.timer);
        this.timer = undefined;
    }
}
