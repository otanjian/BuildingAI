jest.mock("@buildingai/cache", () => ({ RedisService: class RedisService {} }));

import { AutomationConfirmationService } from "./automation-confirmation.service";

describe("AutomationConfirmationService", () => {
    it("consumes a pending confirmation atomically", async () => {
        const values = new Map<string, string>();
        const redis = {
            get: jest.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
            set: jest.fn((key: string, value: string) => {
                values.set(key, value);
                return Promise.resolve();
            }),
            getDel: jest.fn(async (key: string) => {
                const value = values.get(key) ?? null;
                values.delete(key);
                return value;
            }),
            del: jest.fn(async (key: string) => void values.delete(key)),
        };
        const service = new AutomationConfirmationService(redis as never);
        const context = {
            actorId: "open-u1",
            channel: "feishu",
            accountId: "conn-1",
            tenantId: "tenant-1",
            conversationId: "chat-1",
            eventId: "event-1",
        };
        const command = {
            operation: "create" as const,
            idempotencyKey: "event-1",
            name: "采购",
            prompt: "查询采购",
            schedule: {
                kind: "cron" as const,
                expression: "25 7 * * *",
                timezone: "Asia/Shanghai",
            },
        };

        await service.save(context, command, "preview");
        await expect(service.consume(context)).resolves.toMatchObject({
            command,
            preview: "preview",
        });
        await expect(service.consume(context)).resolves.toBeUndefined();
        expect(redis.set).toHaveBeenCalledWith(
            expect.stringContaining("automation%3Apending:"),
            expect.any(String),
            600,
        );
        expect(redis.getDel).toHaveBeenCalledTimes(2);
    });

    it("binds state to actor and conversation", async () => {
        const redis = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
            getDel: jest.fn().mockResolvedValue(null),
            del: jest.fn(),
        };
        const service = new AutomationConfirmationService(redis as never);
        const context = {
            actorId: "u1",
            channel: "feishu",
            accountId: "a1",
            conversationId: "chat-1",
            eventId: "e1",
        };
        await expect(
            service.consume({ ...context, conversationId: "chat-2" }),
        ).resolves.toBeUndefined();
        expect(redis.getDel).toHaveBeenCalledWith(expect.stringContaining("chat-2"));
    });
});
