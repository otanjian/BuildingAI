import AiBot, {
    type Logger as WecomLogger,
    type WSClient,
    type WSClientOptions,
} from "@wecom/aibot-node-sdk";
import { Injectable } from "@nestjs/common";

const silentLogger: WecomLogger = {
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
};

export interface WecomAibotClientOptions {
    botId: string;
    secret: string;
    logger?: WecomLogger;
    maxReconnectAttempts?: number;
    maxAuthFailureAttempts?: number;
}

@Injectable()
export class WecomAibotClientFactory {
    create(options: WecomAibotClientOptions): WSClient {
        const clientOptions: WSClientOptions = {
            botId: options.botId,
            secret: options.secret,
            logger: options.logger ?? silentLogger,
            maxReconnectAttempts: options.maxReconnectAttempts ?? -1,
            maxAuthFailureAttempts: options.maxAuthFailureAttempts ?? 3,
        };
        return new AiBot.WSClient(clientOptions);
    }

    async testCredentials(
        botId: string,
        secret: string,
        timeoutMs = 10_000,
    ): Promise<{ success: true }> {
        const client = this.create({
            botId,
            secret,
            maxReconnectAttempts: 0,
            maxAuthFailureAttempts: 1,
        });
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (error?: Error): void => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                client.disconnect();
                if (error) reject(error);
                else resolve({ success: true });
            };
            const timer = setTimeout(
                () => finish(new Error("WeCom credential test timed out")),
                timeoutMs,
            );
            client.on("authenticated", () => finish());
            client.on("error", (error) => finish(error));
            try {
                client.connect();
            } catch (error) {
                finish(error as Error);
            }
        });
    }
}
