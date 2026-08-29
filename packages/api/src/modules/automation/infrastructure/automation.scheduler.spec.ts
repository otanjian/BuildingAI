import { automationQueueJobId } from "./automation-queue-id";

describe("automationQueueJobId", () => {
    it("keeps durable dispatch keys deterministic and BullMQ-compatible", () => {
        const dispatchKey = "execute:job-1:cron:2026-08-29T23:25:00.000Z";
        const first = automationQueueJobId(dispatchKey);

        expect(first).toBe(automationQueueJobId(dispatchKey));
        expect(first).not.toContain(":");
        expect(first).toMatch(/^automation_[A-Za-z0-9_-]+$/);
    });
});
