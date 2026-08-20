jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import { OpencodeTurnInvariantService } from "./opencode-turn-invariant.service";

describe("OpencodeTurnInvariantService", () => {
    it("audits terminal assistants and namespaced billing with read-only aggregate queries", async () => {
        const dataSource = {
            query: jest
                .fn()
                .mockResolvedValueOnce([{ count: "2" }])
                .mockResolvedValueOnce([{ count: "1" }])
                .mockResolvedValueOnce([{ count: "3" }]),
        };

        await expect(new OpencodeTurnInvariantService(dataSource as any).audit()).resolves.toEqual({
            terminalAssistantViolations: 2,
            billedCompletedWithoutAssistant: 1,
            duplicateDeductions: 3,
            healthy: false,
        });
        const sql = dataSource.query.mock.calls.map(([query]) => String(query)).join("\n");
        expect(sql).toContain("COUNT(message.id) <> 1");
        expect(sql).toContain("turn.status = 'completed'");
        expect(sql).toContain("account_log");
        expect(sql).toContain("opencode-turn:");
        expect(sql).toContain("HAVING COUNT(*) > 1");
    });

    it("reports healthy only when every invariant count is zero", async () => {
        const dataSource = { query: jest.fn(async () => [{ count: "0" }]) };
        await expect(new OpencodeTurnInvariantService(dataSource as any).audit()).resolves.toEqual({
            terminalAssistantViolations: 0,
            billedCompletedWithoutAssistant: 0,
            duplicateDeductions: 0,
            healthy: true,
        });
    });
});
